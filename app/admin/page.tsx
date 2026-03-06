'use client';
import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';

export default function AdminDashboard() {
  const [stats, setStats] = useState({ users: 0, imgs: 0, caps: 0 });
  const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

  useEffect(() => {
    async function getStats() {
      const { count: u } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
      const { count: i } = await supabase.from('images').select('*', { count: 'exact', head: true });
      const { count: c } = await supabase.from('captions').select('*', { count: 'exact', head: true });
      setStats({ users: u || 0, imgs: i || 0, caps: c || 0 });
    }
    getStats();
  }, []);

  return (
    <div className="p-10 bg-slate-50 min-h-screen">
      <h1 className="text-3xl font-black mb-10 text-blue-600">Admin Dashboard 🛡️</h1>
      <div className="grid grid-cols-3 gap-6">
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
          <p className="text-slate-400 font-bold uppercase text-xs tracking-widest">Total Users</p>
          <p className="text-4xl font-black">{stats.users}</p>
        </div>
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
          <p className="text-slate-400 font-bold uppercase text-xs tracking-widest">Memes Created</p>
          <p className="text-4xl font-black text-blue-500">{stats.imgs}</p>
        </div>
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
          <p className="text-slate-400 font-bold uppercase text-xs tracking-widest">AI Captions</p>
          <p className="text-4xl font-black text-emerald-500">{stats.caps}</p>
        </div>
      </div>
    </div>
  );
}