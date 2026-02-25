'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { QrCode } from 'lucide-react';
import { api } from '@/lib/api';
import { supabase, Entry } from '@/lib/supabase';
import { isLoggedIn, getDisplayName, getUserRole, getDefaultPage } from '@/lib/auth';
import ScannerCamera from './components/ScannerCamera';
import ScannerFeed from './components/ScannerFeed';

interface EventDay {
  id: number;
  label: string;
  event_date: string;
  is_active: boolean;
}

export default function ScannerPage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const displayName = getDisplayName();
  const [coordinatorName, setCoordinatorName] = useState(displayName || '');
  const [activeDay, setActiveDay] = useState<EventDay | null | undefined>(undefined);
  const [feedRefresh, setFeedRefresh] = useState(0);

  useEffect(() => {
    // Require login for scanner
    if (!isLoggedIn()) {
      router.push('/login');
      return;
    }

    const role = getUserRole();
    if (role && !['admin', 'registration'].includes(role)) {
      router.push(getDefaultPage(role));
      return;
    }

    setAuthorized(true);
  }, [router]);

  const fetchActiveDay = async () => {
    try {
      const res = await api.getEventDays();
      const data = await res.json();
      const active = (data || []).find((d: EventDay) => d.is_active);
      setActiveDay(active || null);
    } catch {
      setActiveDay(null);
    }
  };

  useEffect(() => {
    fetchActiveDay();
    const interval = setInterval(fetchActiveDay, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleNewEntry = () => {
    setFeedRefresh((prev) => prev + 1);
  };

  if (!authorized) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0A0A0F' }}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm" style={{ color: '#475569' }}>Verifying access...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: '#0A0A0F' }}>
      <div className="mesh-bg" />
      <div className="grid-pattern" />
      <div className="relative z-10 max-w-md mx-auto px-3 sm:px-4 py-4 sm:py-6 pb-16 sm:pb-10" style={{ paddingBottom: 'env(safe-area-inset-bottom, 16px)' }}>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <QrCode size={20} style={{ color: '#3B82F6' }} />
            <h1
              className="text-lg font-bold text-white"
              style={{ fontFamily: 'Space Grotesk, sans-serif' }}
            >
              QR Scanner
            </h1>
          </div>
          {getUserRole() === 'admin' && (
            <a
              href="/dashboard"
              className="text-xs px-3 py-1.5 rounded-lg"
              style={{
                background: 'rgba(59,130,246,0.1)',
                color: '#3B82F6',
                border: '1px solid rgba(59,130,246,0.2)',
              }}
            >
              Dashboard
            </a>
          )}
        </div>

        {/* Active Day Banner */}
        {activeDay === undefined ? (
          <div className="skeleton h-10 rounded-xl mb-4" />
        ) : activeDay ? (
          <div
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl mb-4 pulse-glow-green"
            style={{
              background: 'rgba(16,185,129,0.1)',
              border: '1px solid rgba(16,185,129,0.3)',
            }}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" />
            <span className="text-sm font-semibold" style={{ color: '#10B981' }}>
              🟢 {activeDay.label} — ACTIVE
            </span>
            <span className="ml-auto text-xs" style={{ color: '#065f46' }}>
              {new Date(activeDay.event_date).toLocaleDateString('en-US', {
                day: 'numeric',
                month: 'short',
              })}
            </span>
          </div>
        ) : (
          <div
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl mb-4"
            style={{
              background: 'rgba(244,63,94,0.1)',
              border: '1px solid rgba(244,63,94,0.3)',
            }}
          >
            <span className="w-2 h-2 rounded-full bg-rose-400 flex-shrink-0" />
            <span className="text-sm font-semibold" style={{ color: '#F43F5E' }}>
              🔴 NO ACTIVE DAY — Contact Admin
            </span>
          </div>
        )}

        {/* Coordinator Name */}
        <div className="glass-card p-4 rounded-xl mb-4">
          <label
            className="block text-xs font-semibold mb-2 uppercase tracking-widest"
            style={{ color: '#475569' }}
          >
            Coordinator Name
          </label>
          <input
            type="text"
            value={coordinatorName}
            onChange={(e) => setCoordinatorName(e.target.value)}
            placeholder="Enter your name (required for scanning)"
            className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
            style={{
              background: 'rgba(15,15,30,0.8)',
              border: coordinatorName
                ? '1px solid rgba(16,185,129,0.4)'
                : '1px solid rgba(59,130,246,0.2)',
              color: '#F1F5F9',
              fontFamily: 'DM Sans, sans-serif',
              fontSize: '16px',
            }}
          />
          {displayName && (
            <p className="text-xs mt-1.5" style={{ color: '#334155' }}>
              Auto-filled from your login profile
            </p>
          )}
        </div>

        {/* Camera Scanner */}
        <div className="glass-card p-3 rounded-2xl mb-4">
          <ScannerCamera coordinatorName={coordinatorName} onNewEntry={handleNewEntry} />
        </div>

        {/* Live Feed */}
        <ScannerFeed refreshTrigger={feedRefresh} />
      </div>
    </div>
  );
}