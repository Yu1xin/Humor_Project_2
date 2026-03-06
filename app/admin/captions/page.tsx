'use client';
import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';

export default function AdminCaptions() {
  const [captions, setCaptions] = useState<any[]>([]);
  const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

  useEffect(() => {
    async function getCaptions() {
      const { data } = await supabase.from('captions').select('*').order('created_at', { ascending: false });
      setCaptions(data || []);
    }
    getCaptions();
  }, []);

  const deleteCaption = async (id: string) => {
    if (!confirm("Delete this AI caption?")) return;
    const { error } = await supabase.from('captions').delete().eq('id', id);
    if (!error) setCaptions(captions.filter(c => c.id !== id));
  };

  return (
    <div className="p-10 ml-64">
      <h2 className="text-2xl font-bold mb-6">Manage AI Captions 📝</h2>
      <div className="space-y-4">
        {captions.map(c => (
          <div key={c.id} className="bg-white p-4 rounded-xl shadow-sm border flex justify-between items-center">
            <div>
              <p className="text-slate-800 font-medium italic">"{c.content}"</p>
              <p className="text-xs text-slate-400 mt-1">ID: {c.id}</p>
            </div>
            <button onClick={() => deleteCaption(c.id)} className="text-red-500 hover:text-red-700 font-bold px-4">Delete</button>
          </div>
        ))}
      </div>
    </div>
  );
}