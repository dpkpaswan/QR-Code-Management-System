'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase, Entry } from '@/lib/supabase';
import Icon from '@/components/ui/AppIcon';

type DayFilter = 'all' | '1' | '2';

const PAGE_SIZE = 25;

export default function EntriesTable() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [dayFilter, setDayFilter] = useState<DayFilter>('all');
  const [exporting, setExporting] = useState(false);
  const [exportMsg, setExportMsg] = useState('');

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      let query = supabase.from('entries').select('*', { count: 'exact' });

      if (dayFilter !== 'all') query = query.eq('event_day', parseInt(dayFilter));
      if (search) {
        query = query.or(`name.ilike.%${search}%,participant_id.ilike.%${search}%`);
      }

      const { data, count, error: err } = await query
        .order('scanned_at', { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (err) throw err;
      setEntries(data || []);
      setTotal(count ?? 0);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load entries');
    } finally {
      setLoading(false);
    }
  }, [search, dayFilter, page]);

  useEffect(() => {
    const t = setTimeout(fetchEntries, 300);
    return () => clearTimeout(t);
  }, [fetchEntries]);

  const handleExport = async () => {
    setExporting(true);
    setExportMsg('');
    try {
      // Fetch all entries (no limit)
      const { data: allEntries, error: err } = await supabase
        .from('entries')
        .select('*')
        .order('scanned_at', { ascending: true });

      if (err) throw err;
      if (!allEntries || allEntries.length === 0) {
        setExportMsg('No entries to export yet.');
        setExporting(false);
        return;
      }

      const XLSX = (await import('xlsx')).default;
      const wb = XLSX.utils.book_new();

      const day1 = allEntries.filter(e => e.event_day === 1);
      const day2 = allEntries.filter(e => e.event_day === 2);

      const formatRow = (e: Entry) => ({
        'Participant ID': e.participant_id,
        'Name': e.name || '',
        'College': e.college_name || '',
        'Email': e.email || '',
        'Day': `Day ${e.event_day}`,
        'Scanned At': new Date(e.scanned_at).toLocaleString('en-IN'),
        'Scanned By': e.scanned_by || '',
      });

      const ws1 = XLSX.utils.json_to_sheet(day1.length > 0 ? day1.map(formatRow) : [{ Note: 'No Day 1 entries' }]);
      const ws2 = XLSX.utils.json_to_sheet(day2.length > 0 ? day2.map(formatRow) : [{ Note: 'No Day 2 entries' }]);

      XLSX.utils.book_append_sheet(wb, ws1, 'Day 1 Entries');
      XLSX.utils.book_append_sheet(wb, ws2, 'Day 2 Entries');

      const timestamp = Math.floor(Date.now() / 1000);
      XLSX.writeFile(wb, `event_entries_${timestamp}.xlsx`);
    } catch (e: unknown) {
      setExportMsg(e instanceof Error ? e.message : 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  const formatDateTime = (iso: string) =>
    new Date(iso).toLocaleString('en-US', {
      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit',
    });

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-4">
      {/* Filter Bar + Export */}
      <div className="glass-card p-4 rounded-xl flex flex-wrap gap-3 items-center justify-between">
        <div className="flex flex-wrap gap-3 items-center flex-1">
          <div className="relative min-w-48 flex-1">
            <Icon name="SearchIcon" size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#475569' }} />
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              placeholder="Search by name or participant ID..."
              className="w-full pl-9 pr-4 py-2.5 rounded-lg text-sm outline-none"
              style={{
                background: 'rgba(15,15,30,0.8)',
                border: '1px solid rgba(59,130,246,0.2)',
                color: '#F1F5F9',
                fontFamily: 'DM Sans, sans-serif',
              }}
            />
          </div>

          <div className="flex gap-2">
            {(['all', '1', '2'] as DayFilter[]).map(f => (
              <button key={f} onClick={() => { setDayFilter(f); setPage(0); }}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                style={{
                  background: dayFilter === f ? 'rgba(59,130,246,0.2)' : 'rgba(15,15,30,0.5)',
                  border: dayFilter === f ? '1px solid rgba(59,130,246,0.4)' : '1px solid rgba(59,130,246,0.1)',
                  color: dayFilter === f ? '#3B82F6' : '#475569',
                }}>
                {f === 'all' ? 'All Days' : `Day ${f}`}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleExport}
          disabled={exporting}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-50"
          style={{
            background: 'rgba(16,185,129,0.15)',
            border: '1px solid rgba(16,185,129,0.3)',
            color: '#10B981',
          }}>
          {exporting ? (
            <span className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin"></span>
          ) : (
            <Icon name="DownloadIcon" size={16} />
          )}
          {exporting ? 'Exporting...' : '📥 Download Entries Excel'}
        </button>
      </div>

      {exportMsg && (
        <div className="px-4 py-3 rounded-xl"
          style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
          <p className="text-sm" style={{ color: '#F59E0B' }}>{exportMsg}</p>
        </div>
      )}

      {/* Count */}
      {!loading && (
        <p className="text-sm" style={{ color: '#475569' }}>
          <span style={{ color: '#94A3B8', fontWeight: 600 }}>{total}</span> total entries
        </p>
      )}

      {/* Table */}
      <div className="glass-card rounded-2xl overflow-hidden">
        {error ? (
          <div className="p-8 text-center">
            <Icon name="AlertTriangleIcon" size={32} className="mx-auto mb-2 text-rose-400" />
            <p className="text-sm text-rose-400 mb-3">{error}</p>
            <button onClick={fetchEntries} className="text-xs px-4 py-2 rounded-lg btn-glow text-white">Retry</button>
          </div>
        ) : (
          <div className="-mx-4 px-4 sm:mx-0 sm:px-0" style={{ WebkitOverflowScrolling: 'touch' }}>
            <div className="overflow-x-auto">
              <table className="w-full data-table min-w-[640px]">
                <thead style={{ background: 'rgba(10,10,20,0.8)' }}>
                  <tr>
                    <th>#</th>
                    <th>Participant ID</th>
                    <th>Name</th>
                    <th className="hidden sm:table-cell">College</th>
                    <th>Day</th>
                    <th>Scanned At</th>
                    <th className="hidden sm:table-cell">Scanned By</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i}>
                        {Array.from({ length: 7 }).map((_, j) => (
                          <td key={j}><div className="skeleton h-4 rounded" style={{ width: (50 + Math.random() * 50) + '%' }}></div></td>
                        ))}
                      </tr>
                    ))
                  ) : entries.length === 0 ? (
                    <tr>
                      <td colSpan={7}>
                        <div className="py-16 text-center">
                          <Icon name="QrCodeIcon" size={40} className="mx-auto mb-3" style={{ color: '#1e3a5f' }} />
                          <p className="font-medium mb-1" style={{ color: '#475569' }}>No entries recorded</p>
                          <p className="text-xs" style={{ color: '#334155' }}>
                            {search || dayFilter !== 'all' ? 'No entries match your filters' : 'Entries will appear here once scanning begins'}
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    entries.map((entry, idx) => (
                      <tr key={entry.id}>
                        <td style={{ color: '#334155', fontFamily: 'JetBrains Mono, monospace', fontSize: '11px' }}>
                          {page * PAGE_SIZE + idx + 1}
                        </td>
                        <td>
                          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', color: '#3B82F6' }}>
                            {entry.participant_id}
                          </span>
                        </td>
                        <td className="font-medium" style={{ color: '#F1F5F9' }}>{entry.name || '—'}</td>
                        <td className="hidden sm:table-cell" style={{ color: '#94A3B8', maxWidth: '160px' }}>
                          <span className="truncate block">{entry.college_name || '—'}</span>
                        </td>
                        <td>
                          <span className="px-2 py-1 rounded-full text-xs font-bold"
                            style={{
                              background: entry.event_day === 1 ? 'rgba(59,130,246,0.15)' : 'rgba(139,92,246,0.15)',
                              color: entry.event_day === 1 ? '#3B82F6' : '#8B5CF6',
                              border: `1px solid ${entry.event_day === 1 ? 'rgba(59,130,246,0.3)' : 'rgba(139,92,246,0.3)'}`,
                            }}>
                            Day {entry.event_day}
                          </span>
                        </td>
                        <td style={{ color: '#475569', fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', whiteSpace: 'nowrap' }}>
                          {formatDateTime(entry.scanned_at)}
                        </td>
                        <td className="hidden sm:table-cell" style={{ color: '#94A3B8', fontSize: '12px' }}>{entry.scanned_by || '—'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
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