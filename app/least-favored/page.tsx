'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';

export default function LeastFavoredPage() {
  const [leastFavored, setLeastFavored] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    async function getLeastFavored() {
      // 1. 获取所有投票数据进行统计
      const { data: votes } = await supabase.from('caption_votes').select('caption_id, vote_value');
      const { data: captions } = await supabase.from('captions').select('*, images(url)');

      if (!votes || !captions) return;

      // 2. 计算每个 caption 的总得分
      const scores: Record<string, number> = {};
      captions.forEach(c => scores[c.id] = 0);
      votes.forEach(v => { scores[v.caption_id] = (scores[v.caption_id] || 0) + v.vote_value; });

      // 3. 排序并找到 20% 的阈值
      const sortedScores = Object.values(scores).sort((a, b) => a - b);
      const thresholdIndex = Math.floor(sortedScores.length * 0.2);
      const thresholdScore = sortedScores[thresholdIndex];

      // 4. 过滤得分小于等于阈值的 Caption
      const filtered = captions
        .filter(c => scores[c.id] <= thresholdScore)
        .map(c => ({ ...c, totalScore: scores[c.id] }));

      setLeastFavored(filtered);
      setLoading(false);
    }
    getLeastFavored();
  }, []);

  if (loading) return <div className="p-20 text-center animate-pulse">Analyzing the "Least Favored"... 📉</div>;

  return (
    <div className="max-w-2xl mx-auto p-8 bg-white min-h-screen">
      <header className="mb-12">
        <h1 className="text-3xl font-black text-red-600 mb-2">Bottom 20% Gallery</h1>
        <p className="text-slate-500">The memes that didn't quite land with the crowd.</p>
      </header>

      <div className="grid gap-12">
        {leastFavored.map(item => (
          <div key={item.id} className="opacity-80 grayscale hover:grayscale-0 transition-all duration-500">
            {item.images?.url && (
              <img src={item.images.url} className="w-full rounded-2xl mb-4 border border-slate-100" alt="Meme" />
            )}
            <p className="text-lg text-slate-700 italic mb-2">"{item.content}"</p>
            <div className="text-xs font-bold text-red-500 uppercase tracking-widest">
              Current Score: {item.totalScore}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-20 text-center">
        <Link href="/main" className="text-blue-600 hover:underline">← Back to Dashboard</Link>
      </div>
    </div>
  );
}