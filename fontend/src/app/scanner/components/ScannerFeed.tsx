'use client';

import { useEffect, useState } from 'react';
import { supabase, Entry, EventDay } from '@/lib/supabase';
import Icon from '@/components/ui/AppIcon';

interface Props {
  refreshTrigger: number;
}

export default function ScannerFeed({ refreshTrigger }: Props) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [activeDay, setActiveDay] = useState<EventDay | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchActiveDay = async () => {
    const { data } = await supabase.from('event_days').select('*').eq('is_active', true).limit(1);
    return data?.[0] ?? null;
  };

  const fetchEntries = async (day: EventDay | null) => {
    if (!day) { setEntries([]); setLoading(false); return; }
    const { data } = await supabase
      .from('entries')
      .select('*')
      .eq('event_day', day.id)
      .order('scanned_at', { ascending: false })
      .limit(15);
    setEntries(data || []);
    setLoading(false);
  };

  useEffect(() => {
    const init = async () => {
      const day = await fetchActiveDay();
      setActiveDay(day);
      await fetchEntries(day);
    };
    init();
  }, [refreshTrigger]);

  useEffect(() => {
    const channel = supabase
      .channel('scanner-entries-feed')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'entries' }, (payload) => {
        setEntries(prev => [payload.new as Entry, ...prev].slice(0, 15));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(10,10,20,0.8)', border: '1px solid rgba(59,130,246,0.1)' }}>
      <div className="px-4 py-3 flex items-center justify-between border-b" style={{ borderColor: 'rgba(59,130,246,0.1)' }}>
        <h3 className="font-semibold text-sm text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
          Today's Entries
        </h3>
        {activeDay && (
          <span className="text-xs px-2 py-0.5 rounded-full"
            style={{ background: 'rgba(16,185,129,0.1)', color: '#10B981', border: '1px solid rgba(16,185,129,0.2)' }}>
            {activeDay.label}
          </span>
        )}
      </div>

      {loading ? (
        <div className="p-4 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="skeleton h-12 rounded-lg" />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <div className="p-8 text-center">
          <Icon name="ScanLineIcon" size={32} className="mx-auto mb-2" style={{ color: '#1e3a5f' }} />
          <p className="text-sm font-medium mb-1" style={{ color: '#475569' }}>No entries yet today</p>
          <p className="text-xs" style={{ color: '#334155' }}>Scanned entries will appear here in real time</p>
        </div>
      ) : (
        <div className="divide-y" style={{ divideColor: 'rgba(255,255,255,0.03)' }}>
          {entries.map((entry, idx) => (
            <div key={entry.id} className={`px-4 py-3 ${idx === 0 ? 'slide-in-top' : ''}`}
              style={{ background: idx === 0 ? 'rgba(16,185,129,0.04)' : 'transparent' }}>
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate" style={{ color: '#F1F5F9' }}>{entry.name}</p>
                  <p className="text-xs truncate" style={{ color: '#475569' }}>{entry.college_name}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold"
                    style={{
                      background: entry.event_day === 1 ? 'rgba(59,130,246,0.15)' : 'rgba(139,92,246,0.15)',
                      color: entry.event_day === 1 ? '#3B82F6' : '#8B5CF6',
                    }}>
                    D{entry.event_day}
                  </span>
                  <span className="text-xs" style={{ color: '#334155', fontFamily: 'monospace' }}>
                    {formatTime(entry.scanned_at)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}