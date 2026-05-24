/**
 * @file useMapperTracing.ts
 * @description Custom React hook managing Middle-earth background map tracing state,
 * alignment calibration, and vector drawing calculations.
 */

import { useState, useCallback, useMemo } from 'react';
import middleEarthVectorsData from '../data/middle_earth_vectors.json';
import { MiddleEarthVectors, LabelVector } from '../mapperTypes';

// --- Logic Section: useMapperTracing Hook ---

export const useMapperTracing = (triggerRender: () => void) => {
    // Detect tracing/dev mode via URL parameters
    const isTracingMode = useMemo(() => {
        if (typeof window === 'undefined') return false;
        const params = new URLSearchParams(window.location.search);
        return params.get('trace') === 'true' || params.get('dev') === 'true';
    }, []);

    // Load calibration from vectors JSON or fallback to defaults
    const [calibration, setCalibration] = useState(() => {
        const cal = (middleEarthVectorsData as any).calibration;
        return cal ? {
            bgScale: typeof cal.bgScale === 'number' ? cal.bgScale : 1.6,
            bgTranslateX: typeof cal.bgTranslateX === 'number' ? cal.bgTranslateX : -704,
            bgTranslateY: typeof cal.bgTranslateY === 'number' ? cal.bgTranslateY : -3488,
            bgOpacity: 1.0
        } : {
            bgScale: 1.6,
            bgTranslateX: -704,
            bgTranslateY: -3488,
            bgOpacity: 1.0
        };
    });

    // Initialize vectors from JSON
    const [vectors, setVectors] = useState<MiddleEarthVectors>(() => {
        return {
            coastlines: middleEarthVectorsData.coastlines || [],
            rivers: middleEarthVectorsData.rivers || [],
            mountains: middleEarthVectorsData.mountains || [],
            forests: middleEarthVectorsData.forests || [],
            labels: (middleEarthVectorsData.labels || []) as LabelVector[]
        };
    });

    const [activePath, setActivePath] = useState<number[][]>([]);
    const [hoverCoord, setHoverCoord] = useState<{ mx: number; my: number; px: number; py: number } | null>(null);
    const [anchorRegisterState, setAnchorRegisterState] = useState<'idle' | 'mithlond' | 'hobbiton' | 'bree' | 'rivendell'>('idle');
    const [anchors, setAnchors] = useState<{
        mithlond: { px: number; py: number } | null;
        hobbiton: { px: number; py: number } | null;
        bree: { px: number; py: number } | null;
        rivendell: { px: number; py: number } | null;
    }>({
        mithlond: null,
        hobbiton: null,
        bree: null,
        rivendell: null
    });

    const onTraceClick = useCallback((wx: number, wy: number) => {
        const px = (wx - calibration.bgTranslateX) / calibration.bgScale;
        const py = (wy - calibration.bgTranslateY) / calibration.bgScale;

        if (anchorRegisterState !== 'idle') {
            setAnchors(prev => {
                const next = { ...prev };
                next[anchorRegisterState] = { px, py };
                return next;
            });
            setAnchorRegisterState('idle');
            triggerRender();
            return;
        }

        setActivePath(prev => [...prev, [px, py]]);
        triggerRender();
    }, [calibration, anchorRegisterState, triggerRender]);

    const onTraceHover = useCallback((wx: number, wy: number) => {
        const px = (wx - calibration.bgTranslateX) / calibration.bgScale;
        const py = (wy - calibration.bgTranslateY) / calibration.bgScale;
        setHoverCoord({ mx: wx, my: wy, px, py });
    }, [calibration]);

    const onAddPath = useCallback((layer: 'coastlines' | 'rivers' | 'mountains' | 'forests') => {
        if (activePath.length < 2) return;
        setVectors(prev => {
            const next = { ...prev };
            next[layer] = [...next[layer], activePath];
            return next;
        });
        setActivePath([]);
        triggerRender();
    }, [activePath, triggerRender]);

    const onAddLabel = useCallback((text: string, size: number) => {
        if (!hoverCoord) return;
        setVectors(prev => {
            const next = { ...prev };
            next.labels = [...next.labels, { text, x: hoverCoord.px, y: hoverCoord.py, size }];
            return next;
        });
        triggerRender();
    }, [hoverCoord, triggerRender]);

    const onClearPath = useCallback(() => {
        setActivePath([]);
        triggerRender();
    }, [triggerRender]);

    const onUndoPoint = useCallback(() => {
        setActivePath(prev => prev.slice(0, -1));
        triggerRender();
    }, [triggerRender]);

    const onClearAnchors = useCallback(() => {
        setAnchors({ mithlond: null, hobbiton: null, bree: null, rivendell: null });
        triggerRender();
    }, [triggerRender]);

    const onAutoCalibrate = useCallback(() => {
        const GRID_SIZE = 16;
        const landmarks: Record<string, { x: number; y: number }> = {
            mithlond: { x: 60 * GRID_SIZE, y: -76 * GRID_SIZE },
            hobbiton: { x: 156 * GRID_SIZE, y: -68 * GRID_SIZE },
            bree: { x: 227 * GRID_SIZE, y: -97 * GRID_SIZE },
            rivendell: { x: 393 * GRID_SIZE, y: 1 * GRID_SIZE }
        };

        const activeAnchors: { key: string; m: { x: number; y: number }; p: { px: number; py: number } }[] = [];
        for (const [key, pCoord] of Object.entries(anchors)) {
            if (pCoord) {
                activeAnchors.push({
                    key,
                    m: landmarks[key],
                    p: pCoord
                });
            }
        }

        if (activeAnchors.length < 2) {
            alert('Please register at least 2 anchor points before calibrating!');
            return;
        }

        let scaleSum = 0;
        let scaleCount = 0;
        for (let i = 0; i < activeAnchors.length; i++) {
            for (let j = i + 1; j < activeAnchors.length; j++) {
                const a1 = activeAnchors[i];
                const a2 = activeAnchors[j];
                const dm = Math.hypot(a1.m.x - a2.m.x, a1.m.y - a2.m.y);
                const dp = Math.hypot(a1.p.px - a2.p.px, a1.p.py - a2.p.py);
                if (dp > 0) {
                    scaleSum += dm / dp;
                    scaleCount++;
                }
            }
        }

        const bgScale = scaleCount > 0 ? scaleSum / scaleCount : 1.6;

        let txSum = 0;
        let tySum = 0;
        for (const anchor of activeAnchors) {
            txSum += anchor.m.x - anchor.p.px * bgScale;
            tySum += anchor.m.y - anchor.p.py * bgScale;
        }

        const bgTranslateX = txSum / activeAnchors.length;
        const bgTranslateY = tySum / activeAnchors.length;

        setCalibration(prev => ({
            ...prev,
            bgScale,
            bgTranslateX,
            bgTranslateY
        }));
        triggerRender();
    }, [anchors, triggerRender]);

    const onSaveAllToVectorsJson = useCallback(() => {
        fetch('/api/save-vectors', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                calibration,
                ...vectors
            })
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                alert('Saved vectors and calibration successfully to middle_earth_vectors.json!');
            } else {
                alert('Error saving vectors: ' + (data.error || 'Unknown error'));
            }
        })
        .catch(err => {
            alert('Error saving vectors: ' + err.message);
        });
    }, [calibration, vectors]);

    return {
        isTracingMode,
        calibration,
        setCalibration,
        vectors,
        setVectors,
        activePath,
        hoverCoord,
        anchorRegisterState,
        setAnchorRegisterState,
        anchors,
        onTraceClick,
        onTraceHover,
        onAddPath,
        onAddLabel,
        onClearPath,
        onUndoPoint,
        onClearAnchors,
        onAutoCalibrate,
        onSaveAllToVectorsJson
    };
};
