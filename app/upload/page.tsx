'use client';

import { useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import Link from 'next/link';

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null); // 控制预览展示

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const handleProcess = async () => {
    if (!file) return;
    setLoading(true);
    setStatus('Starting...');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error("Please login first.");

      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      // Step 1 & 2 & 3 & 4 (保持之前的逻辑不变)
      const s1Res = await fetch('https://api.almostcrackd.ai/pipeline/generate-presigned-url', {
        method: 'POST', headers, body: JSON.stringify({ contentType: file.type })
      });
      const { presignedUrl, cdnUrl } = await s1Res.json();

      await fetch(presignedUrl, { method: "PUT", headers: { "Content-Type": file.type }, body: file });

      const s3Res = await fetch('https://api.almostcrackd.ai/pipeline/upload-image-from-url', {
        method: 'POST', headers, body: JSON.stringify({ imageUrl: cdnUrl, isCommonUse: false })
      });
      const { imageId } = await s3Res.json();

      await fetch('https://api.almostcrackd.ai/pipeline/generate-captions', {
        method: 'POST', headers, body: JSON.stringify({ imageId })
      });

      // ✅ 处理成功：设置预览图并清空上传状态
      setPreviewUrl(cdnUrl);
      setStatus('Generation Complete!');
    } catch (err: any) {
      setStatus(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 按钮功能：重置页面
  const resetPage = () => {
    setFile(null);
    setPreviewUrl(null);
    setStatus('');
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6">
      {!previewUrl ? (
        /* --- 上传界面 --- */
        <div className="w-full max-w-md p-8 bg-white border border-slate-200 rounded-3xl shadow-xl">
          <h1 className="text-2xl font-bold mb-6 text-slate-800">Upload New Meme 📸</h1>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="mb-6 block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
          <button
            onClick={handleProcess}
            disabled={loading || !file}
            className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold disabled:bg-slate-200 transition-all active:scale-95 shadow-lg shadow-blue-200"
          >
            {loading ? 'Processing...' : 'Submit to Pipeline'}
          </button>
          {status && <p className="mt-4 text-center text-xs font-mono text-blue-500 animate-pulse">{status}</p>}
          <Link href="/main" className="block mt-8 text-center text-xs text-slate-400 hover:text-slate-600 underline">Back to Dashboard</Link>
        </div>
      ) : (
        /* --- 预览界面 (结束后展示) --- */
        <div className="w-full max-w-md p-8 bg-white border border-slate-200 rounded-3xl shadow-2xl animate-in fade-in zoom-in duration-300">
          <h2 className="text-xl font-bold mb-4 text-center text-slate-800">Preview Result</h2>
          <div className="rounded-2xl overflow-hidden mb-6 border border-slate-100 shadow-inner">
            <img src={previewUrl} alt="Preview" className="w-full h-auto object-cover" />
          </div>

          <div className="flex flex-col gap-3">
            <Link
              href="/"
              className="w-full bg-emerald-500 text-white py-3 rounded-xl font-bold text-center hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-100"
            >
              确认，加入现存的 meme
            </Link>
            <button
              onClick={resetPage}
              className="w-full bg-slate-100 text-slate-600 py-3 rounded-xl font-bold hover:bg-red-50 hover:text-red-600 transition-all"
            >
              删了 (Discard)
            </button>
          </div>
          <p className="mt-6 text-[10px] text-slate-300 text-center uppercase tracking-widest">Confirmation Step</p>
        </div>
      )}
    </div>
  );
}