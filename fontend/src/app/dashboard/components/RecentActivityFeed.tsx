'use client';

import { useEffect, useState } from 'react';
import { supabase, Entry } from '@/lib/supabase';
import { Activity, AlertTriangle } from 'lucide-react';

export default function RecentActivityFeed() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchRecent = async () => {
    setError('');
    setLoading(true);
    try {
      const { data, error: err } = await supabase
        .from('entries')
        .select('*')
        .order('scanned_at', { ascending: false });

      if (err) {
        setError(err.message);
        setEntries([]);
      } else {
        setEntries(data || []);
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to load recent activity');
      setEntries([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecent();
    const channel = supabase
      .channel('dashboard-recent-entries')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'entries' }, (payload) => {
        setEntries((prev) => [payload.new as Entry, ...prev]);
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

  return (
    <div className="glass-card rounded-2xl overflow-hidden">
      <div
        className="px-6 py-4 flex items-center justify-between border-b"
        style={{ borderColor: 'rgba(59,130,246,0.1)' }}
      >
        <h3
          className="font-semibold text-white"
          style={{ fontFamily: 'Space Grotesk, sans-serif' }}
        >
          Recent Activity
        </h3>
        <div className="flex items-center gap-2">
          <span
            className="w-2 h-2 rounded-full bg-emerald-400"
            style={{ animation: 'pulseGlow 2s infinite' }}
          />
          <span className="text-xs" style={{ color: '#10B981' }}>
            LIVE
          </span>
        </div>
      </div>

      <div className="overflow-x-auto">
        {loading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex gap-4 items-center">
                <div className="skeleton w-32 h-4 rounded" />
                <div className="skeleton w-40 h-4 rounded" />
                <div className="skeleton w-16 h-5 rounded-full" />
                <div className="skeleton w-20 h-4 rounded" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="p-8 text-center">
            <AlertTriangle size={32} className="mx-auto mb-2 text-rose-400" />
            <p className="text-sm text-rose-400 mb-3">{error}</p>
            <button
              onClick={fetchRecent}
              className="text-xs px-4 py-2 rounded-lg btn-glow text-white"
            >
              Retry
            </button>
          </div>
        ) : entries.length === 0 ? (
          <div className="p-12 text-center">
            <Activity size={40} className="mx-auto mb-3" style={{ color: '#1e3a5f' }} />
            <p className="font-medium mb-1" style={{ color: '#475569' }}>
              No entries yet
            </p>
            <p className="text-xs" style={{ color: '#334155' }}>
              Activity will appear here in real time
            </p>
          </div>
        ) : (
          <table className="w-full data-table">
            <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>College</th>
                  <th>Day</th>
                  <th>Time</th>
                </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id} className="slide-in-top">
                  <td className="font-mono" style={{ color: '#3B82F6' }}>
                    {entry.participant_id || '—'}
                  </td>
                  <td className="font-medium" style={{ color: '#F1F5F9' }}>
                    {entry.name || '—'}
                  </td>
                  <td style={{ color: '#94A3B8', maxWidth: '200px' }}>
                    <span className="truncate block">{entry.college_name || '—'}</span>
                  </td>
                  <td>
                    <span
                      className="px-2 py-1 rounded-full text-xs font-bold"
                      style={{
                        background:
                          entry.event_day === 1
                            ? 'rgba(59,130,246,0.15)'
                            : 'rgba(139,92,246,0.15)',
                        color: entry.event_day === 1 ? '#3B82F6' : '#8B5CF6',
                        border: `1px solid ${entry.event_day === 1
                            ? 'rgba(59,130,246,0.3)'
                            : 'rgba(139,92,246,0.3)'
                          }`,
                      }}
                    >
                      Day {entry.event_day}
                    </span>
                  </td>
                  <td
                    style={{
                      color: '#475569',
                      fontFamily: 'JetBrains Mono, monospace',
                      fontSize: '11px',
                    }}
                  >
                    {formatTime(entry.scanned_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}