'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Icon from '@/components/ui/AppIcon';

interface ScanResult {
  status: 'success' | 'duplicate' | 'invalid' | 'inactive' | 'error';
  participant?: {
    participant_id: string;
    name: string;
    college_name: string;
    email: string;
  };
  day_label?: string;
  scanned_at?: string;
  first_scan_time?: string;
  also_attended_day?: number | null;
  error?: string;
}

interface Props {
  coordinatorName: string;
  onNewEntry: () => void;
}

export default function ScannerCamera({ coordinatorName, onNewEntry }: Props) {
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [dismissTimer, setDismissTimer] = useState(0);
  const [cameraError, setCameraError] = useState('');
  const [noCoordWarning, setNoCoordWarning] = useState(false);
  const scannerRef = useRef<unknown>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const processingRef = useRef(false);

  const dismissResult = useCallback(() => {
    setResult(null);
    setDismissTimer(0);
    processingRef.current = false;
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  const startDismissCountdown = useCallback((seconds: number) => {
    setDismissTimer(seconds);
    timerRef.current = setInterval(() => {
      setDismissTimer(prev => {
        if (prev <= 1) {
          dismissResult();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [dismissResult]);

  const handleScan = useCallback(async (decodedText: string) => {
    if (processingRef.current) return;
    processingRef.current = true;

    if (!coordinatorName.trim()) {
      setNoCoordWarning(true);
      setTimeout(() => setNoCoordWarning(false), 3000);
      processingRef.current = false;
      return;
    }

    try {
      // Use api helper to hit the correct backend endpoint and payload
      const { api } = await import('@/lib/api');
      const res = await api.scanVerify(decodedText, coordinatorName);
      const data: ScanResult = await res.json();
      setResult(data);

      if (data.status === 'success') {
        onNewEntry();
        startDismissCountdown(4);
      } else if (data.status === 'duplicate') {
        startDismissCountdown(4);
      } else {
        startDismissCountdown(3);
      }
    } catch {
      setResult({ status: 'error', error: 'Network error. Please try again.' });
      startDismissCountdown(3);
    }
  }, [coordinatorName, onNewEntry, startDismissCountdown]);

  useEffect(() => {
    let html5QrCode: unknown;

    const startScanner = async () => {
      try {
        const { Html5Qrcode } = await import('html5-qrcode');
        html5QrCode = new Html5Qrcode('qr-reader');
        scannerRef.current = html5QrCode;

        await (html5QrCode as { start: (facingMode: { facingMode: string }, config: object, cb: (text: string) => void, errCb: () => void) => Promise<void> }).start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 },
          handleScan,
          () => {}
        );
        setScanning(true);
      } catch (err) {
        setCameraError('Could not access camera. Please allow camera permissions and refresh.');
      }
    };

    startScanner();

    return () => {
      if (scannerRef.current) {
        try {
          (scannerRef.current as { stop: () => Promise<void>; clear: () => void }).stop().then(() => {
            (scannerRef.current as { stop: () => Promise<void>; clear: () => void }).clear();
          }).catch(() => {});
        } catch {}
      }
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [handleScan]);

  const formatTime = (iso?: string) => {
    if (!iso) return '';
    return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <div className="relative">
      {/* Camera Container */}
      <div className="relative rounded-2xl overflow-hidden" style={{ background: '#000', minHeight: '240px', maxWidth: '100%', aspectRatio: '1' }}>
        <div id="qr-reader" className="w-full" />

        {/* Corner brackets */}
        {scanning && !result && (
          <>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="relative w-64 h-64">
                {/* Corners */}
                {[
                  'top-0 left-0 border-t-2 border-l-2',
                  'top-0 right-0 border-t-2 border-r-2',
                  'bottom-0 left-0 border-b-2 border-l-2',
                  'bottom-0 right-0 border-b-2 border-r-2',
                ].map((cls, i) => (
                  <div key={i} className={`absolute w-8 h-8 ${cls}`} style={{ borderColor: '#3B82F6' }} />
                ))}
                {/* Scan line */}
                <div className="absolute left-0 right-0 h-0.5 scan-line"
                  style={{ background: 'linear-gradient(90deg, transparent, #3B82F6, #06B6D4, #3B82F6, transparent)', boxShadow: '0 0 8px #3B82F6' }} />
              </div>
            </div>
          </>
        )}

        {cameraError && (
          <div className="absolute inset-0 flex items-center justify-center p-6 text-center"
            style={{ background: 'rgba(10,10,20,0.9)' }}>
            <div>
              <Icon name="CameraOffIcon" size={40} className="mx-auto mb-3 text-rose-400" />
              <p className="text-sm text-rose-400 mb-3">{cameraError}</p>
            </div>
          </div>
        )}
      </div>

      {/* No coordinator warning */}
      {noCoordWarning && (
        <div className="mt-3 flex items-center gap-2 px-4 py-3 rounded-xl fade-in"
          style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)' }}>
          <Icon name="AlertTriangleIcon" size={16} style={{ color: '#F59E0B' }} />
          <p className="text-sm" style={{ color: '#F59E0B' }}>Please enter coordinator name first</p>
        </div>
      )}

      {/* Result Overlay */}
      {result && (
        <div className="absolute inset-0 rounded-2xl flex items-center justify-center p-4 fade-in"
          style={{
            background: result.status === 'success' ?'rgba(16,185,129,0.95)'
              : result.status === 'duplicate' ?'rgba(245,158,11,0.95)' :'rgba(244,63,94,0.95)',
            backdropFilter: 'blur(10px)',
            zIndex: 20,
          }}>
          <div className="text-center w-full max-w-sm">
            {/* Status Icon */}
            <div className="text-4xl mb-3">
              {result.status === 'success' && '✅'}
              {result.status === 'duplicate' && '⚠️'}
              {(result.status === 'invalid' || result.status === 'error') && '❌'}
              {result.status === 'inactive' && '🔴'}
            </div>

            {/* Status Title */}
            <h3 className="text-xl font-bold text-white mb-3" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              {result.status === 'success' && 'ENTRY GRANTED'}
              {result.status === 'duplicate' && `ALREADY CHECKED IN — ${result.day_label}`}
              {result.status === 'invalid' && 'INVALID QR CODE'}
              {result.status === 'inactive' && 'NO ACTIVE EVENT DAY'}
              {result.status === 'error' && 'SCAN ERROR'}
            </h3>

            {/* Details */}
            {result.participant && (result.status === 'success' || result.status === 'duplicate') && (
              <div className="rounded-xl p-4 mb-4 text-left space-y-2"
                style={{ background: 'rgba(0,0,0,0.25)' }}>
                {result.status === 'success' && result.day_label && (
                  <div className="text-center mb-2">
                    <span className="px-3 py-1 rounded-full text-xs font-bold text-white"
                      style={{ background: 'rgba(255,255,255,0.2)' }}>
                      {result.day_label}
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <span className="text-lg">👤</span>
                  <span className="font-semibold text-white text-sm">{result.participant.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm">🆔</span>
                  <span className="text-xs text-white/80 font-mono">{result.participant.participant_id}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm">🏫</span>
                  <span className="text-xs text-white/80">{result.participant.college_name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm">📧</span>
                  <span className="text-xs text-white/70">{result.participant.email}</span>
                </div>
                {result.status === 'success' && result.scanned_at && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm">🕐</span>
                    <span className="text-xs text-white/70">{formatTime(result.scanned_at)}</span>
                  </div>
                )}
                {result.status === 'duplicate' && result.first_scan_time && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm">🕐</span>
                    <span className="text-xs text-white/70">First scan: {formatTime(result.first_scan_time)}</span>
                  </div>
                )}
                {result.status === 'success' && result.also_attended_day && (
                  <div className="mt-2 text-center">
                    <span className="px-2 py-1 rounded-full text-xs font-semibold"
                      style={{ background: 'rgba(59,130,246,0.4)', color: 'white' }}>
                      Also attended Day {result.also_attended_day}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Countdown & Dismiss */}
            <div className="flex items-center justify-center gap-3">
              <div className="w-8 h-8 rounded-full border-2 border-white/40 flex items-center justify-center">
                <span className="text-sm font-bold text-white">{dismissTimer}</span>
              </div>
              <button onClick={dismissResult} className="px-4 py-2 rounded-lg text-sm font-semibold text-white"
                style={{ background: 'rgba(0,0,0,0.3)' }}>
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}