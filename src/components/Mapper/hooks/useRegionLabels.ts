import { useCallback, useEffect, useRef, useState } from 'react';
import { RegionLabel } from '../mapperTypes';

const STORAGE_KEY = 'mume_region_labels_global_v1';

const genId = () => 'rgn_' + Math.random().toString(36).slice(2, 10);

const loadFromStorage = (): Record<string, RegionLabel> => {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return {};
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') return parsed;
    } catch {}
    return {};
};

export const useRegionLabels = () => {
    const [regionLabels, setRegionLabels] = useState<Record<string, RegionLabel>>(loadFromStorage);
    const [regionLabelEditMode, setRegionLabelEditMode] = useState(false);
    const regionLabelsRef = useRef(regionLabels);

    useEffect(() => { regionLabelsRef.current = regionLabels; }, [regionLabels]);

    // Persist whenever labels change (debounced).
    useEffect(() => {
        const t = setTimeout(() => {
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(regionLabels));
            } catch (e) {
                console.warn('[RegionLabels] Failed to persist:', e);
            }
        }, 400);
        return () => clearTimeout(t);
    }, [regionLabels]);

    const addRegionLabel = useCallback((partial: Partial<RegionLabel> & { text: string; x: number; y: number; z: number }) => {
        const id = partial.id || genId();
        const label: RegionLabel = {
            id,
            text: partial.text,
            x: partial.x,
            y: partial.y,
            z: partial.z,
            fontSize: partial.fontSize ?? 80,
            color: partial.color,
            opacity: partial.opacity,
            letterSpacing: partial.letterSpacing,
            rotation: partial.rotation,
            createdAt: Date.now()
        };
        setRegionLabels(prev => ({ ...prev, [id]: label }));
        return id;
    }, []);

    const updateRegionLabel = useCallback((id: string, patch: Partial<RegionLabel>) => {
        setRegionLabels(prev => {
            if (!prev[id]) return prev;
            return { ...prev, [id]: { ...prev[id], ...patch, id } };
        });
    }, []);

    const deleteRegionLabel = useCallback((id: string) => {
        setRegionLabels(prev => {
            if (!prev[id]) return prev;
            const next = { ...prev };
            delete next[id];
            return next;
        });
    }, []);

    return {
        regionLabels,
        regionLabelsRef,
        addRegionLabel,
        updateRegionLabel,
        deleteRegionLabel,
        regionLabelEditMode,
        setRegionLabelEditMode
    };
};
