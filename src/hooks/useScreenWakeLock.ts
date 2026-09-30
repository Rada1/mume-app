/**
 * @file useScreenWakeLock.ts
 * @description Keeps the device screen awake while the user opts in and the app is visible.
 */

import { useEffect } from 'react';
import { useSettingsStore } from '../stores/useSettingsStore';

// --- Logic Section ---

export const useScreenWakeLock = (enabled: boolean): void => {
    useEffect(() => {
        const setStatus = useSettingsStore.getState().setScreenWakeLockStatus;
        const wakeLockApi = typeof navigator !== 'undefined' ? navigator.wakeLock : undefined;

        if (typeof window !== 'undefined' && !window.isSecureContext) {
            setStatus('insecure-context');
            return;
        }

        if (!wakeLockApi) {
            setStatus('unsupported');
            return;
        }

        if (!enabled) {
            setStatus('disabled');
            return;
        }

        let cancelled = false;
        let requestPending = false;
        let sentinel: WakeLockSentinel | null = null;

        const requestWakeLock = async (): Promise<void> => {
            if (cancelled || requestPending || document.visibilityState !== 'visible') return;
            if (sentinel && !sentinel.released) return;

            requestPending = true;
            try {
                const nextSentinel = await wakeLockApi.request('screen');
                if (cancelled || document.visibilityState !== 'visible') {
                    await nextSentinel.release();
                    return;
                }

                sentinel = nextSentinel;
                setStatus('active');
                nextSentinel.addEventListener('release', () => {
                    if (sentinel !== nextSentinel) return;
                    sentinel = null;
                    if (!cancelled) {
                        setStatus(document.visibilityState === 'visible' ? 'unavailable' : 'paused');
                    }
                });
            } catch {
                if (!cancelled) setStatus('unavailable');
            } finally {
                requestPending = false;
            }
        };

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                void requestWakeLock();
            } else {
                setStatus('paused');
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        void requestWakeLock();

        return () => {
            cancelled = true;
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            const heldSentinel = sentinel;
            sentinel = null;
            if (heldSentinel && !heldSentinel.released) void heldSentinel.release();
            setStatus('disabled');
        };
    }, [enabled]);
};
