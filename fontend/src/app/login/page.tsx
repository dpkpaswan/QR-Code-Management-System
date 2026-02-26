'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Eye, EyeOff, AlertCircle, Shield, User } from 'lucide-react';
import { api } from '@/lib/api';
import { setToken, setUserInfo, getDefaultPage, getToken, getUserInfo } from '@/lib/auth';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    const token = getToken();
    const user = getUserInfo();
    if (token && user) {
      router.replace(getDefaultPage(user.role));
      return; // let redirect happen
    }
    setCheckingAuth(false);
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) return;
    setLoading(true);
    setError('');

    try {
      const res = await api.login(username.trim(), password);
      const data = await res.json();

      if (res.ok && data.token) {
        setToken(data.token);
        setUserInfo(data.user);
        router.push(getDefaultPage(data.user.role));
      } else {
        setError(data.error || 'Invalid credentials');
        setShake(true);
        setTimeout(() => setShake(false), 600);
        setPassword('');
      }
    } catch {
      setError('Connection error. Please try again.');
      setShake(true);
      setTimeout(() => setShake(false), 600);
    } finally {
      setLoading(false);
    }
  };

  if (checkingAuth) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: '#0A0A0F' }}
      >
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center relative overflow-hidden px-4"
      style={{ background: '#0A0A0F' }}
    >
      {/* Background */}
      <div className="mesh-bg" />
      <div className="grid-pattern" />

      {/* Decorative orbs */}
      <div
        className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(59,130,246,0.06) 0%, transparent 70%)',
          filter: 'blur(40px)',
        }}
      />
      <div
        className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(6,182,212,0.05) 0%, transparent 70%)',
          filter: 'blur(40px)',
        }}
      />

      {/* Login Card */}
      <motion.div
        ref={cardRef}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0, x: shake ? [0, -8, 8, -8, 8, -8, 8, 0] : 0 }}
        transition={{ duration: shake ? 0.5 : 0.6, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-md glass-card-glow p-8"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center pulse-glow-blue"
              style={{
                background: 'rgba(59,130,246,0.15)',
                border: '1px solid rgba(59,130,246,0.3)',
              }}
            >
              <Shield size={32} style={{ color: '#3B82F6' }} />
            </div>
          </div>
          <h1
            className="text-2xl font-bold mb-1 tracking-widest"
            style={{ fontFamily: 'Space Grotesk, sans-serif', color: '#F1F5F9', letterSpacing: '0.15em' }}
          >
            EVENT CONTROL PANEL
          </h1>
          <p className="text-sm" style={{ color: '#475569' }}>
            Authorized Personnel Only
          </p>
        </div>

        {/* Divider */}
        <div
          className="mb-8"
          style={{
            height: '1px',
            background: 'linear-gradient(90deg, transparent, rgba(59,130,246,0.3), transparent)',
          }}
        />

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Username */}
          <div>
            <label
              className="block text-xs font-semibold mb-2 uppercase tracking-widest"
              style={{ color: '#475569' }}
            >
              Username
            </label>
            <div className="relative">
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                required
                autoComplete="username"
                className="w-full px-4 py-3 pl-11 rounded-xl text-sm outline-none transition-all focus:border-blue-500/60"
                style={{
                  background: 'rgba(15,15,30,0.8)',
                  border: error
                    ? '1px solid rgba(244,63,94,0.5)'
                    : '1px solid rgba(59,130,246,0.2)',
                  color: '#F1F5F9',
                  fontFamily: 'DM Sans, sans-serif',
                }}
              />
              <User
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2"
                style={{ color: '#475569' }}
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label
              className="block text-xs font-semibold mb-2 uppercase tracking-widest"
              style={{ color: '#475569' }}
            >
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                autoComplete="current-password"
                className="w-full px-4 py-3 pr-12 rounded-xl text-sm outline-none transition-all focus:border-blue-500/60"
                style={{
                  background: 'rgba(15,15,30,0.8)',
                  border: error
                    ? '1px solid rgba(244,63,94,0.5)'
                    : '1px solid rgba(59,130,246,0.2)',
                  color: '#F1F5F9',
                  fontFamily: 'DM Sans, sans-serif',
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                style={{ color: '#475569' }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 mt-2"
              >
                <AlertCircle size={14} className="text-rose-400 flex-shrink-0" />
                <p className="text-xs" style={{ color: '#F43F5E' }}>
                  {error}
                </p>
              </motion.div>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || !username.trim() || !password.trim()}
            className="w-full py-3 rounded-xl font-semibold text-sm tracking-widest text-white btn-glow disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none transition-all"
            style={{ fontFamily: 'Space Grotesk, sans-serif', letterSpacing: '0.1em' }}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                VERIFYING...
              </span>
            ) : (
              'SIGN IN'
            )}
          </button>
        </form>

        {/* Footer note */}
        <p className="text-center text-xs mt-6" style={{ color: '#1e3a5f' }}>
          Protected by EventQR Manager • v2.0
        </p>
      </motion.div>
    </div>
  );
}