'use client';
import { useEffect, useState } from 'react';
import { RegressionResult, FactorCard } from '@/types/analytics';

type LeaderboardCard = {
  name: string;
  totalLikes: number;
  avgLikes: number;
  captionCount: number;
};

export default function AdminAnalytics() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [charLenReg, setCharLenReg] = useState<RegressionResult>({
    slope: 0,
    intercept: 0,
    r2: 0,
    n: 0,
  });
  const [wordCountReg, setWordCountReg] = useState<RegressionResult>({
    slope: 0,
    intercept: 0,
    r2: 0,
    n: 0,
  });

  const [sampleSize, setSampleSize] = useState(0);

  const [imageFactors, setImageFactors] = useState<FactorCard[]>([]);
  const [timeBucketFactors, setTimeBucketFactors] = useState<FactorCard[]>([]);
  const [flavorFactors, setFlavorFactors] = useState<FactorCard[]>([]);
  const [profileFactors, setProfileFactors] = useState<FactorCard[]>([]);

  const [topProfilesByLikes, setTopProfilesByLikes] = useState<LeaderboardCard[]>([]);
  const [topImagesByLikes, setTopImagesByLikes] = useState<LeaderboardCard[]>([]);
  const [topFlavorsByLikes, setTopFlavorsByLikes] = useState<LeaderboardCard[]>([]);

  const [selectedX, setSelectedX] = useState<'char_len' | 'word_count'>('char_len');

  const currentReg = selectedX === 'char_len' ? charLenReg : wordCountReg;

  const xLabels = {
    char_len: { icon: '📏', name: 'Caption Length (chars)', unit: 'character' },
    word_count: { icon: '📝', name: 'Word Count', unit: 'word' },
  };

  const label = xLabels[selectedX];

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

        setImageFactors(data.imageFactors || []);
        setTimeBucketFactors(data.timeBucketFactors || []);
        setFlavorFactors(data.flavorFactors || []);
        setProfileFactors(data.profileFactors || []);

        setTopProfilesByLikes(data.topProfilesByLikes || []);
        setTopImagesByLikes(data.topImagesByLikes || []);
        setTopFlavorsByLikes(data.topFlavorsByLikes || []);

        setLoading(false);
      } catch (err) {
        setError((err as Error).message || 'Failed to load analytics');
        setLoading(false);
      }
    }

    runAnalysis();
  }, []);

  const renderFactorList = (title: string, icon: string, colorClass: string, factors: FactorCard[]) => (
    <div className="bg-slate-800 p-6 rounded-3xl border border-slate-700">
      <h3 className={`text-sm font-bold uppercase tracking-wide mb-4 flex items-center gap-2 ${colorClass}`}>
        <span>{icon}</span> {title}
      </h3>
      <div className="space-y-3">
        {factors.length === 0 ? (
          <div className="text-slate-500 text-sm">No data available</div>
        ) : (
          factors.map((c) => (
            <div
              key={c.factor}
              className="flex justify-between items-center bg-slate-950 p-3 px-4 rounded-lg border border-slate-700"
            >
              <div className="min-w-0 pr-4">
                <div className="text-sm text-slate-200 break-words">{c.factor}</div>
                <div className="text-[11px] text-slate-500">{c.desc}</div>
              </div>
              <span
                className={`font-mono font-bold ${
                  c.impact > 0 ? 'text-emerald-400' : 'text-red-400'
                }`}
              >
                {c.impact > 0 ? '+' : ''}
                {c.impact.toFixed(6)}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );

  const renderLeaderboard = (
    title: string,
    icon: string,
    colorClass: string,
    items: LeaderboardCard[]
  ) => (
    <div className="bg-slate-800 p-6 rounded-3xl border border-slate-700">
      <h3 className={`text-sm font-bold uppercase tracking-wide mb-4 flex items-center gap-2 ${colorClass}`}>
        <span>{icon}</span> {title}
      </h3>
      <div className="space-y-3">
        {items.length === 0 ? (
          <div className="text-slate-500 text-sm">No data available</div>
        ) : (
          items.map((item, idx) => (
            <div
              key={`${item.name}-${idx}`}
              className="bg-slate-950 p-4 rounded-xl border border-slate-700"
            >
              <div className="flex justify-between items-start gap-4">
                <div className="min-w-0">
                  <div className="text-sm text-slate-200 break-words">
                    #{idx + 1} {item.name}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    avg likes {item.totalLikes.toFixed(6)} · captions {item.captionCount}
                  </div>
                </div>
                <div className="font-mono text-emerald-400 font-bold text-sm">
                  {item.avgLikes.toFixed(6)}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );

  return (
    <div className="p-8 bg-slate-900 text-white rounded-[3rem] shadow-2xl mt-10 max-w-7xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <div className="p-3 bg-blue-500 rounded-2xl text-3xl">📈</div>
        <div>
          <h2 className="text-2xl font-bold">Caption Analytics Dashboard</h2>
          <p className="text-slate-400 text-xs">
            Caption-level factors associated with likes
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            <div className="bg-slate-800 p-6 rounded-3xl border border-slate-700">
              <div className="flex flex-wrap gap-3 mb-6">
                {Object.entries(xLabels).map(([key, { icon, name }]) => (
                  <button
                    key={key}
                    onClick={() => setSelectedX(key as 'char_len' | 'word_count')}
                    className={`px-5 py-2 rounded-xl text-sm font-medium transition-all ${
                      selectedX === key
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'bg-slate-700 hover:bg-slate-600 text-slate-200'
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
                <span className="text-blue-300">{currentReg.slope.toFixed(6)}</span> ×{' '}
                <span className="text-blue-400">{label.unit}</span> +{' '}
                <span className="text-purple-300">{currentReg.intercept.toFixed(6)}</span>
              </div>

              <div className="text-xs text-slate-400 space-y-1.5">
                <p>R² = {currentReg.r2.toFixed(6)}</p>
                <p>Samples = {currentReg.n}</p>
                <p className="pt-2">
                  Each extra {label.unit} is associated with {currentReg.slope.toFixed(6)} more/fewer likes on average.
                </p>
              </div>
            </div>

            {renderFactorList('Time Bucket Impact', '🕒', 'text-purple-400', timeBucketFactors)}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            {renderFactorList('Image Impact', '🖼️', 'text-cyan-400', imageFactors)}
            {renderFactorList('Humor Flavor Impact', '🙂', 'text-pink-400', flavorFactors)}
            {renderFactorList('Profile Impact', '👤', 'text-amber-400', profileFactors)}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {renderLeaderboard('Top Profiles by Total Likes', '🏆', 'text-emerald-400', topProfilesByLikes)}
            {renderLeaderboard('Top Images by Total Likes', '🖼️', 'text-cyan-400', topImagesByLikes)}
            {renderLeaderboard('Top Flavors by Total Likes', '🙂', 'text-pink-400', topFlavorsByLikes)}
          </div>
        </>
      )}
    </div>
  );
}