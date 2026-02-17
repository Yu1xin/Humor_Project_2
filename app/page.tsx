'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';

function InteractionButton({ emoji }: { emoji: string }) {
  const [count, setCount] = useState(0);
  return (
    <button
      onClick={() => setCount(count + 1)}
      className="flex items-center gap-1 hover:bg-gray-100 px-3 py-1 rounded-full transition border border-gray-100 shadow-sm"
    >
      <span>{emoji}</span>
      <span className="text-sm text-gray-600 font-medium">{count}</span>
    </button>
  );
}


export default function ListPage() {
  const [contexts, setContexts] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // initialize supabase
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    async function checkAuthAndFetch() {
      // 1. check if the user logged in
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        // if not logged in, redirect to login page
        router.push('/login');
        return;
      }

     // load data only if logged in
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
  }, [router, supabase]);

  if (loading) return <div className="p-10 text-center">Loading Columbia Wisdom... 🦁</div>;
  if (error) return <div className="p-10 text-red-500 text-center">Error: {error}</div>;

  return (
    <div className="max-w-4xl mx-auto p-8 font-sans">
      <header className="mb-10 text-center">
        <h1 className="text-4xl font-bold text-blue-600 mb-2">🦁🐻 Columbia & Barnard Contexts</h1>
        <p className="text-gray-500 italic">"What LLMs (and freshies) need to know..."</p>
      </header>

      <div className="grid gap-6">
        {contexts.map((item) => (
          <div key={item.id} className="p-6 border rounded-xl shadow-sm hover:shadow-md transition-all bg-white">
            <div className="flex items-center mb-3">
              <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2.5 py-0.5 rounded mr-2">
                ID: {item.id}
              </span>
              <span className="text-gray-400 text-xs">
                Updated at: {new Date(item.modified_datetime_utc).toLocaleDateString()}
              </span>
            </div>

            {/* 内容显示 */}
            <p className="text-lg text-gray-800 leading-relaxed mb-6">
              {item.content}
            </p>

            <div className="flex gap-3 border-t pt-4">
              <InteractionButton emoji="💗" />
              <InteractionButton emoji="👎" />
              <InteractionButton emoji="❓" />
              <InteractionButton emoji="😂" />
            </div>
          </div>
        ))}
      </div>

      <footer className="mt-20 text-center text-gray-400 text-sm pb-10">
        © 2026 CS Assignment #2 - Meme Context Gallery
      </footer>
    </div>
  );
}