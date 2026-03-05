import { useState, useEffect, useCallback } from 'react';

/**
 * A hook that works like useState but persists the value to localStorage.
 */
export function usePersistentState<T>(key: string, initialValue: T): [T, (val: T | ((prev: T) => T)) => void] {
    const [state, setState] = useState<T>(() => {
        try {
            const saved = localStorage.getItem(key);
            if (saved !== null) {
                return JSON.parse(saved);
            }
        } catch (e) {
            console.warn(`Failed to load ${key} from localStorage`, e);
        }
        return initialValue;
    });

    useEffect(() => {
        try {
            localStorage.setItem(key, JSON.stringify(state));
        } catch (e) {
            console.warn(`Failed to save ${key} to localStorage`, e);
        }
    }, [key, state]);

    return [state, setState];
}
