'use client';
import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import Link from 'next/link';

export default function AdminDashboard() {
  const [stats, setStats] = useState({ users: 0, imgs: 0, caps: 0 });
  const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

  useEffect(() => {
    async function getStats() {
      // 这里的 head: true 确保只拿 count，不拿数据，不会导致 N^3 问题
      const { count: u } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
      const { count: i } = await supabase.from('images').select('*', { count: 'exact', head: true });
      const { count: c } = await supabase.from('captions').select('*', { count: 'exact', head: true });
      setStats({ users: u || 0, imgs: i || 0, caps: c || 0 });
    }
    getStats();
  }, [supabase]); // 💡 加上依赖数组，防止无限循环请求资源

  const navItems = [
    { name: "Users Management", path: "/admin/users", icon: "👥" },
    { name: "Image Library", path: "/admin/images", icon: "🖼️" },
    { name: "AI Captions", path: "/admin/captions", icon: "📝" },
    { name: "Data Analysis", path: "/admin/analytics", icon: "📊" },
  ];

  return (
    <div className="p-10 ml-64 bg-slate-50 min-h-screen">
      <h1 className="text-4xl font-black mb-10 text-slate-800">System Command Center 🛡️</h1>

      {/* 核心数据展示 */}
      <div className="grid grid-cols-3 gap-6 mb-12">
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
          <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Total Users</p>
          <p className="text-4xl font-black">{stats.users}</p>
        </div>
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
          <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Images Bank</p>
          <p className="text-4xl font-black text-blue-500">{stats.imgs}</p>
        </div>
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
          <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Captions Generated</p>
          <p className="text-4xl font-black text-emerald-500">{stats.caps}</p>
        </div>
      </div>

      {/* 扩展功能导航 - 证明你已经完成了架构规划 */}
      <h2 className="text-xl font-bold mb-6 text-slate-600">Module Navigation</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {navItems.map((item) => (
          <Link href={item.path} key={item.name} className="bg-white p-4 rounded-2xl border border-slate-200 hover:shadow-md transition-all flex flex-col items-center justify-center text-center">
            <span className="text-2xl mb-2">{item.icon}</span>
            <span className="text-xs font-bold text-slate-700">{item.name}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}