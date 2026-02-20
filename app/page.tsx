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
  captionId: string; // 现在这里接收的是 captions 表的 UUID
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

    // 插入到投票表 caption_votes (或者 caption_likes，请根据你数据库实际表名确认)
    const { error } = await supabase
      .from('caption_votes')
      .insert([
        {
          vote_value: emoji === "👎" ? -1 : 1,
          profile_id: userId,                  // 用户的 UUID
          caption_id: captionId                // Captions 表的 UUID
        }
      ]);

    if (error) {
      console.error("投票失败:", error.message);
      alert(`投票失败: ${error.message}`);
    } else {
      setCount(prev => prev + 1);
      alert("投票成功！");
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
  const [captions, setCaptions] = useState<any[]>([]);
  const [userId, setUserId] = useState<string | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function fetchData() {
      // 1. 获取用户信息
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        router.push('/login');
        return;
      }

      setUserId(session.user.id);

      // 2. 核心修改：从 captions 表获取数据
      // 假设列名是 id (UUID) 和 content (文本内容)
      const { data, error } = await supabase
        .from('captions')
        .select('id, content');

      if (error) {
        setError(error.message);
      } else {
        setCaptions(data || []);
      }
      setLoading(false);
    }

    fetchData();
  }, [router]);

  if (loading) return <div className="p-10 text-center">Loading Meme Wisdom... 🦁</div>;
  if (error) return <div className="p-10 text-red-500 text-center">Error: {error}</div>;

  return (
    <div className="max-w-4xl mx-auto p-8 font-sans">
      <header className="mb-10 text-center">
        <h1 className="text-4xl font-bold text-blue-600 mb-2">🦁 Columbia Meme Captions</h1>
        <p className="text-gray-500 italic">Logged in as user: {userId?.slice(0,8)}...</p>
      </header>

      <div className="grid gap-6">
        {captions.length === 0 ? (
          <p className="text-center text-gray-500 italic">No captions found in 'captions' table.</p>
        ) : (
          captions.map((item) => (
            <div key={item.id} className="p-6 border rounded-xl shadow-sm bg-white">
              <p className="text-lg text-gray-800 mb-6 leading-relaxed">
                {item.content}
              </p>

              <div className="flex gap-3 border-t pt-4">
                {/* 这里的 item.id 已经是 UUID 了 */}
                <InteractionButton emoji="👍" captionId={item.id} userId={userId} />
                <InteractionButton emoji="👎" captionId={item.id} userId={userId} />
              </div>
            </div>
          ))
        )}
      </div>

      <footer className="mt-20 text-center text-gray-400 text-sm pb-10">
        © 2026 CS Assignment - Data Mutation Success
      </footer>
    </div>
  );
}