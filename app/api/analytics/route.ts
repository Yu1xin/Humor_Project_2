// app/api/analytics/route.ts
import { createClient } from '@supabase/supabase-js';
import { RegressionResult, FactorCard, MergedRow } from '@/types/analytics';

function safeMean(arr: number[]) {
  if (!arr.length) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function computeSimpleLinearRegression(points: { x: number; y: number }[]): RegressionResult {
  const n = points.length;
  if (n < 2) return { slope: 0, intercept: 0, r2: 0, n };
  const xs = points.map(p => p.x);
  const ys = points.map(p => p.y);
  const meanX = safeMean(xs);
  const meanY = safeMean(ys);
  let numerator = 0, denominator = 0;
  for (const p of points) {
    numerator += (p.x - meanX) * (p.y - meanY);
    denominator += (p.x - meanX) ** 2;
  }
  const slope = denominator === 0 ? 0 : numerator / denominator;
  const intercept = meanY - slope * meanX;
  let ssTot = 0, ssRes = 0;
  for (const p of points) {
    const yHat = intercept + slope * p.x;
    ssTot += (p.y - meanY) ** 2;
    ssRes += (p.y - yHat) ** 2;
  }
  const r2 = ssTot === 0 ? 0 : 1 - ssRes / ssTot;
  return { slope, intercept, r2, n };
}

function groupAverageImpact(rows: MergedRow[], key: 'llm_model_name' | 'humor_flavor_name'): FactorCard[] {
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

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [
    captionsRes,
    responsesRes,
    modelsRes,
    flavorsRes
  ] = await Promise.all([
    supabase.from('captions').select('caption_request_id, like_count, content'),
    supabase.from('llm_model_responses').select('caption_request_id, processing_time_seconds, llm_model_id, humor_flavor_id'),
    supabase.from('llm_models').select('id, name'),
    supabase.from('humor_flavors').select('id, description')
  ]);

  if (captionsRes.error || responsesRes.error || modelsRes.error || flavorsRes.error) {
    return Response.json(
      { error: captionsRes.error?.message || 'Database query failed' },
      { status: 500 }
    );
  }

  const captions = captionsRes.data ?? [];
  const responses = responsesRes.data ?? [];
  const models = modelsRes.data ?? [];
  const flavors = flavorsRes.data ?? [];

  const responseByCaptionRequestId = new Map<string, any>();
  for (const r of responses) {
    if (r.caption_request_id) responseByCaptionRequestId.set(r.caption_request_id, r);
  }

  const modelNameById = new Map<number, string>();
  for (const m of models) {
    if (m.id && m.name) modelNameById.set(m.id, m.name);
  }

  const flavorNameById = new Map<number, string>();
  for (const f of flavors) {
    if (f.id && f.description) flavorNameById.set(f.id, f.description);
  }

  const mergedRows: MergedRow[] = captions
    .map((c: any) => {
      const reqId = c.caption_request_id;
      const response = reqId ? responseByCaptionRequestId.get(reqId) : undefined;
      return {
        like_count: Number(c.like_count ?? 0),
        caption_char_len: (c.content ?? '').length,
        caption_word_count: (c.content ?? '').trim().split(/\s+/).filter(Boolean).length,
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

  const charPoints = mergedRows.map(r => ({ x: r.caption_char_len, y: r.like_count }));
  const wordPoints = mergedRows.map(r => ({ x: r.caption_word_count, y: r.like_count }));

  const numericSubset = mergedRows.filter(
    r => r.processing_time_seconds != null && Number.isFinite(r.processing_time_seconds)
  );
  const procPoints = numericSubset.map(r => ({ x: r.processing_time_seconds!, y: r.like_count }));

  const charLenRegression = computeSimpleLinearRegression(charPoints);
  const wordCountRegression = computeSimpleLinearRegression(wordPoints);
  const procTimeRegression = computeSimpleLinearRegression(procPoints);

  const modelFactors = groupAverageImpact(mergedRows, 'llm_model_name').slice(0, 8);
  const flavorFactors = groupAverageImpact(mergedRows, 'humor_flavor_name').slice(0, 8);

  return Response.json({
    sampleSize: mergedRows.length,
    charLenRegression,
    wordCountRegression,
    procTimeRegression,
    modelFactors,
    flavorFactors,
  });
}