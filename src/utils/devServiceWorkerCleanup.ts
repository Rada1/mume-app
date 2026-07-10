/**
 * @file devServiceWorkerCleanup.ts
 * @description Removes stale PWA service workers while running the Vite dev server.
 */

// --- Logic Section ---
export const cleanupDevServiceWorkers = (): void => {
    if (!import.meta.env.DEV || typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
        return;
    }

    window.addEventListener('load', () => {
        navigator.serviceWorker.getRegistrations()
            .then(registrations => Promise.all(registrations.map(registration => registration.unregister())))
            .then(() => {
                if (!('caches' in window)) return;
                return caches.keys()
                    .then(keys => Promise.all(
                        keys
                            .filter(key => key.includes('workbox') || key.includes('precache'))
                            .map(key => caches.delete(key))
                    ));
            })
            .catch(error => {
                console.warn('[DevSW] Failed to clear stale service workers:', error);
            });
    }, { once: true });
};
