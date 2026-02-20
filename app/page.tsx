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
  captionId: string; // 接收 caption_examples 表的 UUID
  userId: string | undefined
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleVote = async () => {
    if (!userId) {
      alert("请先登录！");
      return;
    }

    setIsSubmitting(true);

    // 插入到投票表，确保字段名与你的数据库截图一致
    const { error } = await supabase
      .from('caption_votes')
      .insert([
        {
          vote_value: emoji === "👎" ? -1 : 1,
          profile_id: userId,                  // 对应 session 里的用户 UUID
          caption_id: captionId                // 对应 caption_examples 里的 UUID
        }
      ]);

    if (error) {
      console.error("投票失败:", error.message);
      alert(`投票失败: ${error.message}`);
    } else {
      alert("投票成功！数据已存入数据库。");
    }

    setIsSubmitting(false);
  };

  return (
    <button
      onClick={handleVote}
      disabled={isSubmitting}
      className={`flex items-center gap-1 hover:bg-gray-100 px-4 py-2 rounded-full transition border ${
        isSubmitting ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
      }`}
    >
      <span>{emoji}</span>
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
    async function checkAuthAndFetch() {
      // 1. 获取用户信息
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        router.push('/login');
        return;
      }

      setUserId(session.user.id);

      // 2. 切换数据来源到 caption_examples
      const { data, error } = await supabase
        .from('caption_examples')
        .select('*');

      if (error) {
        setError(error.message);
      } else {
        setCaptions(data || []);
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
        <h1 className="text-4xl font-bold text-blue-600 mb-2">🦁 Columbia Meme Captions</h1>
        <p className="text-gray-500 italic">User: {userId?.slice(0,8)}...</p>
      </header>

      <div className="grid gap-6">
        {captions.map((item) => (
          <div key={item.id} className="p-6 border rounded-xl shadow-sm bg-white">
            {/* 使用你提到的 contents 列来显示文本 */}
            <p className="text-lg text-gray-800 mb-6 leading-relaxed">
              {item.contents || "No content found in 'contents' column"}
            </p>

            <div className="flex gap-4 border-t pt-4">
              {/* 这里的 item.id 是 caption_examples 的 UUID */}
              <InteractionButton emoji="👍" captionId={item.id} userId={userId} />
              <InteractionButton emoji="👎" captionId={item.id} userId={userId} />
            </div>
          </div>
        ))}
      </div>

      <footer className="mt-20 text-center text-gray-400 text-sm pb-10">
        © 2026 CS Assignment - Rate My Meme
      </footer>
    </div>
  );
}