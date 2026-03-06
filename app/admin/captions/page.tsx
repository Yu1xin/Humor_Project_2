'use client';
import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';

export default function AdminCaptions() {
  const [captions, setCaptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    async function getCaptions() {
      // 💡 使用正确的排序列名：created_datetime_utc
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
    getCaptions();
  }, [supabase]);

  const deleteCaption = async (captionId: string) => {
    if (!confirm("确定要删除这条 Caption 吗？")) return;

    // 💡 这里的过滤条件使用你说的 caption_id
    const { error } = await supabase
      .from('captions')
      .delete()
      .eq('caption_id', captionId);

    if (!error) {
      setCaptions(captions.filter(c => c.caption_id !== captionId));
    } else {
      alert("删除失败: " + error.message);
    }
  };

  if (loading) return <div className="p-10 ml-64 font-mono">Loading captions...</div>;

  return (
    <div className="p-10 ml-64 bg-slate-50 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-3xl font-black text-slate-900 mb-8 flex items-center gap-3">
          <span className="bg-amber-500 text-white p-2 rounded-lg text-xl">📝</span>
          Manage Captions
        </h2>

        <div className="grid gap-4">
          {captions.length === 0 && (
            <div className="bg-white p-10 rounded-2xl border border-dashed border-slate-300 text-center text-slate-400 font-medium">
              No captions found in the database.
            </div>
          )}

          {captions.map((c) => (
            <div key={c.caption_id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex justify-between items-start hover:shadow-md transition-shadow">
              <div className="flex-1 pr-4">
                {/* 💡 这里使用你说的 content 列 */}
                <p className="text-slate-800 text-lg font-medium leading-relaxed italic">
                  "{c.content || "Empty content"}"
                </p>
                <div className="mt-3 flex flex-wrap gap-2 items-center">
                  <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-1 rounded font-mono uppercase">
                    ID: {c.caption_id.substring(0, 8)}...
                  </span>
                  <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-1 rounded font-mono uppercase">
                    User: {c.profile_id?.substring(0, 8)}
                  </span>
                  <span className="text-[10px] bg-purple-50 text-purple-600 px-2 py-1 rounded font-mono uppercase">
                    Img: {c.image_id?.substring(0, 8)}
                  </span>
                </div>
              </div>
              <button
                onClick={() => deleteCaption(c.caption_id)}
                className="bg-red-50 text-red-500 hover:bg-red-500 hover:text-white p-2 px-4 rounded-xl text-xs font-black transition-all"
              >
                DELETE
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}