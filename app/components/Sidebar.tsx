'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  // 如果是在登录页，不显示侧边栏
  if (pathname === '/login') return null;

  return (
    <aside
      className={`fixed left-0 top-0 h-screen bg-white border-r border-slate-200 z-50 transition-all duration-300 ease-in-out shadow-lg flex flex-col ${
        isOpen ? 'w-64' : 'w-20'
      }`}
    >
      {/* 顶部 Logo & 切换按钮 */}
      <div className="h-20 flex items-center justify-between px-6 border-b border-slate-50">
        {isOpen && <span className="text-xl font-black text-blue-600 animate-in fade-in">MemeLab</span>}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 rounded-lg hover:bg-slate-100 transition-colors text-slate-500"
        >
          {isOpen ? '◀' : '▶'}
        </button>
      </div>

      {/* 导航区域 */}
      <nav className="flex-1 flex flex-col gap-2 p-3 mt-4">
        <SidebarLink href="/main" icon="🏠" label="Dashboard" isOpen={isOpen} active={pathname === '/main'} />
        <SidebarLink href="/" icon="🖼️" label="Vote Gallery" isOpen={isOpen} active={pathname === '/'} />
        <SidebarLink href="/upload" icon="📸" label="Upload Meme" isOpen={isOpen} active={pathname === '/upload'} />
        <SidebarLink href="/least-favored" icon="📉" label="Bottom 20%" isOpen={isOpen} active={pathname === '/least-favored'} />
        <SidebarLink href="/list" icon="👀" label="Vote Records" isOpen={isOpen} active={pathname === '/list'} />
        <p className="px-4 text-[10px] font-black text-slate-400 uppercase mb-2">Admin Tags</p>
            <SidebarLink href="/admin" icon="📊" label="Admin Stats" isOpen={isOpen} active={pathname === '/admin'} />
            <SidebarLink href="/admin/users" icon="👥" label="Manage Users" isOpen={isOpen} active={pathname === '/admin/users'} />
            <SidebarLink href="/admin/images" icon="🖼️" label="Manage Images" isOpen={isOpen} active={pathname === '/admin/images'} />
            <SidebarLink href="/admin/captions" icon="📚" label="Manage Captions" isOpen={isOpen} active={pathname === '/admin/captions'} />
      </nav>

      {/* 底部退出 */}
      <div className="p-4 border-t border-slate-100">
        <Link
          href="/login"
          className="flex items-center gap-4 px-4 py-3 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
        >
          <span className="text-xl">🚪</span>
          {isOpen && <span className="font-medium">Logout</span>}
        </Link>
      </div>
    </aside>
  );
}

function SidebarLink({ href, icon, label, isOpen, active }: { href: string; icon: string; label: string; isOpen: boolean; active: boolean }) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-4 px-4 py-3 rounded-xl transition-all active:scale-95 ${
        active
          ? 'bg-blue-50 text-blue-600'
          : 'text-slate-600 hover:bg-slate-50 hover:text-blue-500'
      }`}
    >
      <span className="text-xl">{icon}</span>
      {isOpen && <span className="font-medium whitespace-nowrap animate-in slide-in-from-left-2">{label}</span>}
    </Link>
  );
}