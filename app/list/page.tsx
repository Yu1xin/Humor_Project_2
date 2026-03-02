'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function ListPage() {
  const [data, setData] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // 下面是“中间变大”的效果需要的
  const cardRefs = useRef<(HTMLDivElement | null)[]>([])
  const [activeIndex, setActiveIndex] = useState(0)

  // ✅ fetch votes
  useEffect(() => {
    async function fetchVotes() {
      setLoading(true)
      const { data, error } = await supabase
        .from('caption_votes')
        .select('*')
        .order('id', { ascending: false })

      if (error) setError(error.message)
      else setData(data || [])

      setLoading(false)
    }
    fetchVotes()
  }, [])

  // ✅ scroll center highlight
  useEffect(() => {
    let ticking = false

    const updateActive = () => {
      ticking = false
      const centerY = window.innerHeight / 2

      let bestIndex = 0
      let bestDist = Number.POSITIVE_INFINITY

      cardRefs.current.forEach((el, idx) => {
        if (!el) return
        const rect = el.getBoundingClientRect()
        const elCenter = rect.top + rect.height / 2
        const dist = Math.abs(elCenter - centerY)
        if (dist < bestDist) {
          bestDist = dist
          bestIndex = idx
        }
      })

      setActiveIndex(bestIndex)
    }

    const onScroll = () => {
      if (ticking) return
      ticking = true
      requestAnimationFrame(updateActive)
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    onScroll()

    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [data.length])

  if (loading) return <div className="p-4">Loading…</div>
  if (error) return <div className="p-4 text-red-500">Error fetching data: {error}</div>

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <h1 className="text-2xl font-bold mb-6 text-black">Vote Records (Verification)</h1>

      {data.length === 0 ? (
        <p className="text-gray-500">No votes found in the database yet.</p>
      ) : (
        <div className="grid gap-4">
          {data.map((item: any, index: number) => {
            const isActive = index === activeIndex
            return (
              <div
                key={item.id}
                ref={(el) => { cardRefs.current[index] = el }}
                className="bg-white border border-gray-200 p-4 rounded-lg transition-all duration-300"
                style={{
                  transform: `scale(${isActive ? 1.02 : 0.94})`,
                  opacity: isActive ? 1 : 0.72,
                }}
              >
                <div className="flex justify-between items-center mb-2">
                  <span className="font-mono text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                    Vote ID: {item.id}
                  </span>
                  <span className={`font-bold ${item.vote_value > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    Value: {item.vote_value}
                  </span>
                </div>

                <div className="text-xs text-gray-500 space-y-1">
                  <p><strong>Profile ID (User):</strong> {item.profile_id}</p>
                  <p><strong>Caption ID:</strong> {item.caption_id}</p>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div className="mt-8">
        <a href="/" className="text-blue-600 hover:underline">← Back to Gallery</a>
      </div>
    </div>
  )
}