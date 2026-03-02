'use client';

import { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar'; // 确保路径正确

export default function VoteGallery() {
  const [memes, setMemes] = useState<any[]>([]);
  const [votedIds, setVotedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  // ... 你的 Fetch 数据逻辑保持不变 ...

  // 💡 核心计算逻辑
  const total = memes.length;
  const currentCount = votedIds.size;
  const progressPercentage = total > 0 ? (currentCount / total) * 100 : 0;

  // 模拟投票后的回调函数（假设你的 VotingGroup 组件会通知父组件投票完成）
  const handleVoteSuccess = (captionId: string) => {
    setVotedIds(prev => new Set(prev).add(captionId));
  };

  return (
    <div className="flex">
      {/* 1. 顶部进度条 (Stick on Top) */}
      <div className="fixed top-0 left-20 right-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-100 px-8 py-4 shadow-sm transition-all">
        <div className="max-w-4xl mx-auto flex items-center gap-6">
          {/* 数字显示 */}
          <div className="flex-shrink-0">
            <span className="text-sm font-bold text-slate-400 uppercase tracking-widest">Progress</span>
            <div className="text-2xl font-black text-blue-600">
              {currentCount} <span className="text-slate-300 text-lg">/ {total}</span>
            </div>
          </div>

          {/* 进度条槽 */}
          <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
            {/* 实际进度颜色条 */}
            <div
              className="h-full bg-blue-500 transition-all duration-500 ease-out shadow-[0_0_10px_rgba(59,130,246,0.5)]"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>

          {/* 百分比提示 */}
          <div className="hidden sm:block text-right">
            <span className="text-sm font-bold text-blue-500">{Math.round(progressPercentage)}%</span>
          </div>
        </div>
      </div>

      {/* 2. 页面主体内容 (加一个 mt-24 避开顶部的 Bar) */}
      <main className="flex-1 mt-24 p-8">
        <div className="max-w-4xl mx-auto grid gap-12">
          {memes.map((item, index) => (
            <div key={item.id} className="relative group">
              {/* 💡 每个 Meme 左上角的编号标签 */}
              <div className="absolute -left-4 -top-4 w-10 h-10 bg-black text-white rounded-full flex items-center justify-center font-bold shadow-xl z-10 group-hover:scale-110 transition-transform">
                {index + 1}
              </div>

              {/* 你的 VotingGroup 组件 */}
              {/* 注意：你需要给它传一个 onVote 逻辑来更新进度 */}
              {/* <VotingGroup data={item} onVote={() => handleVoteSuccess(item.id)} /> */}
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}