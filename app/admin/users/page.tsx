'use client';

import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';

export default function ManageUsersPage() {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    async function fetchProfiles() {
      // 满足作业要求：READ users/profiles
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_datetime_utc', { ascending: false });

      if (!error) {
        setProfiles(data || []);
      }
      setLoading(false);
    }
    fetchProfiles();
  }, [supabase]);

  if (loading) return <div className="p-10 font-mono">Loading user database...</div>;

  return (
    <div className="p-8 bg-slate-50 min-h-screen">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-black text-slate-900 mb-8 flex items-center gap-3">
          <span className="bg-blue-600 text-white p-2 rounded-lg text-xl">👥</span>
          User Management
        </h1>

        <div className="bg-white rounded-[2rem] shadow-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Profile ID</th>
                <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Email</th>
                <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Joined At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {profiles.map((user) => (
                <tr key={user.id} className="hover:bg-blue-50/50 transition-colors">
                  <td className="px-6 py-4 font-mono text-[10px] text-slate-400">{user.id}</td>
                  <td className="px-6 py-4">
                    <span className="font-bold text-slate-700">{user.email}</span>
                  </td>
                  <td className="px-6 py-4">
                    {user.is_superadmin ? (
                      <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-black border border-blue-200">
                        SUPERADMIN
                      </span>
                    ) : (
                      <span className="text-slate-400 text-xs font-bold px-3 py-1 bg-slate-100 rounded-full">
                        USER
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500">
                    {user.created_datetime_utc ? new Date(user.created_datetime_utc).toLocaleDateString() : 'N/A'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 满足有趣统计的小注脚 */}
        <p className="mt-6 text-center text-slate-400 text-xs font-medium italic">
          Total recognized citizens in the Meme Empire: {profiles.length}
        </p>
      </div>
    </div>
  );
}