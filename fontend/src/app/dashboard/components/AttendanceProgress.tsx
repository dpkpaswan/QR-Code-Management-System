'use client';

import { useEffect, useRef } from 'react';

interface Props {
  day1: number;
  day2: number;
  total: number;
  loading: boolean;
}

function ProgressBar({ label, count, total, color, glowColor, loading }: {
  label: string; count: number; total: number; color: string; glowColor: string; loading: boolean;
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!loading && barRef.current) {
      barRef.current.style.setProperty('--target-width', `${pct}%`);
      barRef.current.style.width = '0%';
      setTimeout(() => {
        if (barRef.current) {
          barRef.current.style.transition = 'width 1.2s cubic-bezier(0.23, 1, 0.32, 1)';
          barRef.current.style.width = `${pct}%`;
        }
      }, 100);
    }
  }, [pct, loading]);

  if (loading) {
    return (
      <div className="space-y-2">
        <div className="flex justify-between">
          <div className="skeleton w-16 h-4 rounded" />
          <div className="skeleton w-12 h-4 rounded" />
        </div>
        <div className="skeleton w-full h-3 rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-sm font-medium" style={{ color: '#CBD5E1' }}>{label}</span>
        <span className="text-sm font-bold" style={{ color, fontFamily: 'Space Grotesk, sans-serif' }}>
          {count} / {total} <span className="text-xs font-normal opacity-70">({pct}%)</span>
        </span>
      </div>
      <div className="h-2.5 rounded-full overflow-hidden" style={{ background: 'rgba(30,30,60,0.8)' }}>
        <div ref={barRef} className="h-full rounded-full"
          style={{ background: `linear-gradient(90deg, ${color}, ${glowColor})`, boxShadow: `0 0 8px ${glowColor}60`, width: '0%' }} />
      </div>
    </div>
  );
}

export default function AttendanceProgress({ day1, day2, total, loading }: Props) {
  return (
    <div className="glass-card p-6 rounded-2xl">
      <h3 className="font-semibold text-white mb-6" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
        Attendance Progress
      </h3>
      <div className="space-y-6">
        <ProgressBar label="Day 1 Attendance" count={day1} total={total} color="#3B82F6" glowColor="#06B6D4" loading={loading} />
        <ProgressBar label="Day 2 Attendance" count={day2} total={total} color="#8B5CF6" glowColor="#06B6D4" loading={loading} />
      </div>
    </div>
  );
}