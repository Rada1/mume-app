/**
 * @file shaperAccess.ts
 * @description Client-side feature gate for the privileged Shaper workspace, enforcing God character privileges.
 */

import { useVitalsStore } from '../../stores/useVitalsStore';

// --- Environment Section ---
const meta = import.meta as unknown as { env?: Record<string, string | undefined> };
const ACCESS_KEY = 'mume.shaper.access';
const DEFAULT_PASSCODE = 'mellon';

// --- Access Section ---
export const canAccessShaper = (): boolean => {
    const flag = meta.env?.VITE_SHAPER_ENABLED;
    let baseAccess = false;
    
    if (flag === 'true') {
        baseAccess = true;
    } else if (typeof window !== 'undefined') {
        baseAccess = window.localStorage.getItem(ACCESS_KEY) === 'granted';
    }

    if (!baseAccess) return false;

    // Enforce God character restriction (Ellessar or level 100+ Deity/Wizard)
    const characterInfo = useVitalsStore.getState().characterInfo;
    const name = characterInfo?.name?.toLowerCase();
    const isGod = name === 'ellessar' || (characterInfo?.level && characterInfo.level >= 100);
    
    return !!isGod;
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
