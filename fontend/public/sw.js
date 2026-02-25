// Empty service worker placeholder to prevent repeated fetch attempts from old registrations
self.addEventListener('install', (e) => { self.skipWaiting(); });
self.addEventListener('activate', (e) => { clients.claim(); });
