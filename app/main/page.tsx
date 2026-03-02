'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';

export default function MainPage() {
  const [userEmail, setUserEmail] = useState<string | null>(null);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserEmail(session?.user.email || 'Student');
    });
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6 text-center">
      <h1 className="text-4xl font-black text-slate-900 mb-2">Welcome back, 🦁</h1>
      <p className="text-slate-500 mb-12 italic">{userEmail}</p>

      <div className="flex flex-col gap-4 w-full max-w-xs">
        {/* Main Action Button */}
        <Link href="/" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-8 rounded-2xl shadow-lg transition-all active:scale-95 text-lg">
          Start voting memes 🫡
        </Link>


        <Link href="/upload" className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-4 px-8 rounded-2xl shadow-lg transition-all active:scale-95 text-center">
          Upload Picture & make New Meme 📸
        </Link>


        {/* Smaller Secondary Button */}
        <Link href="/least-favored" className="text-slate-400 hover:text-red-500 text-sm font-medium transition-colors mt-4">
          View Least Favored Memes
        </Link>

      </div>
    </div>
  );
}