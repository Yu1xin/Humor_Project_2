'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';

// 1. 在组件外部初始化，确保内部所有函数都能访问
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
  captionId: number;
  userId: string | undefined
}) {
  const [count, setCount] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleVote = async () => {
    // 权限检查
    if (!userId) {
      alert("Please log in to vote!");
      return;
    }

    setIsSubmitting(true);

    // 2. 向 caption_votes 表插入数据
    const { error } = await supabase
      .from('caption_votes')
      .insert([
        {
          caption_id: captionId,
          user_id: userId,
          vote_type: emoji // 确保你的数据库表有这些字段
        }
      ]);

    if (error) {
      console.error("Vote failed:", error.message);
      alert("Vote failed. Check RLS or Network.");
    } else {
      setCount(prev => prev + 1); // 成功后数字加1
    }

    setIsSubmitting(false);
  };

  return (
    <button
      onClick={handleVote}
      disabled={isSubmitting}
      className={`flex items-center gap-1 hover:bg-gray-100 px-3 py-1 rounded-full transition border ${
        isSubmitting ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
      }`}
    >
      <span>{emoji}</span>
      <span className="text-sm text-gray-600 font-medium">{count}</span>
    </button>
  );
}

export default function ListPage() {
  const [contexts, setContexts] = useState<any[]>([]);
  const [userId, setUserId] = useState<string | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function checkAuthAndFetch() {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        router.push('/login');
        return;
      }

      // 保存当前登录用户的 ID 供投票使用
      setUserId(session.user.id);

      const { data, error } = await supabase
        .from('community_contexts')
        .select('*');

      if (error) {
        setError(error.message);
      } else {
        setContexts(data || []);
      }
      setLoading(false);
    }

    checkAuthAndFetch();
  }, [router]);

  if (loading) return <div className="p-10 text-center">Loading Columbia Wisdom... 🦁</div>;

  return (
    <div className="max-w-4xl mx-auto p-8 font-sans">
      <header className="mb-10 text-center">
        <h1 className="text-4xl font-bold text-blue-600 mb-2">🦁 Columbia Contexts</h1>
      </header>

      <div className="grid gap-6">
        {contexts.map((item) => (
          <div key={item.id} className="p-6 border rounded-xl shadow-sm bg-white">
            <p className="text-lg text-gray-800 mb-6">{item.content}</p>

            {/* 3. 这里的修改至关重要：传入 captionId 和 userId */}
            <div className="flex gap-3 border-t pt-4">
              <InteractionButton emoji="💗" captionId={item.id} userId={userId} />
              <InteractionButton emoji="👎" captionId={item.id} userId={userId} />
              <InteractionButton emoji="❓" captionId={item.id} userId={userId} />
              <InteractionButton emoji="😂" captionId={item.id} userId={userId} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}