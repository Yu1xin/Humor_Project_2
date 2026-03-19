'use client';
import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { RegressionResult, FactorCard } from '@/types/analytics';

export default function AdminAnalytics() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 单变量回归结果（用于按钮切换显示）
  const [charLenReg, setCharLenReg] = useState<RegressionResult>({ slope: 0, intercept: 0, r2: 0, n: 0 });
  const [wordCountReg, setWordCountReg] = useState<RegressionResult>({ slope: 0, intercept: 0, r2: 0, n: 0 });
  const [procTimeReg, setProcTimeReg] = useState<RegressionResult>({ slope: 0, intercept: 0, r2: 0, n: 0 });

  // 多变量回归结果
  const [multiResult, setMultiResult] = useState<{ coefficients: number[]; r2: number; n: number } | null>(null);
  const [multiLoading, setMultiLoading] = useState(false);
  const [multiError, setMultiError] = useState<string | null>(null);

  // 其他统计
  const [sampleSize, setSampleSize] = useState(0);
  const [modelFactors, setModelFactors] = useState<FactorCard[]>([]);
  const [flavorFactors, setFlavorFactors] = useState<FactorCard[]>([]);
  const [procTimeN, setProcTimeN] = useState(0);

  // 单变量切换
  const [selectedX, setSelectedX] = useState<'char_len' | 'word_count' | 'proc_time'>('char_len');

  // 多变量选择
  const [selectedVars, setSelectedVars] = useState<string[]>(['char_len']);

  const variables = [
    { id: 'char_len', label: 'Caption Length (chars)', icon: '📏' },
    { id: 'word_count', label: 'Word Count', icon: '📝' },
    { id: 'proc_time', label: 'Processing Time (s)', icon: '⏱️' },
  ];

  // 单变量切换显示的当前结果
  const currentReg = selectedX === 'char_len' ? charLenReg :
                     selectedX === 'word_count' ? wordCountReg :
                     procTimeReg;

  const xLabels = {
    char_len: { icon: '📏', name: 'Caption Length (chars)', unit: 'character' },
    word_count: { icon: '📝', name: 'Word Count', unit: 'word' },
    proc_time: { icon: '⏱️', name: 'Processing Time (seconds)', unit: 'second' },
  };

  const label = xLabels[selectedX];

  // 多变量复选框切换
  const handleVarChange = (id: string) => {
    setSelectedVars(prev =>
      prev.includes(id) ? prev.filter(v => v !== id) : [...prev, id]
    );
  };

  // 计算多变量回归
  const runMultiRegression = async () => {
    setMultiError(null);
    if (selectedVars.length === 0) {
      setMultiError("please select 1 or two variable(s)");
      return;
    }
    if (selectedVars.length > 2) {
      setMultiError("🤷we only support at most 2 variables at a time");
      return;
    }

    setMultiLoading(true);
    try {
      const res = await fetch('/api/analytics/multi-regression', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ variables: selectedVars }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setMultiResult(data);
    } catch (err: any) {
      setMultiError(err.message || "calculation failed, try again later");
    } finally {
      setMultiLoading(false);
    }
  };

  useEffect(() => {
    async function runAnalysis() {
      try {
        const res = await fetch('/api/analytics');
        if (!res.ok) throw new Error(`API error: ${res.status}`);

        const data = await res.json();
        if (data.error) {
          setError(data.error);
          setLoading(false);
          return;
        }

        setSampleSize(data.sampleSize);
        setCharLenReg(data.charLenRegression);
        setWordCountReg(data.wordCountRegression);
        setProcTimeReg(data.procTimeRegression);
        setModelFactors(data.modelFactors || []);
        setFlavorFactors(data.flavorFactors || []);
        setProcTimeN(data.procTimeRegression?.n || 0);

        setLoading(false);
      } catch (err) {
        setError((err as Error).message || 'Failed to load analytics');
        setLoading(false);
      }
    }
    runAnalysis();
  }, []);

  return (
    <div className="p-8 bg-slate-900 text-white rounded-[3rem] shadow-2xl mt-10 max-w-7xl mx-auto">
      {/* 标题 */}
      <div className="flex items-center gap-4 mb-8">
        <div className="p-3 bg-blue-500 rounded-2xl text-3xl">📈</div>
        <div>
          <h2 className="text-2xl font-bold">Predictive Analytics Engine</h2>
          <p className="text-slate-400 text-xs">
            What drives likes on generated meme captions?
          </p>
        </div>
      </div>

      {loading && <div className="text-center text-slate-400 py-10">Loading analysis...</div>}
      {error && <div className="text-center text-red-400 py-10">Error: {error}</div>}

      {!loading && !error && (
        <>
          <div className="mb-6 text-sm text-slate-400">
            Total analyzed captions: <strong>{sampleSize}</strong>
          </div>

          {/* 多变量选择区 */}
          <div className="mb-10 bg-slate-800 p-6 rounded-3xl border border-slate-700">
            <h3 className="text-lg font-bold text-indigo-400 mb-4">
              Multi-variable regression
            </h3>

            <div className="flex flex-wrap gap-6 mb-6">
              {variables.map(v => (
                <label key={v.id} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedVars.includes(v.id)}
                    onChange={() => handleVarChange(v.id)}
                    className="w-5 h-5 accent-indigo-500 rounded"
                  />
                  <span className="text-slate-200 text-base">{v.icon} {v.label}</span>
                </label>
              ))}
            </div>

            <button
              onClick={runMultiRegression}
              disabled={multiLoading || selectedVars.length === 0}
              className={`px-8 py-3 rounded-xl font-medium transition-all ${
                multiLoading || selectedVars.length === 0
                  ? 'bg-slate-600 cursor-not-allowed text-slate-400'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md'
              }`}
            >
              {multiLoading ? 'Calculating...' : 'calculate multi variable regression'}
            </button>

            {multiError && <p className="mt-4 text-red-400 text-sm">{multiError}</p>}
          </div>

          {/* 多元结果展示 */}
          {multiResult && (
            <div className="mb-10 bg-slate-800 p-6 rounded-3xl border border-slate-700">
              <h3 className="text-lg font-bold text-indigo-400 mb-4">
                Multi-variable regression result：Likes ~ {selectedVars.map(id => variables.find(v => v.id === id)?.label || id).join(' + ')}
              </h3>

              <div className="bg-slate-950 p-5 rounded-xl font-mono text-base mb-4 border border-slate-700 overflow-x-auto">
                Likes ≈ {multiResult.coefficients.slice(1).map((coef: number, idx: number) =>
                  `${coef.toFixed(4)} × ${selectedVars[idx]}`
                ).join(' + ')} + {multiResult.coefficients[0].toFixed(2)}
              </div>

              <div className="text-sm text-slate-300 space-y-2">
                <p><strong>R²：</strong> {multiResult.r2.toFixed(4)}</p>
                <p><strong>number of effective subjects(captions)：</strong> {multiResult.n}</p>
                <p className="text-xs text-slate-500 mt-3">
                  （interpretation of the parameter：having all other factors the same，having one unit increase in target variable，caption likes will change by how much）
                </p>
              </div>

              {multiResult.n < 30 && (
                <p className="mt-4 text-yellow-400 text-sm">
                  ⚠️ The sample size is smaller than 30 ({multiResult.n})，result may not be reliable
                </p>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* 单变量线性回归卡片 */}
            <div className="bg-slate-800 p-6 rounded-3xl border border-slate-700">
              <div className="flex flex-wrap gap-3 mb-6">
                {Object.entries(xLabels).map(([key, { icon, name }]) => (
                  <button
                    key={key}
                    onClick={() => setSelectedX(key as any)}
                    className={`px-5 py-2 rounded-xl text-sm font-medium transition-all ${
                      selectedX === key ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-700 hover:bg-slate-600 text-slate-200'
                    }`}
                  >
                    {icon} {name}
                  </button>
                ))}
              </div>

              <h3 className="text-sm font-bold text-blue-400 uppercase tracking-wide mb-4">
                Simple regression analysis: Likes ~ {label.name}
              </h3>

              <div className="bg-slate-950 p-5 rounded-xl font-mono text-sm mb-4 border border-slate-700">
                <span className="text-emerald-400 font-bold">Likes</span> ≈{' '}
                <span className="text-blue-300">{currentReg.slope.toFixed(4)}</span> ×{' '}
                <span className="text-blue-400">{label.unit}</span> +{' '}
                <span className="text-purple-300">{currentReg.intercept.toFixed(2)}</span>
              </div>

              <div className="text-xs text-slate-400 space-y-1.5">
                <p>R² = {currentReg.r2.toFixed(4)}</p>
                <p>Samples = {currentReg.n}</p>
                <p className="pt-2">
                  Each extra {label.unit} is associated with {currentReg.slope.toFixed(4)}{' '}
                  more/fewer likes on average.
                </p>
              </div>
            </div>

            {/* Numeric Factor Correlation */}
            <div className="bg-slate-800 p-6 rounded-3xl border border-slate-700">
              <h3 className="text-sm font-bold text-purple-400 uppercase tracking-wide mb-4">
                Numeric Factor Correlation
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center bg-slate-950 p-4 rounded-xl border border-slate-700">
                  <div>
                    <div className="text-base font-medium text-slate-200">Processing Time (seconds)</div>
                    <div className="text-xs text-slate-500 mt-1">
                      Pearson correlation (n={procTimeN})
                    </div>
                  </div>
                  <span className="font-mono text-xl font-bold text-slate-300">
                    {/* 如果你想显示真实 Pearson，可在 route.ts 计算后返回 */}
                    N/A (Not calculated yet)
                  </span>
                </div>

                {procTimeN > 0 && procTimeN < 50 && (
                  <div className="text-xs text-yellow-400 bg-yellow-950/40 p-3 rounded-lg border border-yellow-700/50">
                    ⚠️ Only {procTimeN} records have processing time data. Many requests may still be pending or failed.
                  </div>
                )}
              </div>
            </div>

            {/* LLM Model Impact */}
            <div className="bg-slate-800 p-6 rounded-3xl border border-slate-700">
              <h3 className="text-sm font-bold text-emerald-400 uppercase tracking-wide mb-4 flex items-center gap-2">
                <span>🧠</span> LLM Model Impact
              </h3>
              <div className="space-y-3">
                {modelFactors.length === 0 ? (
                  <div className="text-slate-500 text-sm">No model data available</div>
                ) : (
                  modelFactors.map((c) => (
                    <div
                      key={c.factor}
                      className="flex justify-between items-center bg-slate-950 p-3 px-4 rounded-lg border border-slate-700"
                    >
                      <div>
                        <div className="text-sm text-slate-200">{c.factor}</div>
                        <div className="text-[11px] text-slate-500">{c.desc}</div>
                      </div>
                      <span
                        className={`font-mono font-bold ${
                          c.impact > 0 ? 'text-emerald-400' : 'text-red-400'
                        }`}
                      >
                        {c.impact > 0 ? '+' : ''}{c.impact.toFixed(2)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Humor Flavor Impact */}
            <div className="bg-slate-800 p-6 rounded-3xl border border-slate-700">
              <h3 className="text-sm font-bold text-pink-400 uppercase tracking-wide mb-4 flex items-center gap-2">
                <span>🙂</span> Humor Flavor Impact
              </h3>
              <div className="space-y-3">
                {flavorFactors.length === 0 ? (
                  <div className="text-slate-500 text-sm">No flavor data available</div>
                ) : (
                  flavorFactors.map((c) => (
                    <div
                      key={c.factor}
                      className="flex justify-between items-center bg-slate-950 p-3 px-4 rounded-lg border border-slate-700"
                    >
                      <div>
                        <div className="text-sm text-slate-200">{c.factor}</div>
                        <div className="text-[11px] text-slate-500">{c.desc}</div>
                      </div>
                      <span
                        className={`font-mono font-bold ${
                          c.impact > 0 ? 'text-emerald-400' : 'text-red-400'
                        }`}
                      >
                        {c.impact > 0 ? '+' : ''}{c.impact.toFixed(2)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}