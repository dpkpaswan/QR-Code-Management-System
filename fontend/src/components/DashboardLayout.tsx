"use client";

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import { isLoggedIn, getUserRole, canAccessPage, getDefaultPage } from '@/lib/auth';
import { Menu } from 'lucide-react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [authorized, setAuthorized] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!isLoggedIn()) {
      router.push('/login');
      return;
    }

    const role = getUserRole();
    if (!role) {
      router.push('/login');
      return;
    }

    // Check if user has permission to access this page
    if (!canAccessPage(role, pathname)) {
      router.push(getDefaultPage(role));
      return;
    }

    setAuthorized(true);
  }, [router, pathname]);

  if (!authorized) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0A0A0F' }}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm" style={{ color: '#475569' }}>Verifying access...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: '#0A0A0F' }}>
      <div className="mesh-bg" />
      <div className="grid-pattern" />
      <Sidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />

      {/* Mobile top navbar */}
      <div
        className="fixed top-0 left-0 right-0 h-14 z-30 lg:hidden flex items-center px-4"
        style={{ background: 'rgba(10,10,20,0.95)', borderBottom: '1px solid rgba(59,130,246,0.1)', backdropFilter: 'blur(20px)' }}
      >
        <button onClick={() => setMobileOpen(true)} className="text-slate-400 mr-3">
          <Menu size={22} />
        </button>
        <span className="font-bold text-white text-sm" style={{ fontFamily: 'Space Grotesk' }}>EVENT CONTROL</span>
      </div>

      {/* Prevent body scroll when mobile sidebar open */}
      {mobileOpen && (
        <style>{`body { overflow: hidden; }`}</style>
      )}

      <main className="lg:ml-60 min-h-screen pt-14 lg:pt-0 relative z-10">
        {children}
      </main>
    </div>
  );
}