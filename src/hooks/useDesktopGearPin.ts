/** @file useDesktopGearPin.ts — Pin the currently open desktop gear menu. */
import { useCallback, useState } from 'react';

// --- Logic Section ---
export function useDesktopGearPin() {
    const [pinned, setPinned] = useState(false);
    const togglePin = useCallback(() => setPinned(value => !value), []);
    const pin = useCallback(() => setPinned(true), []);
    const clearPin = useCallback(() => setPinned(false), []);
    return { pinned, pin, togglePin, clearPin };
}
