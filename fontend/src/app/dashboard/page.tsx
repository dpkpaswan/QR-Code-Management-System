'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import StatCard from './components/StatCard';
import DayControlPanel from './components/DayControlPanel';
import AttendanceProgress from './components/AttendanceProgress';
import RecentActivityFeed from './components/RecentActivityFeed';
import { api } from '@/lib/api';

interface EventDay {
  id: number;
  label: string;
  event_date: string;
  is_active: boolean;
}

interface Stats {
  totalParticipants: number;
  emailsSent: number;
  day1Entries: number;
  day2Entries: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [days, setDays] = useState<EventDay[]>([]);
  const [statsLoading, setStatsLoading] = useState(true);
  const [daysLoading, setDaysLoading] = useState(true);
  const [statsError, setStatsError] = useState('');

  const fetchStats = async () => {
    setStatsError('');
    try {
      const res = await api.getStats();
      if (!res.ok) throw new Error('Failed to load stats');
      const data = await res.json();
      setStats(data);
    } catch (e: unknown) {
      setStatsError(e instanceof Error ? e.message : 'Failed to load stats');
    } finally {
      setStatsLoading(false);
    }
  };

  const fetchDays = async () => {
    try {
      const res = await api.getEventDays();
      const data = await res.json();
      setDays(data || []);
    } finally {
      setDaysLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchDays();
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleDayUpdate = () => {
    fetchDays();
    fetchStats();
  };

  const statCards = [
    {
      title: 'Total Participants',
      value: stats?.totalParticipants ?? null,
      icon: 'Users',
      color: '#3B82F6',
      glowColor: '#06B6D4',
    },
    {
      title: 'Emails Sent',
      value: stats?.emailsSent ?? null,
      icon: 'Mail',
      color: '#10B981',
      glowColor: '#10B981',
      subtitle: stats
        ? `${(stats.totalParticipants || 0) - (stats.emailsSent || 0)} pending`
        : undefined,
    },
    {
      title: 'Day 1 Entries',
      value: stats?.day1Entries ?? null,
      icon: 'Calendar',
      color: '#8B5CF6',
      glowColor: '#8B5CF6',
    },
    {
      title: 'Day 2 Entries',
      value: stats?.day2Entries ?? null,
      icon: 'CalendarCheck',
      color: '#F59E0B',
      glowColor: '#F59E0B',
    },
  ];

  return (
    <DashboardLayout>
      <div className="p-4 lg:p-8">
        {/* Header */}
        <div className="mb-8">
          <h1
            className="text-xl lg:text-2xl font-bold text-white mb-1"
            style={{ fontFamily: 'Space Grotesk, sans-serif' }}
          >
            Dashboard
          </h1>
          <p className="text-sm" style={{ color: '#475569' }}>
            Live event statistics and controls
          </p>
        </div>
        {/* Quick Scanner CTA for coordinators */}
        <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <a
            href="/scanner"
            className="px-4 py-3 rounded-xl font-semibold text-sm text-white"
            style={{
              background: 'linear-gradient(90deg,#3B82F6,#06B6D4)',
              boxShadow: '0 8px 30px rgba(59,130,246,0.18)',
              fontFamily: 'Space Grotesk, sans-serif',
            }}
          >
            Open Scanner
          </a>
          <p className="text-xs hidden sm:block" style={{ color: '#94A3B8' }}>
            Quick access for gate coordinators — opens the mobile-friendly scanner
          </p>
        </div>

        {statsError && (
          <div
            className="mb-6 flex items-center gap-3 px-4 py-3 rounded-xl"
            style={{
              background: 'rgba(244,63,94,0.1)',
              border: '1px solid rgba(244,63,94,0.3)',
            }}
          >
            <span className="text-sm text-rose-400">{statsError}</span>
            <button
              onClick={fetchStats}
              className="ml-auto text-xs px-3 py-1 rounded-lg text-white btn-glow"
            >
              Retry
            </button>
          </div>
        )}

        {/* Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
          {statCards.map((card) => (
            <StatCard key={card.title} {...card} loading={statsLoading} />
          ))}
        </div>

        {/* Middle Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <DayControlPanel days={days} loading={daysLoading} onUpdate={handleDayUpdate} />
          <AttendanceProgress
            day1={stats?.day1Entries ?? 0}
            day2={stats?.day2Entries ?? 0}
            total={stats?.totalParticipants ?? 0}
            loading={statsLoading}
          />
        </div>

        {/* Recent Activity */}
        <RecentActivityFeed />
      </div>
    </DashboardLayout>
  );
}