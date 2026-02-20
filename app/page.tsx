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
    const now = new Date().toISOString();

    // 使用 upsert 代替 insert
    // 这将根据数据库定义的唯一约束自动处理“插入或更新”
    const { error } = await supabase
      .from('caption_votes')
      .upsert(
        {
          vote_value: emoji === "👎" ? -1 : 1,
          profile_id: userId,
          caption_id: captionId,
          modified_datetime_utc: now,
          // 如果是新纪录，created_datetime_utc 会被存入，如果是更新，通常保持不变
          created_datetime_utc: now
        },
        {
          // 这里的关键是告诉 Supabase 哪几列组合起来是唯一的
          // 假设你的数据库在 (profile_id, caption_id) 上有唯一约束
          onConflict: 'profile_id, caption_id'
        }
      );

    if (error) {
      console.error("投票操作失败:", error.message);
      // 如果报错 "onConflict" 相关，可能是数据库还没设唯一索引，此时 upsert 会退化为 insert
      alert(`操作失败: ${error.message}`);
    } else {
      alert("操作成功（已更新或新增投票）！");
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

      // 从 captions 表获取内容
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
      <h1 className="text-3xl font-bold text-blue-700 mb-10 text-center">🦁 Meme Gallery</h1>
      <div className="grid gap-6">
        {captionsList.map((item) => (
          <div key={item.id} className="p-6 border rounded-2xl shadow-sm bg-white">
            <p className="text-xl text-gray-800 mb-6 font-medium italic">"{item.content}"</p>
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