'use client';

import { useState, useEffect } from 'react';
import { Mail, CheckCircle, Eye, QrCode } from 'lucide-react';
import { api } from '@/lib/api';

interface SendProgress {
  participant_id: string;
  status: 'sent' | 'failed';
  error?: string;
}

export default function EmailDispatch() {
  const [stats, setStats] = useState<{ total: number; sent: number; pending: number } | null>(
    null
  );
  const [statsLoading, setStatsLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [progressList, setProgressList] = useState<SendProgress[]>([]);
  const [progressBar, setProgressBar] = useState({ sent: 0, failed: 0, total: 0 });
  const [summary, setSummary] = useState('');

  const fetchStats = async () => {
    setStatsLoading(true);
    try {
      const res = await api.getParticipants();
      const participants = await res.json();
      const total = participants.length;
      const sent = participants.filter((p: { email_sent: boolean }) => p.email_sent).length;
      setStats({ total, sent, pending: total - sent });
    } catch {
      setStats({ total: 0, sent: 0, pending: 0 });
    } finally {
      setStatsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleSendEmails = async () => {
    setSending(true);
    setSummary('');
    setProgressList([]);
    setProgressBar({ sent: 0, failed: 0, total: 0 });

    try {
      const res = await api.sendEmails();

      if (!res.ok) {
        setSummary('❌ Failed to start email sending');
        setSending(false);
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) {
        setSummary('❌ Unable to read response stream');
        setSending(false);
        return;
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data: ')) continue;

          try {
            const data = JSON.parse(trimmed.slice(6));

            if (data.type === 'start') {
              setProgressBar((prev) => ({ ...prev, total: data.total }));
            } else if (data.type === 'progress') {
              setProgressList((prev) => [
                ...prev,
                {
                  participant_id: data.participant_id,
                  status: data.status,
                  error: data.error,
                },
              ]);
              setProgressBar({ sent: data.sent, failed: data.failed, total: data.total });
            } else if (data.type === 'complete') {
              setSummary(
                data.sent === 0 && data.failed === 0
                  ? '✅ ' + (data.message || 'No pending emails')
                  : `📊 Complete: ${data.sent} sent, ${data.failed} failed`
              );
            } else if (data.type === 'error') {
              setSummary(`❌ Error: ${data.message}`);
            }
          } catch {
            // skip invalid JSON
          }
        }
      }
    } catch {
      setSummary('❌ Connection error during email sending');
    } finally {
      setSending(false);
      fetchStats();
    }
  };

  const pct =
    progressBar.total > 0
      ? Math.round(((progressBar.sent + progressBar.failed) / progressBar.total) * 100)
      : 0;

  return (
    <div className="space-y-6">
      {/* Stats Row */}
      <div className="glass-card p-6 rounded-2xl">
        <div className="flex items-center gap-3 mb-6">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{
              background: 'rgba(16,185,129,0.15)',
              border: '1px solid rgba(16,185,129,0.3)',
            }}
          >
            <Mail size={16} style={{ color: '#10B981' }} />
          </div>
          <h2
            className="font-semibold text-white"
            style={{ fontFamily: 'Space Grotesk, sans-serif' }}
          >
            Send QR Emails
          </h2>
        </div>

        {statsLoading ? (
          <div className="grid grid-cols-3 gap-4 mb-6">
            {[0, 1, 2].map((i) => (
              <div key={i} className="skeleton h-16 rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-4 mb-6">
            {[
              { label: 'Total', value: stats?.total ?? 0, color: '#3B82F6' },
              { label: 'Sent', value: stats?.sent ?? 0, color: '#10B981' },
              { label: 'Pending', value: stats?.pending ?? 0, color: '#F59E0B' },
            ].map((s) => (
              <div
                key={s.label}
                className="rounded-xl p-4 text-center"
                style={{
                  background: 'rgba(15,15,30,0.5)',
                  border: '1px solid rgba(59,130,246,0.1)',
                }}
              >
                <p
                  className="text-2xl font-bold mb-1"
                  style={{ color: s.color, fontFamily: 'Space Grotesk, sans-serif' }}
                >
                  {s.value}
                </p>
                <p className="text-xs" style={{ color: '#475569' }}>
                  {s.label}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Progress Bar */}
        {sending && progressBar.total > 0 && (
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs" style={{ color: '#94A3B8' }}>
                Sending emails...
              </span>
              <span
                className="text-xs font-bold"
                style={{ color: '#3B82F6', fontFamily: 'Space Grotesk, sans-serif' }}
              >
                {progressBar.sent + progressBar.failed} / {progressBar.total} ({pct}%)
              </span>
            </div>
            <div
              className="h-2.5 rounded-full overflow-hidden"
              style={{ background: 'rgba(30,30,60,0.8)' }}
            >
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${pct}%`,
                  background: 'linear-gradient(90deg, #3B82F6, #06B6D4)',
                  boxShadow: '0 0 8px rgba(59,130,246,0.6)',
                }}
              />
            </div>
          </div>
        )}

        <button
          onClick={handleSendEmails}
          disabled={sending || statsLoading || stats?.pending === 0}
          className="w-full py-3 rounded-xl font-semibold text-sm text-white btn-glow disabled:opacity-50 disabled:cursor-not-allowed tracking-wide"
          style={{ fontFamily: 'Space Grotesk, sans-serif' }}
        >
          {sending ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              SENDING EMAILS...
            </span>
          ) : stats?.pending === 0 ? (
            'ALL EMAILS SENT ✅'
          ) : (
            `SEND QR CODES TO ${stats?.pending ?? 0} PENDING PARTICIPANTS`
          )}
        </button>

        {summary && (
          <div
            className="mt-4 px-4 py-3 rounded-xl"
            style={{
              background: summary.startsWith('✅') || summary.startsWith('📊')
                ? 'rgba(16,185,129,0.08)'
                : 'rgba(244,63,94,0.08)',
              border: summary.startsWith('✅') || summary.startsWith('📊')
                ? '1px solid rgba(16,185,129,0.2)'
                : '1px solid rgba(244,63,94,0.2)',
            }}
          >
            <p
              className="text-sm"
              style={{
                color: summary.startsWith('✅') || summary.startsWith('📊') ? '#10B981' : '#F43F5E',
              }}
            >
              {summary}
            </p>
          </div>
        )}
      </div>

      {/* Live Send Progress */}
      {progressList.length > 0 && (
        <div className="glass-card rounded-2xl overflow-hidden">
          <div
            className="px-6 py-4 border-b"
            style={{ borderColor: 'rgba(59,130,246,0.1)' }}
          >
            <h3
              className="font-semibold text-white text-sm"
              style={{ fontFamily: 'Space Grotesk, sans-serif' }}
            >
              Email Dispatch Progress
            </h3>
          </div>
          <div className="overflow-y-auto max-h-80">
            <table className="w-full data-table">
              <thead style={{ background: 'rgba(10,10,20,0.8)' }}>
                <tr>
                  <th>Participant ID</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {progressList.map((s, i) => (
                  <tr key={i}>
                    <td
                      style={{
                        fontFamily: 'JetBrains Mono, monospace',
                        fontSize: '11px',
                        color: '#3B82F6',
                      }}
                    >
                      {s.participant_id}
                    </td>
                    <td>
                      {s.status === 'sent' ? (
                        <span
                          className="flex items-center gap-1 text-xs font-semibold"
                          style={{ color: '#10B981' }}
                        >
                          <CheckCircle size={12} /> Sent
                        </span>
                      ) : (
                        <span className="text-xs" style={{ color: '#F43F5E' }}>
                          ❌ Failed
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Email Template Preview */}
      <div className="glass-card p-6 rounded-2xl">
        <div className="flex items-center gap-2 mb-4">
          <Eye size={16} style={{ color: '#475569' }} />
          <h3
            className="text-sm font-semibold"
            style={{ color: '#94A3B8', fontFamily: 'Space Grotesk, sans-serif' }}
          >
            Email Template Preview
          </h3>
          <span
            className="ml-auto px-2 py-0.5 rounded text-xs"
            style={{
              background: 'rgba(245,158,11,0.1)',
              color: '#F59E0B',
              border: '1px solid rgba(245,158,11,0.2)',
            }}
          >
            TEMPLATE ONLY
          </span>
        </div>
        <div
          className="rounded-xl overflow-hidden"
          style={{ border: '1px solid rgba(59,130,246,0.15)' }}
        >
          <div
            className="px-4 py-3 flex items-center gap-2"
            style={{
              background: 'rgba(10,10,20,0.8)',
              borderBottom: '1px solid rgba(59,130,246,0.1)',
            }}
          >
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-rose-500 opacity-50" />
              <div className="w-3 h-3 rounded-full bg-amber-500 opacity-50" />
              <div className="w-3 h-3 rounded-full bg-emerald-500 opacity-50" />
            </div>
            <span className="text-xs ml-2" style={{ color: '#334155' }}>
              Email Preview
            </span>
          </div>
          <div className="p-6" style={{ background: 'rgba(15,15,30,0.6)' }}>
            <div className="max-w-sm mx-auto text-center">
              <div
                className="w-8 h-8 rounded-lg mx-auto mb-3 flex items-center justify-center"
                style={{ background: 'rgba(59,130,246,0.2)' }}
              >
                <QrCode size={16} style={{ color: '#3B82F6' }} />
              </div>
              <p
                className="text-sm font-bold mb-1"
                style={{ color: '#3B82F6', fontFamily: 'Space Grotesk, sans-serif' }}
              >
                [EVENT NAME]
              </p>
              <p className="text-xs mb-4" style={{ color: '#475569' }}>
                Your personal entry QR code
              </p>
              <div
                className="w-24 h-24 rounded-lg mx-auto mb-4 flex items-center justify-center"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '2px dashed rgba(59,130,246,0.3)',
                }}
              >
                <QrCode size={36} style={{ color: '#334155' }} />
              </div>
              <div
                className="rounded-lg p-3 mb-3 text-left"
                style={{
                  background: 'rgba(59,130,246,0.08)',
                  border: '1px solid rgba(59,130,246,0.15)',
                }}
              >
                <p className="text-xs mb-1" style={{ color: '#475569' }}>
                  Participant Details
                </p>
                <p className="text-sm font-semibold mb-0.5" style={{ color: '#F1F5F9' }}>
                  [PARTICIPANT NAME]
                </p>
                <p className="text-xs mb-0.5" style={{ color: '#94A3B8' }}>
                  [COLLEGE NAME]
                </p>
                <p className="text-xs font-mono" style={{ color: '#3B82F6' }}>
                  ID: [PARTICIPANT ID]
                </p>
              </div>
              <p className="text-xs" style={{ color: '#334155' }}>
                Present QR at entrance gate for check-in.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}