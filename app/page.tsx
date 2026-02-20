'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';

// 初始化 Supabase
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
  captionId: string; // 这里的 ID 来自 caption_examples 的 id 列 (UUID)
  userId: string | undefined
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleVote = async () => {
    if (!userId) {
      alert("请先登录！");
      return;
    }

    setIsSubmitting(true);

    // 插入数据到投票表
    const { error } = await supabase
      .from('caption_votes') // 请确认你的表名是 caption_votes 还是 caption_likes
      .insert([
        {
          vote_value: emoji === "👎" ? -1 : 1,
          profile_id: userId,
          caption_id: captionId
        }
      ]);

    if (error) {
      console.error("投票失败:", error.message);
      alert(`投票失败: ${error.message}`);
    } else {
      alert("投票成功！已记入数据库。");
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
  const [items, setItems] = useState<any[]>([]);
  const [userId, setUserId] = useState<string | undefined>(undefined);
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

      // 2. 获取内容数据：从 caption_examples 表取，这里有文本和 UUID
      const { data, error } = await supabase
        .from('caption_examples')
        .select('id, text'); // 确保列名是 caption_text

      if (error) {
        console.error("获取数据失败:", error.message);
      } else {
        setItems(data || []);
      }
      setLoading(false);
    }
    fetchData();
  }, [router]);

  if (loading) return <div className="p-10 text-center">正在加载内容... 🦁</div>;

  return (
    <div className="max-w-4xl mx-auto p-8 font-sans">
      <header className="mb-10 text-center">
        <h1 className="text-4xl font-bold text-blue-600 mb-2">🦁 Meme Captions</h1>
        <p className="text-gray-500 italic">"Vote for your favorite caption!"</p>
      </header>

      <div className="grid gap-6">
        {items.map((item) => (
          <div key={item.id} className="p-6 border rounded-xl shadow-sm bg-white">
            {/* 这里的 item.caption_text 对应你数据库里的文本列 */}
            <p className="text-lg text-gray-800 mb-6 leading-relaxed">
              {item.text}
            </p>

            <div className="flex gap-3 border-t pt-4">
              {/* 这里的 item.id 是 UUID，传给投票表作为 caption_id */}
              <InteractionButton emoji="👍" captionId={item.id} userId={userId} />
              <InteractionButton emoji="👎" captionId={item.id} userId={userId} />
            </div>
          </div>
        ))}
      </div>

      <footer className="mt-20 text-center text-gray-400 text-sm pb-10">
        © 2026 CS Assignment - Rate My Caption
      </footer>
    </div>
  );
}