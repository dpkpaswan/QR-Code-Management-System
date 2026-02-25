'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase, Participant } from '@/lib/supabase';
import Icon from '@/components/ui/AppIcon';
import Link from 'next/link';

type EmailFilter = 'all' | 'sent' | 'pending';
type AttendanceFilter = 'all' | 'day1' | 'day2' | 'both' | 'none';

interface ParticipantWithAttendance extends Participant {
  day1_attended?: boolean;
  day2_attended?: boolean;
}

const PAGE_SIZE = 25;

export default function ParticipantsTable() {
  const [participants, setParticipants] = useState<ParticipantWithAttendance[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [emailFilter, setEmailFilter] = useState<EmailFilter>('all');
  const [attendanceFilter, setAttendanceFilter] = useState<AttendanceFilter>('all');
  const [resendingId, setResendingId] = useState<string | null>(null);

  const totalPages = useMemo(() => Math.ceil(total / PAGE_SIZE), [total]);

  /* ================= FETCH DATA ================= */
  const fetchParticipants = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      let query = supabase
        .from('participants')
        .select('*', { count: 'exact' });

      if (search) {
        query = query.or(
          `name.ilike.%${search}%,participant_id.ilike.%${search}%,college_name.ilike.%${search}%,email.ilike.%${search}%`
        );
      }

      if (emailFilter === 'sent') query = query.eq('email_sent', true);
      if (emailFilter === 'pending') query = query.eq('email_sent', false);

      const { data, count, error: err } = await query
        .order('created_at', { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (err) throw err;

      const ids = (data || []).map(p => p.participant_id);

      let day1Set = new Set<string>();
      let day2Set = new Set<string>();

      if (ids.length > 0) {
        const [d1, d2] = await Promise.all([
          supabase.from('entries').select('participant_id').eq('event_day', 1).in('participant_id', ids),
          supabase.from('entries').select('participant_id').eq('event_day', 2).in('participant_id', ids),
        ]);

        day1Set = new Set((d1.data || []).map(e => e.participant_id));
        day2Set = new Set((d2.data || []).map(e => e.participant_id));
      }

      let enriched = (data || []).map(p => ({
        ...p,
        day1_attended: day1Set.has(p.participant_id),
        day2_attended: day2Set.has(p.participant_id),
      }));

      // Attendance Filter (frontend filtering for stability)
      if (attendanceFilter !== 'all') {
        enriched = enriched.filter(p => {
          if (attendanceFilter === 'day1') return p.day1_attended;
          if (attendanceFilter === 'day2') return p.day2_attended;
          if (attendanceFilter === 'both') return p.day1_attended && p.day2_attended;
          if (attendanceFilter === 'none') return !p.day1_attended && !p.day2_attended;
          return true;
        });
      }

      setParticipants(enriched);
      setTotal(count ?? 0);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load participants');
    } finally {
      setLoading(false);
    }
  }, [search, emailFilter, attendanceFilter, page]);

  useEffect(() => {
    const t = setTimeout(fetchParticipants, 300);
    return () => clearTimeout(t);
  }, [fetchParticipants]);

  /* ================= RESEND ================= */
  const handleResend = async (participantId: string) => {
    setResendingId(participantId);
    try {
      await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participant_id: participantId }),
      });
      fetchParticipants();
    } finally {
      setResendingId(null);
    }
  };

  /* ================= RENDER ================= */
  return (
    <div className="space-y-6">

      {/* SEARCH */}
      <div className="flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Search participants..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          className="px-4 py-2 rounded-lg text-sm w-64 bg-slate-900 border border-slate-700"
        />
      </div>

      {/* TABLE */}
      <div className="rounded-xl overflow-hidden border border-slate-800">
        {error ? (
          <div className="p-8 text-center text-red-400">{error}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-900 text-slate-400">
                <tr>
                  <th className="p-3 text-left">ID</th>
                  <th className="p-3 text-left">Name</th>
                  <th className="p-3 text-left">College</th>
                  <th className="p-3 text-left">Email</th>
                  <th className="p-3 text-center">Day 1</th>
                  <th className="p-3 text-center">Day 2</th>
                  <th className="p-3 text-center">Action</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-slate-500">
                      Loading...
                    </td>
                  </tr>
                ) : participants.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-slate-500">
                      No participants found
                    </td>
                  </tr>
                ) : (
                  participants.map(p => (
                    <tr key={p.id} className="border-t border-slate-800">
                      <td className="p-3 font-mono text-blue-400">{p.participant_id}</td>
                      <td className="p-3">{p.name}</td>
                      <td className="p-3">{p.college_name || '—'}</td>
                      <td className="p-3 text-xs">{p.email || '—'}</td>
                      <td className="p-3 text-center">
                        {p.day1_attended ? '✓' : '—'}
                      </td>
                      <td className="p-3 text-center">
                        {p.day2_attended ? '✓' : '—'}
                      </td>
                      <td className="p-3 text-center">
                        <button
                          onClick={() => handleResend(p.participant_id)}
                          disabled={resendingId === p.participant_id}
                          className="px-3 py-1 rounded bg-blue-600 text-white text-xs disabled:opacity-50"
                        >
                          {resendingId === p.participant_id ? 'Sending...' : 'Resend'}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* PAGINATION */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center text-sm text-slate-400">
          <span>Page {page + 1} of {totalPages}</span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-3 py-1 bg-slate-800 rounded disabled:opacity-30"
            >
              Prev
            </button>
            <button
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="px-3 py-1 bg-slate-800 rounded disabled:opacity-30"
            >
              Next
            </button>
          </div>
        </div>
      )}

    </div>
  );
}