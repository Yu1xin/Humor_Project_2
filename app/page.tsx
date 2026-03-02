'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';

export default function VoteGallery() {
  const [memes, setMemes] = useState<any[]>([]);
  const [votedCount, setVotedCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    async function fetchData() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          router.push('/login');
          return;
        }

        // 1. 直接获取 Captions 和关联的 Image URL
        const { data, error } = await supabase
          .from('captions')
          .select('id, content, images(url)')
          .order('created_at', { ascending: false });

        if (error) throw error;
        setMemes(data || []);

        // 2. 获取该用户的投票总数
        const { count } = await supabase
          .from('caption_votes')
          .select('*', { count: 'exact', head: true })
          .eq('profile_id', session.user.id);

        setVotedCount(count || 0);
      } catch (err) {
        console.error("Fetch failed:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [router, supabase]);

  const total = memes.length;
  const progress = total > 0 ? (votedCount / total) * 100 : 0;

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-white pl-20 font-bold text-blue-600 animate-pulse">
      LOADING MEMES...
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      {/* 🚀 顶部进度条 - 固定在最上方 */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200 h-20 flex items-center shadow-sm">
        <div className="w-full max-w-5xl mx-auto px-24 flex items-center gap-8">
          <div className="flex-shrink-0">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-tight">VOTING PROGRESS</p>
            <p className="text-2xl font-black text-blue-600 leading-none">{votedCount} <span className="text-slate-300 text-base">/ {total}</span></p>
          </div>
          <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
            <div
              className="h-full bg-blue-500 transition-all duration-1000 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-sm font-black text-blue-600">{Math.round(progress)}%</p>
        </div>
      </div>

      {/* 🖼️ 内容主体 */}
      <main className="pt-32 pb-20 pl-20">
        <div className="max-w-xl mx-auto flex flex-col gap-12 px-4">
          {memes.length === 0 ? (
            <div className="bg-white p-20 rounded-[3rem] border-2 border-dashed border-slate-200 text-center">
               <p className="text-slate-400 font-bold italic">"Wait, where are the memes? Go to upload page first!"</p>
            </div>
          ) : (
            memes.map((m, i) => (
              <div key={m.id} className="bg-white rounded-[2.5rem] shadow-xl border border-slate-100 overflow-hidden relative group transition-transform hover:scale-[1.01]">
                {/* 序号 */}
                <div className="absolute top-4 left-4 bg-black text-white px-4 py-2 rounded-2xl font-black z-10 shadow-lg rotate-[-5deg]">
                  #{i + 1}
                </div>

                {/* 图片展示 */}
                {m.images?.url ? (
                  <img src={m.images.url} className="w-full h-auto" alt="Meme" />
                ) : (
                  <div className="h-64 bg-slate-100 flex items-center justify-center text-slate-400">Image missing</div>
                )}

                {/* 文字展示 */}
                <div className="p-10 text-center">
                  <blockquote className="text-2xl font-black italic text-slate-800 leading-snug">
                    "{m.content}"
                  </blockquote>

                  {/* 这里你可以手动加上你之前的投票按钮逻辑 */}
                  <div className="mt-8 pt-8 border-t border-slate-50 flex justify-center gap-4">
                    <button className="bg-blue-50 text-blue-600 px-6 py-3 rounded-2xl font-bold hover:bg-blue-600 hover:text-white transition-all">👍 Upvote</button>
                    <button className="bg-red-50 text-red-600 px-6 py-3 rounded-2xl font-bold hover:bg-red-600 hover:text-white transition-all">👎 Downvote</button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}