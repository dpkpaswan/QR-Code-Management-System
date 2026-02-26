'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

const TOKEN_KEY = 'admin_token';
const USER_KEY = 'user_info';

// Role type
export type UserRole = 'admin' | 'data_upload' | 'registration' | 'coordinator';

export interface UserInfo {
  username: string;
  role: UserRole;
  displayName: string;
}

// --- Token ---
export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function isLoggedIn(): boolean {
  return !!getToken() && !isTokenExpired();
}

export function isTokenExpired(): boolean {
  const token = getToken();
  if (!token) return true;
  try {
    const parts = token.split('.');
    if (parts.length < 2) return true;
    const payload = JSON.parse(atob(parts[1]));
    const now = Math.floor(Date.now() / 1000);
    return payload.exp ? payload.exp < now : false;
  } catch {
    return true;
  }
}

export function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// --- User Info ---
export function setUserInfo(user: UserInfo): void {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function getUserInfo(): UserInfo | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function getUserRole(): UserRole | null {
  return getUserInfo()?.role || null;
}

export function getDisplayName(): string | null {
  return getUserInfo()?.displayName || null;
}

// --- Role-based permissions ---
const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  admin: ['/dashboard', '/scanner', '/upload', '/participants', '/entries'],
  data_upload: ['/upload', '/participants'],
  registration: ['/scanner', '/entries'],
  coordinator: ['/entries'],
};

// Get the default landing page for each role
const ROLE_DEFAULT_PAGE: Record<UserRole, string> = {
  admin: '/dashboard',
  data_upload: '/upload',
  registration: '/scanner',
  coordinator: '/entries',
};

export function getAllowedPages(role: UserRole): string[] {
  return ROLE_PERMISSIONS[role] || [];
}

export function getDefaultPage(role: UserRole): string {
  return ROLE_DEFAULT_PAGE[role] || '/login';
}

export function canAccessPage(role: UserRole, pathname: string): boolean {
  const allowed = ROLE_PERMISSIONS[role] || [];
  return allowed.some((page) => pathname === page || pathname.startsWith(page + '/'));
}

// Can user export entries? (admin + registration)
export function canExportEntries(role: UserRole): boolean {
  return role === 'admin' || role === 'registration';
}

// --- Auth hook ---
export function useAuthCheck() {
  const router = useRouter();

  useEffect(() => {
    const token = getToken();
    const user = getUserInfo();

    if (!token || !user) {
      router.push('/login');
      return;
    }

    // Validate JWT expiry client-side
    try {
      const parts = token.split('.');
      const payload = JSON.parse(atob(parts[1]));
      const now = Math.floor(Date.now() / 1000);
      if (payload.exp && payload.exp < now) {
        clearToken();
        router.push('/login');
        return;
      }
    } catch {
      clearToken();
      router.push('/login');
      return;
    }

    // Check role permissions for current path
    try {
      const pathname = typeof window !== 'undefined' ? window.location.pathname : '/';
      if (!canAccessPage(user.role, pathname)) {
        router.replace(getDefaultPage(user.role));
        return;
      }
    } catch {
      // ignore and allow
    }
  }, [router]);

  return isLoggedIn();
}
