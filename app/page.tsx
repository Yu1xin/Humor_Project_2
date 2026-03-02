'use client';

import { useState, useEffect, useRef } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// 1. 重构组件，使其支持“锁定”和“反悔”
function VotingGroup({ captionId, userId }: { captionId: string; userId: string | undefined }) {
  const [votedType, setVotedType] = useState<'up' | 'down' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 投票函数 (Upsert)
  const handleVote = async (type: 'up' | 'down') => {
    if (!userId || votedType) return;
    setIsSubmitting(true);
    const now = new Date().toISOString();

    const { error } = await supabase
      .from('caption_votes')
      .upsert({
        vote_value: type === 'up' ? 1 : -1,
        profile_id: userId,
        caption_id: captionId,
        modified_datetime_utc: now,
        created_datetime_utc: now
      }, { onConflict: 'profile_id, caption_id' });

    if (!error) setVotedType(type);
    else alert(`Error: ${error.message}`);
    setIsSubmitting(false);
  };

  // 反悔函数 (Delete)
  const handleUndo = async () => {
    if (!userId) return;
    setIsSubmitting(true);

    const { error } = await supabase
      .from('caption_votes')
      .delete()
      .match({ profile_id: userId, caption_id: captionId });

    if (!error) setVotedType(null);
    else alert(`Undo failed: ${error.message}`);
    setIsSubmitting(false);
  };

  return (
    <div className="flex items-center gap-4">
      {/* Upvote Button */}
      <button
        onClick={() => handleVote('up')}
        disabled={isSubmitting || votedType !== null}
        className={`flex items-center gap-2 px-6 py-2 rounded-full transition border ${
          votedType === 'up'
            ? 'bg-blue-600 text-white border-blue-600'
            : 'bg-white text-slate-600 border-slate-200 disabled:opacity-50'
        } ${!votedType && !isSubmitting ? 'hover:bg-blue-50 cursor-pointer' : 'cursor-default'}`}
      >
        <span>👍</span>
        <span className="text-xs font-bold uppercase">{votedType === 'up' ? 'Upvoted' : 'Up'}</span>
      </button>

      {/* Downvote Button */}
      <button
        onClick={() => handleVote('down')}
        disabled={isSubmitting || votedType !== null}
        className={`flex items-center gap-2 px-6 py-2 rounded-full transition border ${
          votedType === 'down'
            ? 'bg-red-600 text-white border-red-600'
            : 'bg-white text-slate-600 border-slate-200 disabled:opacity-50'
        } ${!votedType && !isSubmitting ? 'hover:bg-red-50 cursor-pointer' : 'cursor-default'}`}
      >
        <span>👎</span>
        <span className="text-xs font-bold uppercase">{votedType === 'down' ? 'Downvoted' : 'Down'}</span>
      </button>

      {/* Undo Link */}
      {votedType && (
        <button
          onClick={handleUndo}
          className="text-xs text-slate-400 underline hover:text-blue-600 transition-colors ml-2"
        >
          Reset Vote
        </button>
      )}
    </div>
  );
}

export default function ListPage() {
  const [captionsList, setCaptionsList] = useState<any[]>([]);
  const [userId, setUserId] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const router = useRouter();

  useEffect(() => {
    async function fetchData() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/login'); return; }
      setUserId(session.user.id);

      const { data, error } = await supabase.from('captions').select('*, images(url)');
      if (!error) setCaptionsList(data || []);
      setLoading(false);
    }
    fetchData();
  }, [router]);

  useEffect(() => {
    const updateActive = () => {
      const centerY = window.innerHeight / 2;
      let bestIndex = 0;
      let bestDist = Number.POSITIVE_INFINITY;
      cardRefs.current.forEach((el, idx) => {
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const elCenter = rect.top + rect.height / 2;
        const dist = Math.abs(elCenter - centerY);
        if (dist < bestDist) { bestIndex = idx; bestDist = dist; }
      });
      setActiveIndex(bestIndex);
    };
    window.addEventListener('scroll', updateActive);
    return () => window.removeEventListener('scroll', updateActive);
  }, [captionsList]);

  if (loading) return <div className="p-10 text-center font-mono">LOADING...</div>;

  return (
    <div className="max-w-3xl mx-auto p-6 bg-white min-h-screen">
      <header className="mb-16 text-center">
        <h1 className="text-5xl font-black text-slate-900 mb-4 tracking-tight">🦁 Meme Board</h1>
      </header>

      <div className="space-y-16">
        {captionsList.map((item, index) => {
          const isActive = index === activeIndex;
          return (
            <div
              key={item.id}
              ref={(el) => { cardRefs.current[index] = el; }}
              className={`overflow-hidden border border-slate-200 rounded-[2.5rem] bg-transparent transition-all duration-500 ${
                isActive ? 'shadow-2xl scale-105 opacity-100' : 'shadow-sm scale-90 opacity-40'
              }`}
            >
              {item.images?.url && (
                <div className="w-full aspect-video">
                  <img src={item.images.url} alt="Meme" className="w-full h-full object-cover" />
                </div>
              )}
              <div className="p-8">
                <blockquote className="text-2xl text-slate-800 mb-8 font-semibold italic">"{item.content}"</blockquote>
                <VotingGroup captionId={item.id} userId={userId} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}