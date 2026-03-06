'use client';
import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

  useEffect(() => {
    async function checkAdmin() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/login'); return; }

      const { data: profile } = await supabase
        .from('profiles')
        .select('is_superadmin')
        .eq('id', session.user.id)
        .single();

      if (!profile?.is_superadmin) {
        alert("你不是管理员！");
        router.push('/');
      } else {
        setIsAdmin(true);
      }
      setLoading(false);
    }
    checkAdmin();
  }, []);

  if (loading) return <div className="p-10">正在检查身份...</div>;
  return isAdmin ? <>{children}</> : null;
}