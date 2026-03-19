'use client';

import { useEffect, useMemo, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';

type RegressionResult = {
  slope: number;
  intercept: number;
  r2: number;
  n: number;
};

type FactorCard = {
  factor: string;
  impact: number;
  desc: string;
};

type CaptionRow = {
  caption_request_id: string | null;
  like_count: number | null;
  content: string | null;
};

type ResponseRow = {
  caption_request_id: string | null;
  processing_time_seconds: number | null;
  llm_model_id: number | null;
  humor_flavor_id: number | null;
};

type ModelRow = {
  id: number;
  name: string | null;
};

type FlavorRow = {
  id: number;
  description: string | null;
};

type MergedRow = {
  like_count: number;
  caption_char_len: number;
  processing_time_seconds: number | null;
  llm_model_name: string | null;
  humor_flavor_name: string | null;
};

function safeMean(arr: number[]) {
  if (!arr.length) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function computeSimpleLinearRegression(
  points: { x: number; y: number }[]
): RegressionResult {
  const n = points.length;
  if (n < 2) return { slope: 0, intercept: 0, r2: 0, n };

  const xs = points.map(p => p.x);
  const ys = points.map(p => p.y);

  const meanX = safeMean(xs);
  const meanY = safeMean(ys);

  let numerator = 0;
  let denominator = 0;

  for (const p of points) {
    numerator += (p.x - meanX) * (p.y - meanY);
    denominator += (p.x - meanX) ** 2;
  }

  const slope = denominator === 0 ? 0 : numerator / denominator;
  const intercept = meanY - slope * meanX;

  let ssTot = 0;
  let ssRes = 0;

  for (const p of points) {
    const yHat = intercept + slope * p.x;
    ssTot += (p.y - meanY) ** 2;
    ssRes += (p.y - yHat) ** 2;
  }

  const r2 = ssTot === 0 ? 0 : 1 - ssRes / ssTot;

  return { slope, intercept, r2, n };
}

function computePearsonCorrelation(x: number[], y: number[]) {
  if (x.length !== y.length || x.length < 2) return 0;

  const meanX = safeMean(x);
  const meanY = safeMean(y);

  let numerator = 0;
  let denomX = 0;
  let denomY = 0;

  for (let i = 0; i < x.length; i++) {
    const dx = x[i] - meanX;
    const dy = y[i] - meanY;
    numerator += dx * dy;
    denomX += dx * dx;
    denomY += dy * dy;
  }

  const denom = Math.sqrt(denomX * denomY);
  return denom === 0 ? 0 : numerator / denom;
}

function groupAverageImpact(
  rows: MergedRow[],
  key: 'llm_model_name' | 'humor_flavor_name'
): FactorCard[] {
  const overallMean = safeMean(rows.map(r => r.like_count));
  const groups = new Map<string, number[]>();

  for (const row of rows) {
    const groupName = row[key] ?? 'Unknown';
    if (!groups.has(groupName)) groups.set(groupName, []);
    groups.get(groupName)!.push(row.like_count);
  }

  const results: FactorCard[] = [];

  for (const [groupName, likes] of groups.entries()) {
    if (likes.length < 2) continue;

    const avg = safeMean(likes);
    const uplift = avg - overallMean;

    results.push({
      factor: groupName,
      impact: uplift,
      desc: `Avg likes ${avg.toFixed(2)} vs overall ${overallMean.toFixed(2)} (n=${likes.length})`,
    });
  }

  return results.sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact));
}

export default function AdminAnalytics() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [regression, setRegression] = useState<RegressionResult>({
    slope: 0,
    intercept: 0,
    r2: 0,
    n: 0,
  });

  const [numericFactors, setNumericFactors] = useState<FactorCard[]>([]);
  const [modelFactors, setModelFactors] = useState<FactorCard[]>([]);
  const [flavorFactors, setFlavorFactors] = useState<FactorCard[]>([]);
  const [sampleSize, setSampleSize] = useState(0);

  const supabase = useMemo(
    () =>
      createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      ),
    []
  );

  useEffect(() => {
    async function runAnalysis() {
      setLoading(true);
      setError(null);

      const [
        captionsRes,
        responsesRes,
        modelsRes,
        flavorsRes
      ] = await Promise.all([
        supabase
          .from('captions')
          .select('caption_request_id, like_count, content'),
        supabase
          .from('llm_model_responses')
          .select('caption_request_id, processing_time_seconds, llm_model_id, humor_flavor_id'),
        supabase
          .from('llm_models')
          .select('id, name'),
        supabase
          .from('humor_flavors')
          .select('id, description')
      ]);

      if (captionsRes.error || responsesRes.error || modelsRes.error || flavorsRes.error) {
        setError(
          captionsRes.error?.message ||
            responsesRes.error?.message ||
            modelsRes.error?.message ||
            flavorsRes.error?.message ||
            'Unknown error'
        );
        setLoading(false);
        return;
      }

      const captions = (captionsRes.data ?? []) as CaptionRow[];
      const responses = (responsesRes.data ?? []) as ResponseRow[];
      const models = (modelsRes.data ?? []) as ModelRow[];
      const flavors = (flavorsRes.data ?? []) as FlavorRow[];

      const responseByCaptionRequestId = new Map<string, ResponseRow>();
      for (const r of responses) {
        if (r.caption_request_id) responseByCaptionRequestId.set(r.caption_request_id, r);
      }

      const modelNameById = new Map<number, string>();
      for (const m of models) {
        if (m.name) modelNameById.set(m.id, m.name);
      }

      const flavorNameById = new Map<number, string>();
      for (const f of flavors) {
        if (f.description) flavorNameById.set(f.id, f.description);
      }

      const mergedRows: MergedRow[] = captions
        .map((c) => {
          const reqId = c.caption_request_id;
          const response = reqId ? responseByCaptionRequestId.get(reqId) : undefined;

          return {
            like_count: Number(c.like_count ?? 0),
            caption_char_len: (c.content ?? '').length,
            processing_time_seconds:
              response?.processing_time_seconds != null
                ? Number(response.processing_time_seconds)
                : null,
            llm_model_name:
              response?.llm_model_id != null
                ? modelNameById.get(response.llm_model_id) ?? 'Unknown'
                : null,
            humor_flavor_name:
              response?.humor_flavor_id != null
                ? flavorNameById.get(response.humor_flavor_id) ?? 'Unknown'
                : null,
          };
        })
        .filter((row) => Number.isFinite(row.like_count) && Number.isFinite(row.caption_char_len));

      setSampleSize(mergedRows.length);

      // 1) Regression: likes ~ caption_char_len
      const regressionPoints = mergedRows.map((r) => ({
        x: r.caption_char_len,
        y: r.like_count,
      }));
      setRegression(computeSimpleLinearRegression(regressionPoints));

      // 2) Numeric factor: processing time correlation with likes
      const numericSubset = mergedRows.filter(
        (r) => r.processing_time_seconds != null && Number.isFinite(r.processing_time_seconds)
      );

      const procTimes = numericSubset.map((r) => Number(r.processing_time_seconds));
      const procLikes = numericSubset.map((r) => r.like_count);

      const processingCorr = computePearsonCorrelation(procTimes, procLikes);

      setNumericFactors([
        {
          factor: 'Processing Time (seconds)',
          impact: processingCorr,
          desc: `Pearson correlation with likes (n=${numericSubset.length})`,
        },
      ]);

      // 3) Categorical factors
      setModelFactors(groupAverageImpact(mergedRows, 'llm_model_name').slice(0, 8));
      setFlavorFactors(groupAverageImpact(mergedRows, 'humor_flavor_name').slice(0, 8));

      setLoading(false);
    }

    runAnalysis();
  }, [supabase]);

  return (
    <div className="p-8 bg-slate-900 text-white rounded-[3rem] shadow-2xl mt-10">
      <div className="flex items-center gap-4 mb-8">
        <div className="p-3 bg-blue-500 rounded-2xl text-2xl">📈</div>
        <div>
          <h2 className="text-2xl font-bold">Predictive Analytics Engine</h2>
          <p className="text-slate-400 text-xs">
            Engagement analysis based on real caption, model, and flavor data
          </p>
        </div>
      </div>

      {loading && (
        <div className="text-sm text-slate-400">Running analysis...</div>
      )}

      {error && (
        <div className="text-sm text-red-400">Error: {error}</div>
      )}

      {!loading && !error && (
        <>
          <div className="mb-6 text-xs text-slate-400">
            Sample size: {sampleSize}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <div className="bg-slate-800 p-6 rounded-3xl border border-slate-700">
              <h3 className="text-sm font-bold text-blue-400 uppercase tracking-tighter mb-4">
                Linear Regression Model
              </h3>
              <div className="bg-slate-950 p-4 rounded-xl font-mono text-sm mb-4">
                <span className="text-emerald-400 font-bold">Y (Likes)</span> =
                ({regression.slope.toFixed(4)}) *{' '}
                <span className="text-blue-400 font-bold">X (Char_Len)</span> +
                ({regression.intercept.toFixed(4)})
              </div>
              <div className="text-xs text-slate-400 space-y-1">
                <p>R²: {regression.r2.toFixed(4)}</p>
                <p>n: {regression.n}</p>
                <p>
                  Interpretation: each additional character changes expected likes by{' '}
                  {regression.slope.toFixed(4)} on average.
                </p>
              </div>
            </div>

            <div className="bg-slate-800 p-6 rounded-3xl border border-slate-700">
              <h3 className="text-sm font-bold text-purple-400 uppercase tracking-tighter mb-4">
                Numeric Factor Correlation
              </h3>
              <div className="space-y-3">
                {numericFactors.map((c) => (
                  <div
                    key={c.factor}
                    className="flex justify-between items-center bg-slate-950 p-3 px-4 rounded-lg"
                  >
                    <div>
                      <div className="text-xs text-slate-300">{c.factor}</div>
                      <div className="text-[10px] text-slate-500">{c.desc}</div>
                    </div>
                    <span
                      className={`font-mono font-bold ${
                        c.impact > 0 ? 'text-emerald-400' : 'text-red-400'
                      }`}
                    >
                      {c.impact.toFixed(4)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-slate-800 p-6 rounded-3xl border border-slate-700">
              <h3 className="text-sm font-bold text-emerald-400 uppercase tracking-tighter mb-4">
                LLM Model Impact
              </h3>
              <div className="space-y-3">
                {modelFactors.map((c) => (
                  <div
                    key={c.factor}
                    className="flex justify-between items-center bg-slate-950 p-3 px-4 rounded-lg"
                  >
                    <div>
                      <div className="text-xs text-slate-300">{c.factor}</div>
                      <div className="text-[10px] text-slate-500">{c.desc}</div>
                    </div>
                    <span
                      className={`font-mono font-bold ${
                        c.impact > 0 ? 'text-emerald-400' : 'text-red-400'
                      }`}
                    >
                      {c.impact > 0 ? '+' : ''}
                      {c.impact.toFixed(4)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-slate-800 p-6 rounded-3xl border border-slate-700">
              <h3 className="text-sm font-bold text-pink-400 uppercase tracking-tighter mb-4">
                Humor Flavor Impact
              </h3>
              <div className="space-y-3">
                {flavorFactors.map((c) => (
                  <div
                    key={c.factor}
                    className="flex justify-between items-center bg-slate-950 p-3 px-4 rounded-lg"
                  >
                    <div>
                      <div className="text-xs text-slate-300">{c.factor}</div>
                      <div className="text-[10px] text-slate-500">{c.desc}</div>
                    </div>
                    <span
                      className={`font-mono font-bold ${
                        c.impact > 0 ? 'text-emerald-400' : 'text-red-400'
                      }`}
                    >
                      {c.impact > 0 ? '+' : ''}
                      {c.impact.toFixed(4)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}