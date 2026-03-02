// app/layout.tsx
import './globals.css';
import Link from 'next/link';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="flex min-h-screen bg-slate-50">
        {/* 🚀 全局侧边栏 */}
        <aside className="w-64 bg-white border-r border-slate-200 flex flex-col p-6 sticky top-0 h-screen">
          <div className="text-2xl font-black text-blue-600 mb-10 px-2">
            MemeLab
          </div>

          <nav className="flex flex-col gap-2 flex-1">
            <SidebarLink href="/main" label="🏠 Dashboard" />
            <SidebarLink href="/" label="🖼️ Vote Gallery" />
            <SidebarLink href="/upload" label="📸 Upload Meme" />
            <SidebarLink href="/least-favored" label="📉 Bottom 20%" />
            <SidebarLink href="/list" label="📋 Vote Records" />
          </nav>

          <div className="pt-6 border-t border-slate-100">
            <Link href="/login" className="text-sm text-slate-400 hover:text-red-500 transition-colors px-2">
              Logout
            </Link>
          </div>
        </aside>

        {/* 主内容区域 */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </body>
    </html>
  );
}

// 辅助组件：让代码更整洁
function SidebarLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="px-4 py-3 rounded-xl text-slate-600 hover:bg-blue-50 hover:text-blue-600 font-medium transition-all active:scale-95"
    >
      {label}
    </Link>
  );
}
