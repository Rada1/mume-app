import { useState, useCallback } from 'react';

const STORAGE_KEY = 'mume-keyword-overrides';

export const useKeywordOverrides = () => {
    const [overrides, setOverrides] = useState<Record<string, string>>(() => {
        try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch { return {}; }
    });

    const setOverride = useCallback((context: string, keyword: string) => {
        setOverrides(prev => {
            const next = { ...prev, [context]: keyword };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
            return next;
        });
    }, []);

    const removeOverride = useCallback((context: string) => {
        setOverrides(prev => {
            const { [context]: _, ...rest } = prev;
            localStorage.setItem(STORAGE_KEY, JSON.stringify(rest));
            return rest;
        });
    }, []);

    return { overrides, setOverride, removeOverride };
};
