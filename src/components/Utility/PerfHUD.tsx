import React, { useState, useEffect } from 'react';
import { perfMonitor } from '../../utils/perfMonitor';
import { useMessageStore } from '../../stores/useMessageStore';
import { getFastMapMetrics } from '../Mapper/performance/fastMapTelemetry';

const PERF_FLAG = 'mume_perf_hud';

const fmtMs = (ms: number | null | undefined) =>
    ms == null ? '—' : `${ms.toFixed(1)}ms`;
const fmtKB = (bytes: number | null | undefined) =>
    bytes == null ? '—' : `${(bytes / 1024).toFixed(0)}KB`;

const Row: React.FC<{ label: string; value: React.ReactNode; warn?: boolean }> = ({ label, value, warn }) => (
    <div data-perf-label={label} style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
        <span style={{ color: '#888' }}>{label}</span>
        <span style={{ color: warn ? '#ff6b6b' : '#7dd3fc', fontWeight: 600 }}>{value}</span>
    </div>
);

export const PerfHUD: React.FC = () => {
    const [isVisible, setIsVisible] = useState(() => {
        try { return localStorage.getItem(PERF_FLAG) === '1'; } catch { return false; }
    });
    const [snap, setSnap] = useState<ReturnType<typeof perfMonitor.getSnapshot> | null>(null);

    // Toggle: Ctrl+Shift+P (desktop) or window.__PERF__.toggle()
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.ctrlKey && e.shiftKey && (e.key === 'P' || e.key === 'p')) {
                e.preventDefault();
                setIsVisible(v => !v);
            }
        };
        window.addEventListener('keydown', onKey);
        (perfMonitor as any).toggle = () => setIsVisible(v => !v);
        (perfMonitor as any).show = () => setIsVisible(true);
        return () => window.removeEventListener('keydown', onKey);
    }, []);

    // Drive the collector on/off with visibility so it costs nothing when hidden.
    useEffect(() => {
        perfMonitor.enabled = isVisible;
        window.dispatchEvent(new CustomEvent('mume-perf-hud-toggle', { detail: { enabled: isVisible } }));
        try {
            if (isVisible) localStorage.setItem(PERF_FLAG, '1');
            else localStorage.removeItem(PERF_FLAG);
        } catch { }
        if (!isVisible) return;
        const id = setInterval(() => setSnap(perfMonitor.getSnapshot()), 500);
        return () => clearInterval(id);
    }, [isVisible]);

    const userMsgCount = useMessageStore(s => s.user.length);
    const fastMap = getFastMapMetrics();

    if (!isVisible || !snap) return null;

    const heapPct = snap.heapUsedMB && snap.heapLimitMB
        ? (snap.heapUsedMB / snap.heapLimitMB) * 100 : null;

    return (
        <div data-testid="performance-hud" style={{
            position: 'fixed', top: 8, left: 8, zIndex: 100000000,
            background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)',
            border: '1px solid rgba(125,211,252,0.4)', borderRadius: 8,
            padding: '8px 10px', minWidth: 230,
            fontFamily: "'JetBrains Mono','Roboto Mono',monospace", fontSize: '0.68rem',
            color: '#fff', userSelect: 'none', pointerEvents: 'auto',
            display: 'flex', flexDirection: 'column', gap: 3,
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                <strong style={{ letterSpacing: '0.08em', color: '#7dd3fc' }}>PERF</strong>
                <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => perfMonitor.resetPeaks()} style={btn}>reset</button>
                    <button onClick={() => setIsVisible(false)} style={btn}>×</button>
                </div>
            </div>

            <Row label="FPS" value={snap.fps} warn={snap.fps > 0 && snap.fps < 30} />
            {fastMap && <>
                <Row label="worker map FPS" value={fastMap.fps} warn={fastMap.fps > 0 && fastMap.fps < 30} />
                <Row label="worker frame interval p95/max" value={`${fmtMs(fastMap.frameIntervalP95Ms)} / ${fmtMs(fastMap.frameIntervalMaxMs)}`} warn={fastMap.frameIntervalP95Ms > 33} />
                <Row label="worker render p95/max" value={`${fmtMs(fastMap.renderP95Ms)} / ${fmtMs(fastMap.renderMaxMs)}`} warn={fastMap.renderP95Ms > 16} />
                <Row label="static mesh build" value={`${fmtMs(fastMap.staticBuildMs)} (${fastMap.mapLoads} loads)`} />
                <Row label="map updates/coalesced" value={`${fastMap.updates} / ${fastMap.coalescedUpdates}`} />
                <Row label="worker rooms" value={fastMap.roomCount} />
            </>}
            <Row label="draw avg/p95" value={`${fmtMs(snap.drawAvgMs)} / ${fmtMs(snap.drawP95Ms)}`} warn={snap.drawP95Ms > 16} />
            <Row label="draw peak" value={fmtMs(snap.peakDrawMs)} warn={snap.peakDrawMs > 33} />
            <Row label="parser worker avg/max" value={`${fmtMs(snap.parserWorkerAvgMs)} / ${fmtMs(snap.parserWorkerMaxMs)}`} warn={snap.parserWorkerMaxMs > 50} />
            <Row label="parser sync avg/max" value={`${fmtMs(snap.parserSyncAvgMs)} / ${fmtMs(snap.parserSyncMaxMs)}`} warn={snap.parserSyncMaxMs > 50} />
            <Row label="worst frame gap" value={fmtMs(snap.intervalMaxMs)} warn={snap.intervalMaxMs > 100} />
            <Row label="main-thread long tasks/10s" value={`${snap.longTasks10s} (max ${fmtMs(snap.longTaskMaxMs)})`} warn={snap.longTaskMaxMs > 50} />
            <Row label="cache rebuilds/s" value={snap.rebuildsPerSec} warn={snap.rebuildsPerSec > 4} />
            {snap.rebuildReasons && (
                <Row label="↳ triggers" value={snap.rebuildReasons} />
            )}

            <div style={{ height: 1, background: 'rgba(255,255,255,0.12)', margin: '3px 0' }} />

            <Row label="rebuild peak" value={fmtMs(snap.peakRebuildMs)} warn={snap.peakRebuildMs > 33} />
            {snap.peakRebuild && (
                <Row
                    label="↳ gather/terr/feat"
                    value={`${snap.peakRebuild.gather.toFixed(0)} / ${snap.peakRebuild.terrain.toFixed(0)} / ${snap.peakRebuild.feature.toFixed(0)}ms`}
                />
            )}
            {snap.peakRebuild && (
                <Row label="↳ tiles drawn" value={snap.peakRebuild.tiles} />
            )}
            <Row
                label="↳ wall/icon (last)"
                value={`${fmtMs(snap.lastWallMs)} / ${fmtMs(snap.lastIconMs)}`}
                warn={snap.lastWallMs > 40}
            />
            {snap.lastTerrainSplit && (
                <Row
                    label="↳ terr/local/grid/zone"
                    value={`${snap.lastTerrainSplit.terrains.toFixed(0)} / ${snap.lastTerrainSplit.local.toFixed(0)} / ${snap.lastTerrainSplit.grid.toFixed(0)} / ${snap.lastTerrainSplit.zone.toFixed(0)}ms`}
                    warn={snap.lastTerrainSplit.terrains > 30}
                />
            )}

            <div style={{ height: 1, background: 'rgba(255,255,255,0.12)', margin: '3px 0' }} />

            <Row label="rooms" value={snap.roomCount} />
            <Row label="user log" value={userMsgCount} />
            <Row label="full save" value={`${fmtMs(snap.lastFullSave?.ms)} (${fmtKB(snap.lastFullSave?.bytes)})`} warn={(snap.lastFullSave?.ms ?? 0) > 8} />
            <Row label="full save peak" value={fmtMs(snap.peakFullSaveMs)} warn={snap.peakFullSaveMs > 16} />

            <div style={{ height: 1, background: 'rgba(255,255,255,0.12)', margin: '3px 0' }} />

            {snap.heapUsedMB != null ? (
                <Row
                    label="JS heap"
                    value={`${snap.heapUsedMB.toFixed(0)}MB${heapPct != null ? ` (${heapPct.toFixed(0)}%)` : ''}`}
                    warn={heapPct != null && heapPct > 70}
                />
            ) : (
                <Row label="JS heap" value="n/a (non-Chrome)" />
            )}
        </div>
    );
};

const btn: React.CSSProperties = {
    background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.18)',
    borderRadius: 4, color: '#ccc', cursor: 'pointer', fontSize: '0.62rem',
    padding: '1px 6px', fontFamily: 'inherit',
};
