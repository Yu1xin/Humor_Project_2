'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';

// 初始化 Supabase 客户端
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
  captionId: string; // 确保这里接收的是数据库里的 UUID 字符串
  userId: string | undefined
}) {
  const [count, setCount] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleVote = async () => {
    if (!userId) {
      alert("请先登录！");
      return;
    }

    setIsSubmitting(true);

    // 根据你的数据库截图精确匹配字段名
    const { error } = await supabase
      .from('caption_votes')
      .insert([
        {
          vote_value: emoji === "👎" ? -1 : 1, // 转换为数据库 int8 类型
          profile_id: userId,                  // 对应截图中的 profile_id
          caption_id: captionId                // 对应截图中的 caption_id
        }
      ]);

    if (error) {
      console.error("投票失败:", error.message);
      alert(`投票失败: ${error.message}`); // 显示具体错误方便调试
    } else {
      setCount(prev => prev + 1);
      alert("投票成功！已记入数据库。");
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
      // 获取当前登录会话以拿到用户 ID
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        router.push('/login');
        return;
      }

      setUserId(session.user.id); // 这里的 ID 将作为 profile_id 传入

      // 获取数据
      const { data, error } = await supabase
        .from('community_contents')
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
  if (error) return <div className="p-10 text-red-500 text-center">Error: {error}</div>;

  return (
    <div className="max-w-4xl mx-auto p-8 font-sans">
      <header className="mb-10 text-center">
        <h1 className="text-4xl font-bold text-blue-600 mb-2">🦁 Columbia Contexts</h1>
        <p className="text-gray-500 italic">Logged in as user: {userId?.slice(0,8)}...</p>
      </header>

      <div className="grid gap-6">
        {contexts.map((item) => (
          <div key={item.id} className="p-6 border rounded-xl shadow-sm bg-white">
            <p className="text-lg text-gray-800 mb-6">{item.content}</p>

            <div className="flex gap-3 border-t pt-4">
              {/* 核心改动：将 item.id (作为 caption_id) 和 userId (作为 profile_id) 传给按钮 */}
              <InteractionButton emoji="💗" captionId={item.id} userId={userId} />
              <InteractionButton emoji="👎" captionId={item.id} userId={userId} />
              <InteractionButton emoji="❓" captionId={item.id} userId={userId} />
              <InteractionButton emoji="😂" captionId={item.id} userId={userId} />
            </div>
          </div>
        ))}
      </div>

      <footer className="mt-20 text-center text-gray-400 text-sm pb-10">
        © 2026 CS Assignment - Data Mutation Practice
      </footer>
    </div>
  );
}