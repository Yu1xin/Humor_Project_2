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

  const handleVote = async () => {
    if (!userId) {
      alert("请先登录！");
      return;
    }

    setIsSubmitting(true);

    // 修复：添加 created_datetime_utc 以满足数据库的非空约束
    const now = new Date().toISOString();

    const { error } = await supabase
      .from('caption_votes')
      .insert([
        {
          vote_value: emoji === "👎" ? -1 : 1,
          profile_id: userId,
          caption_id: captionId,
          created_datetime_utc: now, // 👈 核心修复：手动传入当前时间
          modified_datetime_utc: now  // 同时也更新修改时间
        }
      ]);

    if (error) {
      console.error("投票失败:", error.message);
      alert(`投票失败: ${error.message}`);
    } else {
      alert("投票成功！");
    }

    setIsSubmitting(false);
  };

  return (
    <button
      onClick={handleVote}
      disabled={isSubmitting}
      className="flex items-center gap-1 hover:bg-gray-100 px-4 py-2 rounded-full transition border disabled:opacity-50 cursor-pointer"
    >
      <span>{emoji}</span>
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

      // 从最合适的 'captions' 表获取数据
      const { data, error } = await supabase
        .from('captions')
        .select('*');

      if (!error) {
        setCaptionsList(data || []);
      }
      setLoading(false);
    }
    fetchData();
  }, [router]);

  if (loading) return <div className="p-10 text-center">Loading... 🦁</div>;

  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1 className="text-4xl font-bold text-blue-700 mb-10 text-center">🦁 Meme Gallery</h1>
      <div className="grid gap-6">
        {captionsList.map((item) => (
          <div key={item.id} className="p-6 border rounded-2xl shadow-sm bg-white">
            {/* 确保这里使用的是 captions 表中的正确列名，通常是 'content' */}
            <p className="text-xl text-gray-800 mb-6 italic">"{item.content}"</p>
            <div className="flex gap-4 border-t pt-4">
              <InteractionButton emoji="👍" captionId={item.id} userId={userId} />
              <InteractionButton emoji="👎" captionId={item.id} userId={userId} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}