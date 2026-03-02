'use client';

import { useState, useEffect, useRef } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

function InteractionButton({ emoji, captionId, userId }: { emoji: string; captionId: string; userId: string | undefined }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasVoted, setHasVoted] = useState(false);

  const handleVote = async () => {
    if (!userId || hasVoted) return;
    setIsSubmitting(true);
    const now = new Date().toISOString();

    const { error } = await supabase
      .from('caption_votes')
      .upsert({
        vote_value: emoji === "👎" ? -1 : 1,
        profile_id: userId,
        caption_id: captionId,
        modified_datetime_utc: now,
        created_datetime_utc: now
      }, { onConflict: 'profile_id, caption_id' });

    if (error) {
      console.error("Vote failed:", error.message);
      alert(`Error: ${error.message}`);
    } else {
      setHasVoted(true);
    }
    setIsSubmitting(false);
  };

  return (
    <button
      onClick={handleVote}
      disabled={isSubmitting || hasVoted}
      className={`flex items-center gap-2 px-6 py-2 rounded-full transition border shadow-sm ${
        hasVoted ? 'bg-slate-100 text-slate-400 border-slate-200' : 'hover:bg-blue-50 bg-white cursor-pointer active:scale-95'
      }`}
    >
      <span>{emoji}</span>
      <span className="text-xs font-bold uppercase">{hasVoted ? 'Voted' : (emoji === "👎" ? 'Down' : 'Up')}</span>
    </button>
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
        if (dist < bestDist) { bestDist = dist; bestIndex = idx; }
      });
      setActiveIndex(bestIndex);
    };
    window.addEventListener('scroll', updateActive);
    return () => window.removeEventListener('scroll', updateActive);
  }, [captionsList]);

  if (loading) return <div className="p-10 text-center">Loading Columbia Gallery... 🦁</div>;

  return (
    <div className="max-w-3xl mx-auto p-6 font-sans bg-white min-h-screen">
      <header className="mb-16 text-center">
        <h1 className="text-5xl font-black text-slate-900 mb-4 tracking-tight">🦁 Meme Board</h1>
      </header>

      <div className="space-y-12">
        {captionsList.map((item, index) => {
          const isActive = index === activeIndex;
          return (
            <div
              key={item.id}
              ref={(el) => { cardRefs.current[index] = el; }}
              className={`group overflow-hidden border border-slate-200 rounded-[2rem] bg-white transition-all duration-300 ${isActive ? 'shadow-2xl' : 'shadow-sm opacity-60'}`}
              style={{ transform: `scale(${isActive ? 1.02 : 0.95})` }}
            >
              {item.images?.url && (
                <div className="w-full aspect-video overflow-hidden">
                  <img src={item.images.url} alt="Meme" className="w-full h-full object-cover" />
                </div>
              )}
              <div className="p-8">
                <blockquote className="text-2xl text-slate-800 mb-8 font-semibold italic">"{item.content}"</blockquote>
                <div className="flex gap-4">
                  <InteractionButton emoji="👍" captionId={item.id} userId={userId} />
                  <InteractionButton emoji="👎" captionId={item.id} userId={userId} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}