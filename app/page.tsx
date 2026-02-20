'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

function InteractionButton({
  emoji,
  captionId,
  userId
}: {
  emoji: string;
  captionId: string;
  userId: string | undefined
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasVoted, setHasVoted] = useState(false);

  const handleVote = async () => {
    if (!userId || hasVoted) return;

    setIsSubmitting(true);
    const now = new Date().toISOString();

    const { error } = await supabase
      .from('caption_votes')
      .upsert(
        {
          vote_value: emoji === "👎" ? -1 : 1,
          profile_id: userId,
          caption_id: captionId,
          modified_datetime_utc: now,
          created_datetime_utc: now
        },
        { onConflict: 'profile_id, caption_id' }
      );

    if (error) {
      console.error("Operation failed:", error.message);
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
        hasVoted
          ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
          : 'hover:bg-blue-50 hover:border-blue-300 cursor-pointer active:scale-95 bg-white'
      }`}
    >
      <span>{emoji}</span>
      <span className="text-xs font-bold uppercase tracking-wider">
        {hasVoted ? 'Voted' : (emoji === "👎" ? 'Down' : 'Up')}
      </span>
    </button>
  );
}

export default function ListPage() {
  const [captionsList, setCaptionsList] = useState<any[]>([]);
  const [userId, setUserId] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function fetchData() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }
      setUserId(session.user.id);

      // 核心修改：通过关联查询获取 images 表中的 url
      // 假设 captions 表中有一个外键 image_id 指向 images 表
      const { data, error } = await supabase
        .from('captions')
        .select(`
          *,
          images (
            url
          )
        `);

      if (error) {
        console.error("Fetch error:", error.message);
      } else {
        setCaptionsList(data || []);
      }
      setLoading(false);
    }
    fetchData();
  }, [router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-600 font-medium animate-pulse">Fetching Columbia Gallery...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6 font-sans bg-white min-h-screen">
      <header className="mb-16 text-center">
        <h1 className="text-5xl font-black text-slate-900 mb-4 tracking-tight">
          🦁 Meme Board
        </h1>
        <p className="text-slate-500 text-lg font-light">
          Review and rate the latest campus captures
        </p>
      </header>

      <div className="space-y-12">
        {captionsList.map((item) => (
          <div key={item.id} className="group overflow-hidden border border-slate-200 rounded-[2rem] bg-white shadow-xl shadow-slate-200/50 transition-all hover:shadow-2xl">

            {/* 1. 展示图片：从关联的 images 数据中提取 url */}
            {item.images?.url && (
              <div className="w-full aspect-video overflow-hidden bg-slate-100">
                <img
                  src={item.images.url}
                  alt="Meme Content"
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </div>
            )}

            <div className="p-8">
              {/* 2. 展示文字 */}
              <blockquote className="text-2xl text-slate-800 mb-8 font-semibold leading-snug italic">
                "{item.content}"
              </blockquote>

              <div className="flex gap-4 items-center">
                <InteractionButton emoji="👍" captionId={item.id} userId={userId} />
                <InteractionButton emoji="👎" captionId={item.id} userId={userId} />

                <div className="ml-auto text-[10px] text-slate-300 font-mono tracking-tighter opacity-0 group-hover:opacity-100 transition-opacity">
                  ID: {item.id}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <footer className="mt-24 text-center border-t border-slate-100 pt-12 pb-12">
        <div className="inline-block px-4 py-1 rounded-full bg-slate-100 text-slate-500 text-[10px] font-bold mb-4">
          SESSION_UID: {userId}
        </div>
        <p className="text-slate-400 text-[10px] font-mono uppercase tracking-[0.2em]">
          © 2026 CS DATA MUTATION & JOIN QUERY PROJECT
        </p>
      </footer>
    </div>
  );
}