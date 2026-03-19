// app/admin/page.tsx  （完整新版）
'use client';
import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { RegressionResult, FactorCard } from '@/types/analytics';

export default function AdminAnalytics() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sampleSize, setSampleSize] = useState(0);
  const [modelFactors, setModelFactors] = useState<FactorCard[]>([]);
  const [flavorFactors, setFlavorFactors] = useState<FactorCard[]>([]);

  // 新增：3 个回归结果 + 当前选中的自变量
  const [charLenReg, setCharLenReg] = useState<RegressionResult>({ slope: 0, intercept: 0, r2: 0, n: 0 });
  const [wordCountReg, setWordCountReg] = useState<RegressionResult>({ slope: 0, intercept: 0, r2: 0, n: 0 });
  const [procTimeReg, setProcTimeReg] = useState<RegressionResult>({ slope: 0, intercept: 0, r2: 0, n: 0 });
  const [selectedX, setSelectedX] = useState<'char_len' | 'word_count' | 'proc_time'>('char_len');

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    async function runAnalysis() {
      const res = await fetch('/api/analytics');
      const data = await res.json();

      setSampleSize(data.sampleSize);
      setCharLenReg(data.charLenRegression);
      setWordCountReg(data.wordCountRegression);
      setProcTimeReg(data.procTimeRegression);
      setModelFactors(data.modelFactors);
      setFlavorFactors(data.flavorFactors);
      setLoading(false);
    }
    runAnalysis();
  }, []);

  // 当前显示的回归（按钮切换）
  const currentReg = selectedX === 'char_len' ? charLenReg :
                     selectedX === 'word_count' ? wordCountReg : procTimeReg;

  const xLabels = {
    char_len: { icon: '📏', name: 'Caption Char Len', unit: 'character' },
    word_count: { icon: '📝', name: 'Word Count', unit: 'word' },
    proc_time: { icon: '⏱️', name: 'Processing Time (s)', unit: 'second' },
  };

  const label = xLabels[selectedX];

  return (
    <div className="p-8 bg-slate-900 text-white ...">
      {/* 标题加图标 */}
      <div className="flex items-center gap-4 mb-8">
        <div className="p-3 bg-blue-500 rounded-2xl text-3xl">📈</div>
        <div>
          <h2 className="text-2xl font-bold">Predictive Analytics Engine</h2>
        </div>
      </div>

      {/* 回归卡片 + 切换按钮（核心新增） */}
      <div className="bg-slate-800 p-6 rounded-3xl border border-slate-700 mb-10">
        <div className="flex gap-3 mb-6">
          {Object.entries(xLabels).map(([key, { icon, name }]) => (
            <button
              key={key}
              onClick={() => setSelectedX(key as any)}
              className={`px-6 py-2 rounded-2xl text-sm font-medium transition-all ${selectedX === key ? 'bg-blue-500 text-white shadow-lg' : 'bg-slate-700 hover:bg-slate-600'}`}
            >
              {icon} {name}
            </button>
          ))}
        </div>

        <h3 className="text-sm font-bold text-blue-400 mb-4">LINEAR REGRESSION: Likes ~ {label.name}</h3>

        <div className="bg-slate-950 p-4 rounded-xl font-mono text-sm mb-4">
          Y (Likes) = ({currentReg.slope.toFixed(4)}) * X ({label.unit}) + ({currentReg.intercept.toFixed(4)})
        </div>

        <div className="text-xs text-slate-400 space-y-1">
          <p>R²: {currentReg.r2.toFixed(4)}</p>
          <p>n: {currentReg.n}</p>
          <p>
            Interpretation: each additional {label.unit} changes expected likes by {currentReg.slope.toFixed(4)} on average.
          </p>
        </div>
      </div>

      {/* 原来 LLM 和 Flavor 卡片保持不变（已加图标） */}
      {/* LLM Model Impact 卡片标题改成 🧠 LLM Model Impact */}
      {/* Humor Flavor Impact 卡片标题改成 😂 Humor Flavor Impact */}

      {/* 其他卡片代码和原来一样，只是标题加了 emoji */}
    </div>
  );
}