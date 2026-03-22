'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';

type CaptionRow = {
  id: string;
  content: string | null;
  images?: {
    url?: string | null;
  } | null;
};

type VoteRow = {
  caption_id: string;
  vote_value: number;
};

export default function LeastFavoredPage() {
  const [leastFavored, setLeastFavored] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentProfileId, setCurrentProfileId] = useState<string | null>(null);
  const [userVotes, setUserVotes] = useState<Record<string, number>>({});
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  async function fetchAllRows(table: string, columns: string) {
    const pageSize = 1000;
    let from = 0;
    let allRows: any[] = [];

    while (true) {
      const { data, error } = await supabase
        .from(table)
        .select(columns)
        .order('id', { ascending: true })
        .range(from, from + pageSize - 1);

      if (error) throw error;
      if (!data || data.length === 0) break;

      allRows = [...allRows, ...data];

      if (data.length < pageSize) break;
      from += pageSize;
    }

    return allRows;
  }

  async function getCurrentProfileId() {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) throw authError;
    if (!user) return null;

    // 先假设 profiles.id = auth user id
    // 如果你的项目不是这种结构，这里再改
    return user.id;
  }

  async function loadPageData() {
    try {
      setLoading(true);
      setPageError(null);

      const profileId = await getCurrentProfileId();
      setCurrentProfileId(profileId);

      const [votes, captions] = await Promise.all([
        fetchAllRows('caption_votes', 'caption_id, vote_value'),
        fetchAllRows('captions', 'id, content, images(url)'),
      ]);

      const typedCaptions = (captions || []) as CaptionRow[];
      const typedVotes = (votes || []) as VoteRow[];

      const scoreMap = new Map<string, number>();
      typedCaptions.forEach((c) => scoreMap.set(c.id, 0));

      typedVotes.forEach((v) => {
        if (scoreMap.has(v.caption_id)) {
          const current = scoreMap.get(v.caption_id) || 0;
          scoreMap.set(v.caption_id, current + v.vote_value);
        }
      });

      const allCaptionsWithScores = typedCaptions.map((c) => ({
        ...c,
        totalScore: scoreMap.get(c.id) || 0,
      }));

      const sorted = [...allCaptionsWithScores].sort((a, b) => {
        if (a.totalScore !== b.totalScore) {
          return a.totalScore - b.totalScore;
        }
        return a.id.localeCompare(b.id);
      });

      const worst25 = sorted.slice(0, 25);
      setLeastFavored(worst25);

      if (profileId && worst25.length > 0) {
        const captionIds = worst25.map((item) => item.id);

        const { data: myVotes, error: myVotesError } = await supabase
          .from('caption_votes')
          .select('caption_id, vote_value')
          .eq('profile_id', profileId)
          .in('caption_id', captionIds);

        if (myVotesError) throw myVotesError;

        const voteMap: Record<string, number> = {};
        (myVotes || []).forEach((row: any) => {
          voteMap[row.caption_id] = row.vote_value;
        });
        setUserVotes(voteMap);
      } else {
        setUserVotes({});
      }
    } catch (error: any) {
      console.error('Load page data error:', error);
      setPageError(error.message || 'Failed to load page data.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPageData();
  }, []);

  const handleVote = async (captionId: string, voteValue: 1 | -1) => {
    if (!currentProfileId) {
      alert('Please log in first.');
      return;
    }

    try {
      setSubmittingId(captionId);

      const existingVote = userVotes[captionId];

      if (existingVote === undefined) {
        const { error } = await supabase.from('caption_votes').insert({
          caption_id: captionId,
          profile_id: currentProfileId,
          vote_value: voteValue,
        });

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('caption_votes')
          .update({ vote_value: voteValue })
          .eq('caption_id', captionId)
          .eq('profile_id', currentProfileId);

        if (error) throw error;
      }

      await loadPageData();
    } catch (error: any) {
      console.error('Vote error:', error);
      alert(error.message || 'Failed to submit vote.');
    } finally {
      setSubmittingId(null);
    }
  };

  const handleResetVote = async (captionId: string) => {
    if (!currentProfileId) {
      alert('Please log in first.');
      return;
    }

    try {
      setSubmittingId(captionId);

      const { error } = await supabase
        .from('caption_votes')
        .delete()
        .eq('caption_id', captionId)
        .eq('profile_id', currentProfileId);

      if (error) throw error;

      await loadPageData();
    } catch (error: any) {
      console.error('Reset vote error:', error);
      alert(error.message || 'Failed to reset vote.');
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

  if (pageError) {
    return (
      <div className="min-h-screen bg-white p-10">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-2xl font-black text-red-600 mb-4">Something went wrong</h1>
          <p className="text-slate-600 mb-6">{pageError}</p>
          <Link href="/main" className="text-blue-600 hover:underline">
            ← Back to Dashboard
          </Link>
        </div>
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
          The 25 captions with the lowest total voting scores across the full database.
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