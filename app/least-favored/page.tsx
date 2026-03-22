'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';

export default function LeastFavoredPage() {
  const [leastFavored, setLeastFavored] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [userVotes, setUserVotes] = useState<Record<string, number>>({});
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    async function getLeastFavored() {
      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      const authUserId = user?.id ?? null;
      setCurrentUserId(authUserId);

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

      // 读取当前用户对这25个 meme 的投票
      if (authUserId && worst25.length > 0) {
        const captionIds = worst25.map((item) => item.id);

        const { data: myVotes, error: myVotesError } = await supabase
          .from('caption_votes')
          .select('caption_id, vote_value')
          .eq('profile_id', authUserId)
          .in('caption_id', captionIds);

        if (myVotesError) {
          console.error('Fetch my votes error:', myVotesError);
        } else {
          const voteMap: Record<string, number> = {};
          (myVotes || []).forEach((row) => {
            voteMap[row.caption_id] = row.vote_value;
          });
          setUserVotes(voteMap);
        }
      }

      setLoading(false);
    }

    getLeastFavored();
  }, [supabase]);

  const handleVote = async (captionId: string, voteValue: 1 | -1) => {
    if (!currentUserId) {
      alert('Please log in first.');
      return;
    }

    try {
      setSubmittingId(captionId);

      const { error } = await supabase.from('caption_votes').upsert(
        {
          caption_id: captionId,
          profile_id: currentUserId,
          vote_value: voteValue,
        },
        {
          onConflict: 'caption_id,profile_id',
        }
      );

      if (error) throw error;

      setUserVotes((prev) => ({
        ...prev,
        [captionId]: voteValue,
      }));

      setLeastFavored((prev) =>
        prev.map((item) =>
          item.id === captionId
            ? {
                ...item,
                totalScore:
                  item.totalScore -
                  (userVotes[captionId] || 0) +
                  voteValue,
              }
            : item
        )
      );
    } catch (error) {
      console.error('Vote error:', error);
      alert('Failed to submit vote.');
    } finally {
      setSubmittingId(null);
    }
  };

  const handleResetVote = async (captionId: string) => {
    if (!currentUserId) {
      alert('Please log in first.');
      return;
    }

    try {
      setSubmittingId(captionId);

      const previousVote = userVotes[captionId] || 0;

      const { error } = await supabase
        .from('caption_votes')
        .delete()
        .eq('caption_id', captionId)
        .eq('profile_id', currentUserId);

      if (error) throw error;

      setUserVotes((prev) => {
        const next = { ...prev };
        delete next[captionId];
        return next;
      });

      setLeastFavored((prev) =>
        prev.map((item) =>
          item.id === captionId
            ? {
                ...item,
                totalScore: item.totalScore - previousVote,
              }
            : item
        )
      );
    } catch (error) {
      console.error('Reset vote error:', error);
      alert('Failed to reset vote.');
    } finally {
      setSubmittingId(null);
    }
  };

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
          {leastFavored.map((item) => {
            const currentVote = userVotes[item.id] || 0;
            const isSubmitting = submittingId === item.id;

            return (
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

                <div className="text-xs font-bold text-red-500 uppercase tracking-widest mb-3">
                  Score: {item.totalScore}
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => handleVote(item.id, 1)}
                    disabled={isSubmitting}
                    className={`px-3 py-2 rounded-xl text-xs font-bold border transition ${
                      currentVote === 1
                        ? 'bg-green-600 text-white border-green-600'
                        : 'bg-white text-green-700 border-green-200 hover:bg-green-50'
                    }`}
                  >
                    ⬆ Upvote
                  </button>

                  <button
                    onClick={() => handleVote(item.id, -1)}
                    disabled={isSubmitting}
                    className={`px-3 py-2 rounded-xl text-xs font-bold border transition ${
                      currentVote === -1
                        ? 'bg-red-600 text-white border-red-600'
                        : 'bg-white text-red-700 border-red-200 hover:bg-red-50'
                    }`}
                  >
                    ⬇ Downvote
                  </button>

                  <button
                    onClick={() => handleResetVote(item.id)}
                    disabled={isSubmitting || currentVote === 0}
                    className="px-3 py-2 rounded-xl text-xs font-bold border bg-white text-slate-600 border-slate-200 hover:bg-slate-100 disabled:opacity-40"
                  >
                    Reset
                  </button>
                </div>
              </div>
            );
          })}
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