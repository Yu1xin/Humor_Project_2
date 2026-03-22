'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';

type DashboardButton = {
  href: string;
  icon: string;
  label: string;
  desc: string;
  color: string;
};

export default function MainPage() {
  const [userEmail, setUserEmail] = useState<string | null>(null);

  const supabase = useMemo(
    () =>
      createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      ),
    []
  );

  useEffect(() => {
    async function loadSession() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      setUserEmail(session?.user?.email || 'Student');
    }

    loadSession();
  }, [supabase]);

  const dashboardButtons: DashboardButton[] = [
    {
      href: '/',
      icon: '🖼️',
      label: 'Vote Memes',
      desc: 'Browse memes and vote 👍👎',
      color: 'bg-blue-600 hover:bg-blue-700',
    },
    {
      href: '/upload',
      icon: '📸',
      label: 'Upload Meme',
      desc: 'Upload a picture and generate a new meme',
      color: 'bg-emerald-500 hover:bg-emerald-600',
    },
    {
      href: '/least-favored',
      icon: '📉',
      label: 'Bottom 25 Agree or Disagree?',
      desc: 'See the memes with lowest performance and vote them',
      color: 'bg-rose-500 hover:bg-rose-600',
    },
    {
      href: '/list',
      icon: '👀',
      label: 'Who is online',
      desc: 'Latest 20 voting actions👁️👁️',
      color: 'bg-violet-500 hover:bg-violet-600',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="mx-auto max-w-5xl">
        <div className="mb-10 rounded-[2rem] bg-white p-8 shadow-xl border border-slate-200">
          <h1 className="text-4xl font-black text-slate-900 mb-2">
            Welcome back,
          </h1>
          <p className="text-slate-500 italic break-words">
            {userEmail}
          </p>
        </div>

        <div className="mb-6">
          <h2 className="text-xl font-bold text-slate-800">Dashboard</h2>
          <p className="text-slate-500 text-sm mt-1">
            Choose where you want to go next.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {dashboardButtons.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className={`${item.color} text-white rounded-[2rem] shadow-lg transition-all active:scale-95 hover:-translate-y-0.5`}
            >
              <div className="p-7 text-left">
                <div className="text-3xl mb-4">{item.icon}</div>
                <div className="text-xl font-bold mb-2">{item.label}</div>
                <div className="text-sm text-white/85 leading-relaxed">
                  {item.desc}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}