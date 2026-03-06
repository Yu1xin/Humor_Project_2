'use client';

import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';

export default function AdminCaptionsPage() {
  const [captions, setCaptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    async function fetchCaptions() {
      const { data, error } = await supabase
        .from('captions')
        .select('*')
        .order('created_datetime_utc', { ascending: false });

      if (error) {
        console.error("Fetch error:", error.message);
      } else {
        setCaptions(data || []);
      }
      setLoading(false);
    }
    fetchCaptions();
  }, [supabase]);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure to delete this caption？")) return;

    // 💡 这里的过滤条件使用你确认的列名 'id'
    const { error } = await supabase
      .from('captions')
      .delete()
      .eq('id', id);

    if (error) {
      alert("failed to delete: " + error.message);
    } else {
      setCaptions(captions.filter(c => c.id !== id));
    }
  };

  if (loading) return <div className="p-10 ml-64 font-mono">loading...</div>;

  return (
    <div className="p-10 ml-64 bg-slate-50 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-black text-slate-900 mb-8 flex items-center gap-3">
          <span className="bg-orange-500 text-white p-2 rounded-lg text-xl">📝</span>
          Captions Management
        </h1>

        <div className="grid gap-4">
          {captions.length === 0 ? (
            <div className="bg-white p-12 rounded-3xl border-2 border-dashed border-slate-200 text-center">
              <p className="text-slate-400 font-medium">No caption data for now...</p>
            </div>
          ) : (
            captions.map((c) => (
              <div key={c.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex justify-between items-center hover:shadow-md transition-shadow">
                <div className="flex-1 pr-6">
                  {/* 💡 使用你确认的列名 'content' */}
                  <p className="text-slate-800 text-lg font-medium italic mb-2">
                    "{c.content}"
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-1 rounded uppercase font-mono">
                      ID: {c.id.substring(0, 8)}
                    </span>
                    <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-1 rounded uppercase font-mono">
                      User: {c.profile_id?.substring(0, 8)}
                    </span>
                    <span className="text-[10px] bg-emerald-50 text-emerald-600 px-2 py-1 rounded font-bold">
                      {c.is_public ? 'PUBLIC' : 'PRIVATE'}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(c.id)}
                  className="px-4 py-2 bg-red-50 text-red-600 rounded-xl text-xs font-black hover:bg-red-600 hover:text-white transition-all"
                >
                  DELETE
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}