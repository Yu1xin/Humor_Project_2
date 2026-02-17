'use client'
import { createBrowserClient } from '@supabase/ssr'

export default function LoginPage() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const handleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        // 必须严格匹配作业要求的回调路径
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
      <div className="p-8 bg-white shadow-xl rounded-2xl text-center">
        <h1 className="text-3xl font-bold text-blue-600 mb-6">🦁 Columbia Auth</h1>
        <p className="mb-8 text-gray-600">Login with Google Account to Check the contents</p>
        <button
          onClick={handleLogin}
          className="bg-black text-white px-6 py-3 rounded-lg font-medium hover:bg-gray-800 transition"
        >
          Login with Google
        </button>
      </div>
    </div>
  )
}