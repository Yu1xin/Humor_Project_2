'use client';
import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';

// 🔍 确保这里有 "export default"
export default function AdminImagesPage() {
  const [images, setImages] = useState<any[]>([]);
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    async function getImages() {
      const { data } = await supabase.from('images').select('*');
      setImages(data || []);
    }
    getImages();
  }, []);

  const deleteImage = async (id: string) => {
    const confirmDelete = confirm("Are you sure you want to delete this image?");
    if (!confirmDelete) return;

    const { error } = await supabase.from('images').delete().eq('id', id);
    if (error) {
      alert(error.message);
    } else {
      setImages(images.filter(img => img.id !== id)); // 局部更新 UI
      alert("Deleted successfully!");
    }
  };

  return (
    <div className="p-10">
      <h2 className="text-2xl font-bold mb-6 text-slate-800">Manage Images 🖼️</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {images.map(img => (
          <div key={img.id} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 relative group">
            <img src={img.url} className="w-full h-32 object-cover rounded-lg mb-4" alt="Meme" />
            <button
              onClick={() => deleteImage(img.id)}
              className="w-full bg-red-50 text-red-600 py-2 rounded-xl font-bold hover:bg-red-600 hover:text-white transition-all text-sm"
            >
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}