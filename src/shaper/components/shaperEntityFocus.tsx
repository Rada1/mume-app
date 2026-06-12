/**
 * @file shaperEntityFocus.tsx
 * @description Context + hook letting any mob/object card scroll into view and
 * pulse when the grid requests focus on its entity (e.g. clicking a tile badge).
 */

import { createContext, useContext, useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';

export interface ShaperEntityFocusSignal {
    id: string;
    nonce: number;
}

const ShaperEntityFocusContext = createContext<ShaperEntityFocusSignal | null>(null);
export const ShaperEntityFocusProvider = ShaperEntityFocusContext.Provider;

export const useShaperEntityFocusSignal = (): ShaperEntityFocusSignal | null =>
    useContext(ShaperEntityFocusContext);

// Self-focus: scroll the card into view and briefly highlight when targeted.
export const useShaperEntityFocus = (
    entityId: string
): { ref: RefObject<HTMLDivElement>; focused: boolean; expandSignal: number | null } => {
    const signal = useShaperEntityFocusSignal();
    const ref = useRef<HTMLDivElement>(null);
    const [focused, setFocused] = useState(false);
    const expandSignal = signal?.id === entityId ? signal.nonce : null;

    useEffect(() => {
        if (expandSignal == null || !ref.current) return;
        ref.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        setFocused(true);
        const timer = setTimeout(() => setFocused(false), 1600);
        return () => clearTimeout(timer);
    }, [expandSignal]);

    return { ref, focused, expandSignal };
};
