'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type CaptionItem = {
  id: string;
  content: string | null;
  like_count: number | null;
  images?: {
    url?: string | null;
  } | null;
};

async function refreshCaptionLikeCount(captionId: string) {
  const { data, error } = await supabase
    .from('caption_votes')
    .select('vote_value')
    .eq('caption_id', captionId);

  if (error) throw error;

  const score = (data || []).reduce(
    (sum, row) => sum + Number(row.vote_value || 0),
    0
  );

  const { error: updateError } = await supabase
    .from('captions')
    .update({ like_count: score })
    .eq('id', captionId);

  if (updateError) throw updateError;

  return score;
}

function VotingGroup({
  captionId,
  userId,
  initialLikeCount,
  onVoteFinished,
}: {
  captionId: string;
  userId: string | undefined;
  initialLikeCount: number;
  onVoteFinished: () => Promise<void>;
}) {
  const [votedType, setVotedType] = useState<'up' | 'down' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingVote, setIsLoadingVote] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchExistingVote() {
      if (!userId) {
        setIsLoadingVote(false);
        return;
      }

      const { data, error } = await supabase
        .from('caption_votes')
        .select('vote_value')
        .eq('profile_id', userId)
        .eq('caption_id', captionId)
        .maybeSingle();

      if (!cancelled) {
        if (!error && data) {
          if (data.vote_value === 1) setVotedType('up');
          else if (data.vote_value === -1) setVotedType('down');
          else setVotedType(null);
        } else {
          setVotedType(null);
        }
        setIsLoadingVote(false);
      }
    }

    fetchExistingVote();

    return () => {
      cancelled = true;
    };
  }, [captionId, userId]);

  const handleVote = async (type: 'up' | 'down') => {
    if (!userId || votedType || isSubmitting) return;

    setIsSubmitting(true);
    const now = new Date().toISOString();

    try {
      const { error } = await supabase
        .from('caption_votes')
        .upsert(
          {
            vote_value: type === 'up' ? 1 : -1,
            profile_id: userId,
            caption_id: captionId,
            modified_datetime_utc: now,
            created_datetime_utc: now,
          },
          { onConflict: 'profile_id,caption_id' }
        );

      if (error) throw error;

      setVotedType(type);

      await refreshCaptionLikeCount(captionId);
      await onVoteFinished();
    } catch (err: any) {
      alert(`Vote failed: ${err.message || 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUndo = async () => {
    if (!userId || isSubmitting) return;

    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from('caption_votes')
        .delete()
        .match({ profile_id: userId, caption_id: captionId });

      if (error) throw error;

      setVotedType(null);

      await refreshCaptionLikeCount(captionId);
      await onVoteFinished();
    } catch (err: any) {
      alert(`Undo failed: ${err.message || 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="text-xs font-mono text-slate-400">
        likes: <span className="text-red-500 font-bold">{initialLikeCount}</span>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => handleVote('up')}
          disabled={isSubmitting || isLoadingVote || votedType !== null}
          className={`px-3 py-2 rounded-xl text-xs font-bold border transition ${
            votedType === 'up'
              ? 'bg-green-600 text-white border-green-600'
              : 'bg-white text-green-700 border-green-200 hover:bg-green-50 disabled:opacity-50'
          }`}
        >
          {votedType === 'up' ? '⬆ Upvoted' : '⬆ Up'}
        </button>

        <button
          onClick={() => handleVote('down')}
          disabled={isSubmitting || isLoadingVote || votedType !== null}
          className={`px-3 py-2 rounded-xl text-xs font-bold border transition ${
            votedType === 'down'
              ? 'bg-red-600 text-white border-red-600'
              : 'bg-white text-red-700 border-red-200 hover:bg-red-50 disabled:opacity-50'
          }`}
        >
          {votedType === 'down' ? '⬇ Downvoted' : '⬇ Down'}
        </button>

        {votedType && (
          <button
            onClick={handleUndo}
            disabled={isSubmitting}
            className="px-3 py-2 rounded-xl text-xs font-bold border bg-white text-slate-600 border-slate-200 hover:bg-slate-100 disabled:opacity-40"
          >
            Reset
          </button>
        )}
      </div>
    </div>
  );
}

export default function LeastFavoredPage() {
  const [leastFavored, setLeastFavored] = useState<CaptionItem[]>([]);
  const [userId, setUserId] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  const router = useRouter();

  async function loadLeastFavored() {
    try {
      const { data, error } = await supabase
        .from('captions')
        .select('id, content, like_count, images(url)')
        .order('like_count', { ascending: true })
        .order('id', { ascending: true })
        .limit(25);

      if (error) throw error;

      setLeastFavored((data || []) as CaptionItem[]);
    } catch (err: any) {
      console.error(err);
      alert(`Failed to load bottom 25: ${err.message || 'Unknown error'}`);
    }
  }

  useEffect(() => {
    async function fetchData() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          router.push('/login');
          return;
        }

        setUserId(session.user.id);
        await loadLeastFavored();
      } catch (err: any) {
        console.error(err);
        alert(`Failed to load page: ${err.message || 'Unknown error'}`);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [router]);

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
          The 25 captions with the lowest current vote counts. (total up - total down)
        </p>
      </header>

      {leastFavored.length === 0 ? (
        <p className="text-slate-500">No caption data found.</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
          {leastFavored.map((item) => (
            <div
              key={item.id}
              className="bg-slate-50 rounded-2xl border border-slate-200 p-3 opacity-90 grayscale hover:grayscale-0 hover:opacity-100 transition-all duration-300"
            >
              {item.images?.url && (
                <img
                  src={item.images.url}
                  alt="Meme"
                  className="w-full aspect-square object-cover rounded-xl mb-3 border border-slate-100"
                />
              )}

              <p className="text-sm text-slate-700 italic line-clamp-4 mb-3">
                "{item.content || 'No caption content'}"
              </p>

              <VotingGroup
                captionId={item.id}
                userId={userId}
                initialLikeCount={Number(item.like_count ?? 0)}
                onVoteFinished={loadLeastFavored}
              />
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