'use client';

import { useEffect, useState } from 'react';
import * as LucideIcons from 'lucide-react';

interface StatCardProps {
  title: string;
  value: number | null;
  icon: string;
  color: string;
  glowColor: string;
  loading: boolean;
  subtitle?: string;
}

function useCountUp(target: number | null, duration = 1200) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (target === null) return;
    if (target === 0) {
      setCount(0);
      return;
    }
    const start = Date.now();
    const tick = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * target));
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [target, duration]);

  return count;
}

export default function StatCard({
  title,
  value,
  icon,
  color,
  glowColor,
  loading,
  subtitle,
}: StatCardProps) {
  const displayValue = useCountUp(value);
  const IconComponent = (LucideIcons as Record<string, React.ComponentType<LucideIcons.LucideProps>>)[icon];

  if (loading) {
    return (
      <div className="glass-card p-6 rounded-2xl">
        <div className="flex items-start justify-between mb-4">
          <div className="skeleton w-10 h-10 rounded-xl" />
          <div className="skeleton w-16 h-4 rounded" />
        </div>
        <div className="skeleton w-20 h-8 rounded mb-2" />
        <div className="skeleton w-32 h-3 rounded" />
      </div>
    );
  }

  return (
    <div
      className="glass-card p-6 rounded-2xl transition-all duration-300 hover:scale-[1.02] group"
      style={{ boxShadow: '0 0 0 1px rgba(59,130,246,0.1)' }}
    >
      <div className="flex items-start justify-between mb-4">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center transition-all group-hover:scale-110"
          style={{
            background: `${glowColor}15`,
            border: `1px solid ${glowColor}30`,
          }}
        >
          {IconComponent && <IconComponent size={20} style={{ color }} />}
        </div>
      </div>
      <div className="count-up">
        <p
          className="text-3xl font-bold mb-1"
          style={{ fontFamily: 'Space Grotesk, sans-serif', color }}
        >
          {displayValue.toLocaleString()}
        </p>
        <p className="text-sm font-medium" style={{ color: '#94A3B8' }}>
          {title}
        </p>
        {subtitle && (
          <p className="text-xs mt-1" style={{ color: '#475569' }}>
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}