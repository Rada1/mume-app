/**
 * @file shaperAccess.ts
 * @description Client-side feature gate for the privileged Shaper workspace.
 */

// --- Environment Section ---
const meta = import.meta as unknown as { env?: Record<string, string | undefined> };
const ACCESS_KEY = 'mume.shaper.access';
const DEFAULT_PASSCODE = 'mellon';

// --- Access Section ---
export const canAccessShaper = (): boolean => {
    const flag = meta.env?.VITE_SHAPER_ENABLED;
    if (flag === 'true') return true;

    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem(ACCESS_KEY) === 'granted';
};

export const requestShaperAccess = (passcode: string): boolean => {
    const expected = meta.env?.VITE_SHAPER_PASSCODE || DEFAULT_PASSCODE;
    const isValid = passcode.trim() === expected;
    if (!isValid || typeof window === 'undefined') return false;

    window.localStorage.setItem(ACCESS_KEY, 'granted');
    return true;
};

export const revokeShaperAccess = (): void => {
    if (typeof window === 'undefined') return;
    window.localStorage.removeItem(ACCESS_KEY);
};
