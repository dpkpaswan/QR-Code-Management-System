'use client';

import { useState, useEffect, useCallback } from 'react';
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
  const [resendMsg, setResendMsg] = useState<{ id: string; msg: string; ok: boolean } | null>(null);

  const fetchParticipants = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      let query = supabase.from('participants').select('*', { count: 'exact' });

      if (search) {
        query = query.or(`name.ilike.%${search}%,participant_id.ilike.%${search}%,college_name.ilike.%${search}%,email.ilike.%${search}%`);
      }
      if (emailFilter === 'sent') query = query.eq('email_sent', true);
      if (emailFilter === 'pending') query = query.eq('email_sent', false);

      if (attendanceFilter !== 'all') {
        const { data: d1 } = await supabase.from('entries').select('participant_id').eq('event_day', 1);
        const { data: d2 } = await supabase.from('entries').select('participant_id').eq('event_day', 2);
        const d1Ids = new Set((d1 || []).map(e => e.participant_id));
        const d2Ids = new Set((d2 || []).map(e => e.participant_id));

        if (attendanceFilter === 'day1') {
          const ids = [...d1Ids];
          query = query.in('participant_id', ids.length > 0 ? ids : ['__none__']);
        } else if (attendanceFilter === 'day2') {
          const ids = [...d2Ids];
          query = query.in('participant_id', ids.length > 0 ? ids : ['__none__']);
        } else if (attendanceFilter === 'both') {
          const both = [...d1Ids].filter(id => d2Ids.has(id));
          query = query.in('participant_id', both.length > 0 ? both : ['__none__']);
        } else if (attendanceFilter === 'none') {
          const attended = [...new Set([...d1Ids, ...d2Ids])];
          if (attended.length > 0) {
            query = query.not('participant_id', 'in', `(${attended.map(id => `"${id}"`).join(',')})`);
          }
        }
      }

      const { data, count, error: err } = await query
        .order('created_at', { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (err) throw err;

      const ids = (data || []).map(p => p.participant_id);
      if (ids.length > 0) {
        const [e1, e2] = await Promise.all([
          supabase.from('entries').select('participant_id').eq('event_day', 1).in('participant_id', ids),
          supabase.from('entries').select('participant_id').eq('event_day', 2).in('participant_id', ids),
        ]);
        const d1Set = new Set((e1.data || []).map(e => e.participant_id));
        const d2Set = new Set((e2.data || []).map(e => e.participant_id));

        setParticipants((data || []).map(p => ({
          ...p,
          day1_attended: d1Set.has(p.participant_id),
          day2_attended: d2Set.has(p.participant_id),
        })));
      } else {
        setParticipants([]);
      }

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

  const handleResend = async (participantId: string) => {
    setResendingId(participantId);
    try {
      const res = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participant_id: participantId }),
      });
      const data = await res.json();
      setResendMsg({ id: participantId, msg: data.success ? 'Sent!' : (data.error || 'Failed'), ok: data.success });
      setTimeout(() => setResendMsg(null), 3000);
      if (data.success) fetchParticipants();
    } finally {
      setResendingId(null);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).catch(() => {});
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="glass-card p-4 rounded-xl flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-48">
          <Icon name="SearchIcon" size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#475569' }} />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            placeholder="Search by name, ID, college, email..."
            className="w-full pl-9 pr-4 py-2.5 rounded-lg text-sm outline-none"
            style={{
              background: 'rgba(15,15,30,0.8)',
              border: '1px solid rgba(59,130,246,0.2)',
              color: '#F1F5F9',
              fontFamily: 'DM Sans, sans-serif',
            }}
          />
        </div>

        <div className="flex gap-2 flex-wrap">
          {(['all', 'sent', 'pending'] as EmailFilter[]).map(f => (
            <button key={f} onClick={() => { setEmailFilter(f); setPage(0); }}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={{
                background: emailFilter === f ? 'rgba(59,130,246,0.2)' : 'rgba(15,15,30,0.5)',
                border: emailFilter === f ? '1px solid rgba(59,130,246,0.4)' : '1px solid rgba(59,130,246,0.1)',
                color: emailFilter === f ? '#3B82F6' : '#475569',
              }}>
              {f === 'all' ? 'All Emails' : f === 'sent' ? '✅ Sent' : '⏳ Pending'}
            </button>
          ))}
        </div>

        <div className="flex gap-2 flex-wrap">
          {(['all', 'day1', 'day2', 'both', 'none'] as AttendanceFilter[]).map(f => (
            <button key={f} onClick={() => { setAttendanceFilter(f); setPage(0); }}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={{
                background: attendanceFilter === f ? 'rgba(16,185,129,0.15)' : 'rgba(15,15,30,0.5)',
                border: attendanceFilter === f ? '1px solid rgba(16,185,129,0.3)' : '1px solid rgba(59,130,246,0.1)',
                color: attendanceFilter === f ? '#10B981' : '#475569',
              }}>
              {f === 'all' ? 'All' : f === 'day1' ? 'Day 1' : f === 'day2' ? 'Day 2' : f === 'both' ? 'Both Days' : 'Not Attended'}
            </button>
          ))}
        </div>
      </div>

      {/* Count */}
      {!loading && (
        <p className="text-sm" style={{ color: '#475569' }}>
          Showing <span style={{ color: '#94A3B8', fontWeight: 600 }}>{participants.length}</span> of{' '}
          <span style={{ color: '#94A3B8', fontWeight: 600 }}>{total}</span> participants
        </p>
      )}

      {/* Table */}
      <div className="glass-card rounded-2xl overflow-hidden">
        {error ? (
          <div className="p-8 text-center">
            <Icon name="AlertTriangleIcon" size={32} className="mx-auto mb-2 text-rose-400" />
            <p className="text-sm text-rose-400 mb-3">{error}</p>
            <button onClick={fetchParticipants} className="text-xs px-4 py-2 rounded-lg btn-glow text-white">Retry</button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full data-table min-w-[900px]">
              <thead style={{ background: 'rgba(10,10,20,0.8)' }}>
                <tr>
                  <th>Participant ID</th>
                  <th>Name</th>
                  <th>College</th>
                  <th>Email</th>
                  <th>Email Status</th>
                  <th>Day 1</th>
                  <th>Day 2</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 8 }).map((_, j) => (
                        <td key={j}><div className="skeleton h-4 rounded" style={{ width: `${60 + Math.random() * 40}%` }} /></td>
                      ))}
                    </tr>
                  ))
                ) : participants.length === 0 ? (
                  <tr>
                    <td colSpan={8}>
                      <div className="py-16 text-center">
                        <Icon name="UsersIcon" size={40} className="mx-auto mb-3" style={{ color: '#1e3a5f' }} />
                        <p className="font-medium mb-1" style={{ color: '#475569' }}>No participants yet</p>
                        {search === '' && emailFilter === 'all' && attendanceFilter === 'all' ? (
                          <>
                            <p className="text-xs mb-4" style={{ color: '#334155' }}>Upload an Excel file to get started</p>
                            <Link href="/upload"
                              className="text-xs px-4 py-2 rounded-lg btn-glow text-white inline-block">
                              Go to Upload
                            </Link>
                          </>
                        ) : (
                          <p className="text-xs" style={{ color: '#334155' }}>No participants match your filters</p>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  participants.map((p) => (
                    <tr key={p.id}>
                      <td>
                        <button
                          onClick={() => copyToClipboard(p.participant_id)}
                          title="Click to copy"
                          className="flex items-center gap-1.5 group hover:opacity-80 transition-opacity"
                          style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', color: '#3B82F6' }}>
                          {p.participant_id}
                          <Icon name="CopyIcon" size={11} className="opacity-0 group-hover:opacity-60 transition-opacity" />
                        </button>
                      </td>
                      <td className="font-medium" style={{ color: '#F1F5F9' }}>{p.name}</td>
                      <td style={{ color: '#94A3B8', maxWidth: '160px' }}>
                        <span className="truncate block">{p.college_name || '—'}</span>
                      </td>
                      <td style={{ color: '#475569', fontSize: '12px' }}>{p.email || '—'}</td>
                      <td>
                        {p.email_sent ? (
                          <span className="px-2 py-1 rounded-full text-xs font-semibold"
                            style={{ background: 'rgba(16,185,129,0.1)', color: '#10B981', border: '1px solid rgba(16,185,129,0.2)' }}>
                            ✅ Sent
                          </span>
                        ) : (
                          <span className="px-2 py-1 rounded-full text-xs font-semibold"
                            style={{ background: 'rgba(245,158,11,0.1)', color: '#F59E0B', border: '1px solid rgba(245,158,11,0.2)' }}>
                            ⏳ Pending
                          </span>
                        )}
                      </td>
                      <td className="text-center">
                        {p.day1_attended
                          ? <span className="text-emerald-400 text-base font-bold">✓</span>
                          : <span style={{ color: '#1e3a5f' }}>—</span>}
                      </td>
                      <td className="text-center">
                        {p.day2_attended
                          ? <span className="text-emerald-400 text-base font-bold">✓</span>
                          : <span style={{ color: '#1e3a5f' }}>—</span>}
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleResend(p.participant_id)}
                            disabled={resendingId === p.participant_id}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all disabled:opacity-50 flex items-center gap-1.5"
                            style={{
                              background: 'rgba(59,130,246,0.1)',
                              border: '1px solid rgba(59,130,246,0.2)',
                              color: '#3B82F6',
                            }}>
                            {resendingId === p.participant_id
                              ? <span className="w-3 h-3 border border-blue-400 border-t-transparent rounded-full animate-spin" />
                              : <><Icon name="SendIcon" size={11} /> Resend</>}
                          </button>
                          {resendMsg?.id === p.participant_id && (
                            <span className={`text-xs font-medium ${resendMsg.ok ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {resendMsg.msg}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs" style={{ color: '#475569' }}>
            Page {page + 1} of {totalPages}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all disabled:opacity-30"
              style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', color: '#3B82F6' }}>
              ← Prev
            </button>
            {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
              const pageNum = Math.max(0, Math.min(page - 2, totalPages - 5)) + i;
              return (
                <button key={pageNum}
                  onClick={() => setPage(pageNum)}
                  className="w-8 h-8 rounded-lg text-xs font-semibold transition-all"
                  style={{
                    background: page === pageNum ? 'rgba(59,130,246,0.3)' : 'rgba(15,15,30,0.5)',
                    border: page === pageNum ? '1px solid rgba(59,130,246,0.5)' : '1px solid rgba(59,130,246,0.1)',
                    color: page === pageNum ? '#3B82F6' : '#475569',
                  }}>
                  {pageNum + 1}
                </button>
              );
            })}
            <button
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all disabled:opacity-30"
              style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', color: '#3B82F6' }}>
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}