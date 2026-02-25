import { authHeaders } from './auth';

const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export const api = {
    login: (password: string) =>
        fetch(`${BASE}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password }),
        }),

    getStats: () =>
        fetch(`${BASE}/api/stats`, {
            headers: authHeaders(),
        }),

    getParticipants: () =>
        fetch(`${BASE}/api/participants`, {
            headers: authHeaders(),
        }),

    uploadParticipants: (formData: FormData) =>
        fetch(`${BASE}/api/participants/upload`, {
            method: 'POST',
            headers: { ...authHeaders() },
            body: formData,
        }),

    getEntries: () =>
        fetch(`${BASE}/api/entries`, {
            headers: authHeaders(),
        }),

    exportEntries: () =>
        fetch(`${BASE}/api/entries/export`, {
            headers: authHeaders(),
        }),

    getEventDays: () =>
        fetch(`${BASE}/api/event-days`),

    activateDay: (dayId: number) =>
        fetch(`${BASE}/api/event-days/activate`, {
            method: 'POST',
            headers: { ...authHeaders(), 'Content-Type': 'application/json' },
            body: JSON.stringify({ dayId }),
        }),

    deactivateAll: () =>
        fetch(`${BASE}/api/event-days/deactivate`, {
            method: 'POST',
            headers: authHeaders(),
        }),

    scanVerify: (participant_id: string, scanned_by: string) =>
        fetch(`${BASE}/api/scanner/verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ participant_id, scanned_by }),
        }),

    sendEmails: () =>
        fetch(`${BASE}/api/email/send`, {
            method: 'POST',
            headers: authHeaders(),
        }),
};
