/**
 * @file ZoneBackgroundPositionSettings.tsx
 * @description Per-zone positioning controls for the immersion background image.
 */

// --- Logic Section ---
import React from 'react';
import { useGame } from '../../context/GameContext';
import { MapperContext } from '../../context/MapperContext';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { normalizeZoneBackgroundKey } from '../../utils/zoneBackgroundPosition';
import type { MapperPreloadedRoom } from '../../types/mapperRoomTracking';
import ZoneBackgroundPositionEditor from './ZoneBackgroundPositionEditor';

const ZoneBackgroundPositionSettings: React.FC = () => {
    const { roomZone } = useGame();
    const mapper = React.useContext(MapperContext);
    const {
        bgImage,
        mapBackgroundVisuals,
        zoneBackgroundPositions,
        zoneFilters,
        setMapBackgroundVisuals,
        setZoneBackgroundPosition
    } = useSettingsStore();
    const activeZone = normalizeZoneBackgroundKey(roomZone);

    const zones = React.useMemo(() => {
        const result = new Set<string>();
        const addZone = (zone: string | null | undefined) => {
            const key = normalizeZoneBackgroundKey(zone);
            if (key) result.add(key);
        };

        addZone(activeZone);
        Object.keys(zoneFilters).forEach(addZone);
        Object.keys(zoneBackgroundPositions).forEach(addZone);

        const preloadedRooms = Object.values(mapper?.preloadedCoordsRef.current || {}) as MapperPreloadedRoom[];
        preloadedRooms.forEach(room => {
            const zone = room[9];
            if (typeof zone === 'string') addZone(zone);
        });

        return Array.from(result).sort((a, b) => a.localeCompare(b));
    }, [activeZone, mapper?.performanceMapRevision, mapper?.preloadedCoordsRef, zoneBackgroundPositions, zoneFilters]);

    const [selectedZone, setSelectedZone] = React.useState(activeZone);
    React.useEffect(() => {
        if (activeZone && zones.includes(activeZone)) setSelectedZone(activeZone);
        else if (!zones.includes(selectedZone) && zones[0]) setSelectedZone(zones[0]);
    }, [activeZone, selectedZone, zones]);

    if (zones.length === 0) return null;

    const position = zoneBackgroundPositions[selectedZone] || { x: 0, y: 0 };

    return (
        <div className="setting-group" style={{ border: '1px solid var(--border-modal)', background: 'var(--bg-panel)', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
                <div>
                    <label className="setting-label" style={{ color: 'var(--accent)', fontWeight: 'bold', margin: 0 }}>Immersion Background Viewpoint</label>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '4px' }}>
                        Adjust brightness, blur, and zoom, then drag to save a view per zone. Room lighting stays in the corner vignettes.
                    </div>
                </div>
                <label htmlFor="zone-background-position-zone" style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>Zone</label>
                <select
                    id="zone-background-position-zone"
                    aria-label="Zone for background viewpoint"
                    value={selectedZone}
                    onChange={event => setSelectedZone(event.target.value)}
                    style={{ background: 'var(--input-bg)', color: 'var(--text-primary)', border: '1px solid var(--border-modal)', padding: '5px 8px', borderRadius: '4px', maxWidth: '45%' }}
                >
                    {zones.map(zone => (
                        <option key={zone} value={zone}>
                            {zone.replace(/\b\w/g, letter => letter.toUpperCase())}{zone === activeZone ? ' (Current)' : ''}
                        </option>
                    ))}
                </select>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(130px, 1fr) minmax(120px, 2fr) 44px', alignItems: 'center', gap: '10px', borderTop: '1px solid var(--border-modal)', padding: '10px 0' }}>
                <label className="setting-label" htmlFor="immersion-background-brightness" style={{ margin: 0 }}>Background Brightness</label>
                <input
                    id="immersion-background-brightness"
                    aria-label="Immersion background brightness"
                    type="range"
                    min={0.05}
                    max={1.4}
                    step={0.01}
                    value={mapBackgroundVisuals.brightness}
                    onChange={event => setMapBackgroundVisuals({ brightness: Number(event.target.value) })}
                    style={{ width: '100%', accentColor: 'var(--accent)' }}
                />
                <span style={{ color: 'var(--text-dim)', fontSize: '0.72rem', textAlign: 'right' }}>
                    {Math.round(mapBackgroundVisuals.brightness * 100)}%
                </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(130px, 1fr) minmax(120px, 2fr) 44px', alignItems: 'center', gap: '10px', borderTop: '1px solid var(--border-modal)', padding: '10px 0' }}>
                <label className="setting-label" htmlFor="immersion-background-blur" style={{ margin: 0 }}>Background Blur</label>
                <input
                    id="immersion-background-blur"
                    aria-label="Immersion background blur"
                    type="range"
                    min={0}
                    max={12}
                    step={0.5}
                    value={mapBackgroundVisuals.blur}
                    onChange={event => setMapBackgroundVisuals({ blur: Number(event.target.value) })}
                    style={{ width: '100%', accentColor: 'var(--accent)' }}
                />
                <span style={{ color: 'var(--text-dim)', fontSize: '0.72rem', textAlign: 'right' }}>
                    {mapBackgroundVisuals.blur.toFixed(1)}px
                </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(130px, 1fr) minmax(120px, 2fr) 44px', alignItems: 'center', gap: '10px', borderTop: '1px solid var(--border-modal)', padding: '10px 0' }}>
                <label className="setting-label" htmlFor="immersion-background-zoom" style={{ margin: 0 }}>Background Zoom</label>
                <input
                    id="immersion-background-zoom"
                    aria-label="Immersion background zoom"
                    type="range"
                    min={50}
                    max={200}
                    step={1}
                    value={mapBackgroundVisuals.zoom * 100}
                    onChange={event => setMapBackgroundVisuals({ zoom: Number(event.target.value) / 100 })}
                    style={{ width: '100%', accentColor: 'var(--accent)' }}
                />
                <span style={{ color: 'var(--text-dim)', fontSize: '0.72rem', textAlign: 'right' }}>
                    {Math.round(mapBackgroundVisuals.zoom * 100)}%
                </span>
            </div>
            <ZoneBackgroundPositionEditor
                imageUrl={bgImage || '/assets/Pictures/UIPics/darkmap.png'}
                position={position}
                brightness={mapBackgroundVisuals.brightness}
                blur={mapBackgroundVisuals.blur}
                zoom={mapBackgroundVisuals.zoom}
                onCommit={next => setZoneBackgroundPosition(selectedZone, next)}
            />
        </div>
    );
};

export default ZoneBackgroundPositionSettings;
