'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { LayoutDashboard, UploadCloud, Users, ClipboardList, LogOut, QrCode } from 'lucide-react';
import { api } from '@/lib/api';
import { clearToken, getUserInfo, getAllowedPages, type UserRole } from '@/lib/auth';

interface EventDay {
  id: number;
  label: string;
  event_date: string;
  is_active: boolean;
}

const allNavItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/scanner', label: 'Scanner', icon: QrCode },
  { href: '/upload', label: 'Upload & Send', icon: UploadCloud },
  { href: '/participants', label: 'Participants', icon: Users },
  { href: '/entries', label: 'Entries', icon: ClipboardList },
];

// Role display labels & colors
const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Admin',
  data_upload: 'Data Upload',
  registration: 'Registration',
  coordinator: 'Coordinator',
};

const ROLE_COLORS: Record<UserRole, string> = {
  admin: '#3B82F6',
  data_upload: '#10B981',
  registration: '#8B5CF6',
  coordinator: '#F59E0B',
};

export default function Sidebar({ mobileOpen, setMobileOpen }: { mobileOpen?: boolean; setMobileOpen?: (v: boolean) => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const [activeDay, setActiveDay] = useState<EventDay | null | undefined>(undefined);
  const userInfo = getUserInfo();
  const userRole = userInfo?.role;

  // Filter nav items based on role
  const allowedPages = userRole ? getAllowedPages(userRole) : [];
  const navItems = allNavItems.filter((item) =>
    allowedPages.some((page) => item.href === page || item.href.startsWith(page))
  );

  useEffect(() => {
    fetchActiveDay();
    const interval = setInterval(fetchActiveDay, 30000);
    return () => clearInterval(interval);
  }, []);

  // Auto-close mobile sidebar on route change
  useEffect(() => {
    if (typeof setMobileOpen === 'function') setMobileOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

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

  const handleLogout = () => {
    clearToken();
    router.push('/login');
  };

  return (
    <div>
      {/* Overlay for mobile when sidebar is open */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 lg:hidden"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(2px)' }}
          onClick={() => setMobileOpen && setMobileOpen(false)}
        />
      )}

      <aside
        className={`fixed left-0 top-0 h-full w-60 flex flex-col z-40 transition-transform duration-300 ease-in-out ${mobileOpen ? 'translate-x-0' : '-translate-x-full'
          } lg:translate-x-0`}
        style={{
          background: 'rgba(10,10,20,0.95)',
          borderRight: '1px solid rgba(59,130,246,0.1)',
          backdropFilter: 'blur(20px)',
        }}
      >
        {/* Mobile X button */}
        <button
          className="absolute top-4 right-4 lg:hidden text-slate-400"
          onClick={() => setMobileOpen && setMobileOpen(false)}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18" /><path d="M6 6l12 12" /></svg>
        </button>
        {/* Logo */}
        <div className="px-4 py-5 border-b" style={{ borderColor: 'rgba(59,130,246,0.1)' }}>
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)' }}
            >
              <QrCode size={18} style={{ color: '#3B82F6' }} />
            </div>
            <div>
              <p
                className="text-sm font-bold text-white"
                style={{ fontFamily: 'Space Grotesk, sans-serif' }}
              >
                EVENT CONTROL
              </p>
              <p className="text-xs" style={{ color: '#475569' }}>
                {userRole ? ROLE_LABELS[userRole] : 'Panel'}
              </p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            const IconComp = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`sidebar-link ${isActive ? 'active' : ''}`}
              >
                <IconComp size={18} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Active Day Badge */}
        <div className="px-3 pb-3">
          {activeDay === undefined ? (
            <div className="skeleton h-8 rounded-lg" />
          ) : activeDay ? (
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-lg pulse-glow-green"
              style={{
                background: 'rgba(16,185,129,0.1)',
                border: '1px solid rgba(16,185,129,0.3)',
              }}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" />
              <span className="text-xs font-semibold text-emerald-400 truncate">
                {activeDay.label} ACTIVE
              </span>
            </div>
          ) : (
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-lg"
              style={{
                background: 'rgba(244,63,94,0.08)',
                border: '1px solid rgba(244,63,94,0.2)',
              }}
            >
              <span className="w-2 h-2 rounded-full bg-rose-400 flex-shrink-0" />
              <span className="text-xs font-semibold text-rose-400">NO ACTIVE DAY</span>
            </div>
          )}
        </div>

        {/* User Info & Logout */}
        <div className="px-3 pb-4 border-t pt-3" style={{ borderColor: 'rgba(59,130,246,0.1)' }}>
          {userInfo && (
            <div className="mb-3 px-3 py-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)' }}>
              <p className="text-xs font-semibold text-white truncate">{userInfo.displayName}</p>
              <div className="flex items-center gap-1.5 mt-1">
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: ROLE_COLORS[userInfo.role] }}
                />
                <span
                  className="text-xs font-medium"
                  style={{ color: ROLE_COLORS[userInfo.role] }}
                >
                  {ROLE_LABELS[userInfo.role]}
                </span>
              </div>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="sidebar-link w-full text-rose-400 hover:text-rose-300"
            style={{ background: 'rgba(244,63,94,0.05)' }}
          >
            <LogOut size={18} />
            <span>Logout</span>
          </button>
        </div>
      </aside>
    </div>
  );
}