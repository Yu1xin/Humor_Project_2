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
      setLoading(true);

      const { data: votes, error: vError } = await supabase
        .from('caption_votes')
        .select('caption_id, vote_value');

      const { data: captions, error: cError } = await supabase
        .from('captions')
        .select('id, content, images(url)');

      if (vError || cError || !captions) {
        console.error('Fetch Error:', vError || cError);
        setLoading(false);
        return;
      }

      const scoreMap = new Map<string, number>();
      captions.forEach((c) => scoreMap.set(c.id, 0));

      if (votes) {
        votes.forEach((v) => {
          if (scoreMap.has(v.caption_id)) {
            const current = scoreMap.get(v.caption_id) || 0;
            scoreMap.set(v.caption_id, current + v.vote_value);
          }
        });
      }

      const allCaptionsWithScores = captions.map((c) => ({
        ...c,
        totalScore: scoreMap.get(c.id) || 0,
      }));

      const sorted = [...allCaptionsWithScores].sort(
        (a, b) => a.totalScore - b.totalScore
      );

      const worst25 = sorted.slice(0, 25);

      setLeastFavored(worst25);
      setLoading(false);
    }

    getLeastFavored();
  }, []);

  if (loading) {
    return (
      <div className="p-20 text-center animate-pulse">
        Analyzing the 25 least favored memes... 📉
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 bg-white min-h-screen">
      <header className="mb-10">
        <h1 className="text-3xl font-black text-red-600 mb-2">
          Bottom 25 Memes
        </h1>
        <p className="text-slate-500">
          The 25 captions with the lowest total voting scores.
        </p>
      </header>

      {leastFavored.length === 0 ? (
        <p className="text-slate-500">No caption data found.</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
          {leastFavored.map((item) => (
            <div
              key={item.id}
              className="bg-slate-50 rounded-2xl border border-slate-200 p-3 opacity-85 grayscale hover:grayscale-0 hover:opacity-100 transition-all duration-300"
            >
              {item.images?.url && (
                <img
                  src={item.images.url}
                  alt="Meme"
                  className="w-full aspect-square object-cover rounded-xl mb-3 border border-slate-100"
                />
              )}

              <p className="text-sm text-slate-700 italic line-clamp-4 mb-2">
                "{item.content || 'No caption content'}"
              </p>

              <div className="text-xs font-bold text-red-500 uppercase tracking-widest">
                Score: {item.totalScore}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-16 text-center">
        <Link href="/main" className="text-blue-600 hover:underline">
          ← Back to Dashboard
        </Link>
      </div>
    </div>
  );
}