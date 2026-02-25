'use client';

import { useState } from 'react';
import { PowerOff } from 'lucide-react';
import { api } from '@/lib/api';

interface EventDay {
  id: number;
  label: string;
  event_date: string;
  is_active: boolean;
}

interface Props {
  days: EventDay[];
  loading: boolean;
  onUpdate: () => void;
}

export default function DayControlPanel({ days, loading, onUpdate }: Props) {
  const [activating, setActivating] = useState<number | null>(null);
  const [deactivatingAll, setDeactivatingAll] = useState(false);

  const activateDay = async (dayId: number) => {
    setActivating(dayId);
    try {
      const res = await api.activateDay(dayId);
      if (res.ok) onUpdate();
    } finally {
      setActivating(null);
    }
  };

  const deactivateAll = async () => {
    setDeactivatingAll(true);
    try {
      const res = await api.deactivateAll();
      if (res.ok) onUpdate();
    } finally {
      setDeactivatingAll(false);
    }
  };

  if (loading) {
    return (
      <div className="glass-card p-6 rounded-2xl">
        <div className="skeleton w-40 h-5 rounded mb-6" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[0, 1].map((i) => (
            <div
              key={i}
              className="rounded-xl p-5"
              style={{
                background: 'rgba(15,15,30,0.5)',
                border: '1px solid rgba(59,130,246,0.1)',
              }}
            >
              <div className="skeleton w-32 h-4 rounded mb-3" />
              <div className="skeleton w-24 h-3 rounded mb-4" />
              <div className="skeleton w-full h-9 rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card p-6 rounded-2xl">
      <div className="flex items-center justify-between mb-6">
        <h3
          className="font-semibold text-white"
          style={{ fontFamily: 'Space Grotesk, sans-serif' }}
        >
          Day Control Panel
        </h3>
        <button
          onClick={deactivateAll}
          disabled={deactivatingAll || days.every((d) => !d.is_active)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          style={{
            background: 'rgba(244,63,94,0.1)',
            border: '1px solid rgba(244,63,94,0.3)',
            color: '#F43F5E',
          }}
        >
          {deactivatingAll ? (
            <span className="w-3 h-3 border border-rose-400 border-t-transparent rounded-full animate-spin" />
          ) : (
            <PowerOff size={14} />
          )}
          DEACTIVATE ALL
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {days.map((day) => (
          <div
            key={day.id}
            className="rounded-xl p-5 transition-all"
            style={{
              background: day.is_active ? 'rgba(16,185,129,0.06)' : 'rgba(15,15,30,0.5)',
              border: day.is_active
                ? '1px solid rgba(16,185,129,0.3)'
                : '1px solid rgba(59,130,246,0.1)',
            }}
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <p
                  className="font-semibold text-sm text-white mb-1"
                  style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                >
                  {day.label}
                </p>
                <p className="text-xs" style={{ color: '#475569' }}>
                  {new Date(day.event_date).toLocaleDateString('en-US', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </p>
              </div>
              {day.is_active ? (
                <span
                  className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold pulse-glow-green"
                  style={{
                    background: 'rgba(16,185,129,0.15)',
                    color: '#10B981',
                    border: '1px solid rgba(16,185,129,0.3)',
                  }}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  ACTIVE
                </span>
              ) : (
                <span
                  className="px-2 py-1 rounded-full text-xs font-bold"
                  style={{
                    background: 'rgba(71,85,105,0.2)',
                    color: '#475569',
                    border: '1px solid rgba(71,85,105,0.3)',
                  }}
                >
                  INACTIVE
                </span>
              )}
            </div>
            {day.is_active ? (
              <button
                onClick={() => deactivateAll()}
                disabled={deactivatingAll}
                className="w-full py-2 rounded-lg text-xs font-semibold transition-all disabled:opacity-50"
                style={{
                  background: 'rgba(244,63,94,0.1)',
                  border: '1px solid rgba(244,63,94,0.3)',
                  color: '#F43F5E',
                }}
              >
                DEACTIVATE
              </button>
            ) : (
              <button
                onClick={() => activateDay(day.id)}
                disabled={activating === day.id}
                className="w-full py-2 rounded-lg text-xs font-semibold btn-glow text-white transition-all disabled:opacity-50"
              >
                {activating === day.id ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
                    ACTIVATING...
                  </span>
                ) : (
                  'ACTIVATE'
                )}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}