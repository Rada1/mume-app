/**
 * @file MapVisualSettings.tsx
 * @description Live visual adjustment controls for terrain tiles and the background map.
 */

import React from 'react';
import { RotateCcw, Download, Upload } from 'lucide-react';
import { DEFAULT_MAP_TILE_VISUALS, useSettingsStore } from '../../stores/useSettingsStore';
import { useGame } from '../../context/GameContext';
import { useContext } from 'react';
import { MapperContext } from '../../context/MapperContext';
import {
    WALL_COLOR,
    ROAD_COLOR_DARK,
    PATH_COLOR_DARK,
    DEFAULT_TERRAIN_COLORS,
    getTerrainColor
} from '../Mapper/mapperUtils';
import type { ZoneVisualConfig } from '../Mapper/zoneFilters';

interface SliderRowProps {
    label: string;
    value: number;
    min: number;
    max: number;
    step: number;
    suffix?: string;
    onChange: (value: number) => void;
}

const sectionStyle: React.CSSProperties = {
    border: '1px solid var(--border-modal)',
    background: 'var(--bg-panel)',
    padding: '15px',
    borderRadius: '8px',
    marginBottom: '20px'
};

const rowStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'minmax(110px, 1fr) minmax(150px, 2fr) 58px',
    alignItems: 'center',
    gap: '10px',
    padding: '8px 0',
    borderTop: '1px solid var(--border-modal)'
};

const terrainGridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
    gap: '8px 12px',
    paddingTop: '8px',
    borderTop: '1px solid var(--border-modal)'
};

const formatValue = (value: number, suffix?: string) => {
    if (suffix === 'deg') return `${Math.round(value)}deg`;
    if (suffix === '%') return `${Math.round(value * 100)}%`;
    return value.toFixed(2);
};

const SliderRow: React.FC<SliderRowProps> = ({ label, value, min, max, step, suffix, onChange }) => (
    <div style={rowStyle}>
        <label className="setting-label" style={{ margin: 0 }}>{label}</label>
        <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={(event) => onChange(Number(event.target.value))}
            style={{ width: '100%' }}
        />
        <span style={{ color: 'var(--text-dim)', fontSize: '0.72rem', textAlign: 'right' }}>
            {formatValue(value, suffix)}
        </span>
    </div>
);

const ColorRow: React.FC<{ label: string; value: string; onChange: (value: string) => void }> = ({ label, value, onChange }) => (
    <div style={rowStyle}>
        <label className="setting-label" style={{ margin: 0 }}>{label}</label>
        <input
            type="color"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            style={{ width: '54px', height: '30px', background: 'transparent', border: 'none', padding: 0 }}
        />
        <span style={{ color: 'var(--text-dim)', fontSize: '0.72rem', textAlign: 'right' }}>{value}</span>
    </div>
);

const TerrainColorRow: React.FC<{ label: string; value: string; onChange: (value: string) => void }> = ({ label, value, onChange }) => (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 42px 64px', alignItems: 'center', gap: '8px' }}>
        <label className="setting-label" style={{ margin: 0 }}>{label}</label>
        <input
            type="color"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            style={{ width: '38px', height: '26px', background: 'transparent', border: 'none', padding: 0 }}
        />
        <span style={{ color: 'var(--text-dim)', fontSize: '0.68rem', textAlign: 'right' }}>{value}</span>
    </div>
);

const ZoneColorRow: React.FC<{
    label: string;
    value: string;
    isOverridden: boolean;
    onReset: () => void;
    onChange: (val: string) => void;
}> = ({ label, value, isOverridden, onReset, onChange }) => (
    <div style={rowStyle}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
            <label className="setting-label" style={{ margin: 0 }}>{label}</label>
            <span style={{ fontSize: '0.68rem', color: isOverridden ? 'var(--accent)' : 'var(--text-dim)' }}>
                {isOverridden ? 'Customized' : 'Inherited from global'}
            </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
                type="color"
                value={value}
                onChange={(event) => onChange(event.target.value)}
                style={{ width: '54px', height: '30px', background: 'transparent', border: 'none', padding: 0, cursor: 'pointer' }}
            />
            {isOverridden && (
                <button
                    type="button"
                    onClick={onReset}
                    className="btn-secondary"
                    title="Reset to Inherited"
                    style={{
                        padding: '4px 8px',
                        fontSize: '0.7rem',
                        width: 'auto',
                        marginTop: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}
                >
                    <RotateCcw size={11} />
                </button>
            )}
        </div>
        <span style={{ color: 'var(--text-dim)', fontSize: '0.72rem', textAlign: 'right' }}>{value}</span>
    </div>
);

const ZoneTerrainColorRow: React.FC<{
    label: string;
    value: string;
    isOverridden: boolean;
    onReset: () => void;
    onChange: (val: string) => void;
}> = ({ label, value, isOverridden, onReset, onChange }) => (
    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr auto 64px', alignItems: 'center', gap: '6px', padding: '4px 0' }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
            <label className="setting-label" style={{ margin: 0, fontSize: '0.8rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</label>
            <span style={{ fontSize: '0.62rem', color: isOverridden ? 'var(--accent)' : 'var(--text-dim)' }}>
                {isOverridden ? 'Custom' : 'Inherit'}
            </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <input
                type="color"
                value={value}
                onChange={(event) => onChange(event.target.value)}
                style={{ width: '38px', height: '26px', background: 'transparent', border: 'none', padding: 0, cursor: 'pointer' }}
            />
            {isOverridden && (
                <button
                    type="button"
                    onClick={onReset}
                    className="btn-secondary"
                    title="Reset to Inherited"
                    style={{
                        padding: '2px 4px',
                        width: 'auto',
                        marginTop: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}
                >
                    <RotateCcw size={10} />
                </button>
            )}
        </div>
        <span style={{ color: 'var(--text-dim)', fontSize: '0.68rem', textAlign: 'right' }}>{value}</span>
    </div>
);

const MapVisualSettings: React.FC = () => {
    const gameContext = useGame() as any;
    const currentZone = gameContext?.roomZone || '';

    const {
        theme,
        mapTileVisuals,
        mapBackgroundVisuals,
        zoneFilters,
        setMapTileVisuals,
        setMapBackgroundVisuals,
        setZoneFilter,
        resetZoneFilters,
        resetMapVisuals,
        zoneFocusGrayscale,
        setZoneFocusGrayscale,
        optimisticMovement,
        setOptimisticMovement
    } = useSettingsStore();

    const mapperContext = useContext(MapperContext);
    const preloaded = mapperContext?.preloadedCoordsRef?.current || {};

    const importRef = React.useRef<HTMLInputElement>(null);

    const handleExport = () => {
        const data = JSON.stringify({ mapTileVisuals, mapBackgroundVisuals, zoneFilters }, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'mume-map-visuals.json';
        a.click();
        URL.revokeObjectURL(a.href);
    };

    const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                const parsed = JSON.parse(ev.target?.result as string);
                if (parsed.mapTileVisuals) setMapTileVisuals(parsed.mapTileVisuals);
                if (parsed.mapBackgroundVisuals) setMapBackgroundVisuals(parsed.mapBackgroundVisuals);
                if (parsed.zoneFilters) {
                    Object.entries(parsed.zoneFilters).forEach(([zone, config]: [string, any]) => {
                        if (config.dark) setZoneFilter(zone, true, config.dark);
                        if (config.light) setZoneFilter(zone, false, config.light);
                    });
                }
            } catch {
                alert('Invalid file — could not import map visuals.');
            }
        };
        reader.readAsText(file);
        e.target.value = '';
    };

    const scannedZones = React.useMemo(() => {
        const BLACKLISTED_ZONES = new Set([
            'swanfleet',
            'valinor',
        ]);
        const zones = new Set<string>();
        Object.keys(zoneFilters || {}).forEach(k => {
            const normalizedKey = k.replace(/-/g, ' ');
            if (!BLACKLISTED_ZONES.has(normalizedKey)) {
                zones.add(normalizedKey);
            }
        });
        
        Object.values(preloaded).forEach((rData: any) => {
            const zName = rData?.[9];
            if (zName && typeof zName === 'string') {
                const trimmed = zName.toLowerCase().trim().replace(/^the\s+/i, '').replace(/-/g, ' ');
                if (trimmed && !BLACKLISTED_ZONES.has(trimmed)) {
                    zones.add(trimmed);
                }
            }
        });
        
        return Array.from(zones).sort();
    }, [preloaded, zoneFilters]);

    const [selectedZone, setSelectedZone] = React.useState('shire');
    const editMode = 'dark';

    React.useEffect(() => {
        if (currentZone) {
            const normalized = currentZone.toLowerCase().trim().replace(/^the\s+/i, '').replace(/-/g, ' ');
            const matchedKey = scannedZones.find(key => normalized.includes(key) || key.includes(normalized));
            if (matchedKey) {
                setSelectedZone(matchedKey);
            }
        }
    }, [currentZone, scannedZones]);

    const currentThemeSettings = React.useMemo<ZoneVisualConfig>(() => {
        const defaultVisuals: ZoneVisualConfig = {
            wallColor: '',
            roadColor: '',
            pathColor: '',
            terrainColors: {}
        };
        const zoneConfig = zoneFilters[selectedZone];
        if (!zoneConfig) return defaultVisuals;
        const modeConfig = editMode === 'dark' ? zoneConfig.dark : zoneConfig.light;
        return {
            ...defaultVisuals,
            ...modeConfig,
            terrainColors: {
                ...defaultVisuals.terrainColors,
                ...(modeConfig?.terrainColors || {})
            }
        };
    }, [zoneFilters, selectedZone, editMode]);

    return (
        <div style={sectionStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
                <div>
                    <label className="setting-label" style={{ color: 'var(--accent)', fontWeight: 'bold', margin: 0 }}>Map Visual Tuning</label>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '4px' }}>
                        Adjust terrain tiles and the background image live while we search for the right mood.
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="btn-secondary" style={{ marginTop: 0, width: 'auto' }} onClick={handleExport}>
                        <Download size={15} /> Export
                    </button>
                    <button className="btn-secondary" style={{ marginTop: 0, width: 'auto' }} onClick={() => importRef.current?.click()}>
                        <Upload size={15} /> Import
                    </button>
                    <input ref={importRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleImport} />
                    <button className="btn-secondary" style={{ marginTop: 0, width: 'auto' }} onClick={resetMapVisuals}>
                        <RotateCcw size={15} /> Reset
                    </button>
                </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', padding: '8px 0', borderTop: '1px solid var(--border-modal)' }}>
                <div>
                    <label className="setting-label" style={{ margin: 0 }}>Gray Out Other Zones</label>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '4px' }}>Dim rooms outside the zone you're currently in to highlight the active zone.</div>
                </div>
                <button
                    className={`setting-toggle ${zoneFocusGrayscale ? 'active' : ''}`}
                    onClick={() => setZoneFocusGrayscale(!zoneFocusGrayscale)}
                    style={{
                        height: '24px', width: '45px', position: 'relative', border: 'none',
                        backgroundColor: zoneFocusGrayscale ? 'var(--accent)' : 'var(--input-bg)',
                        borderRadius: '12px', cursor: 'pointer', transition: 'all 0.3s', flexShrink: 0
                    }}
                >
                    <div style={{
                        width: '20px', height: '20px', background: '#fff', borderRadius: '50%',
                        position: 'absolute', top: '2px', left: zoneFocusGrayscale ? '22px' : '2px', transition: 'all 0.3s'
                    }} />
                </button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', padding: '8px 0', borderTop: '1px solid var(--border-modal)' }}>
                <div>
                    <label className="setting-label" style={{ margin: 0 }}>Predictive Movement</label>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '4px' }}>Move your marker the instant you send a command, gliding to the predicted room and bouncing back if blocked. Off: the marker only moves when the game confirms the room.</div>
                </div>
                <button
                    className={`setting-toggle ${optimisticMovement ? 'active' : ''}`}
                    onClick={() => setOptimisticMovement(!optimisticMovement)}
                    style={{
                        height: '24px', width: '45px', position: 'relative', border: 'none',
                        backgroundColor: optimisticMovement ? 'var(--accent)' : 'var(--input-bg)',
                        borderRadius: '12px', cursor: 'pointer', transition: 'all 0.3s', flexShrink: 0
                    }}
                >
                    <div style={{
                        width: '20px', height: '20px', background: '#fff', borderRadius: '50%',
                        position: 'absolute', top: '2px', left: optimisticMovement ? '22px' : '2px', transition: 'all 0.3s'
                    }} />
                </button>
            </div>

            <label className="setting-label" style={{ color: 'var(--accent)', fontWeight: 'bold', margin: '8px 0', display: 'block' }}>MUME Tiles</label>
            <ColorRow
                label="Wall Color"
                value={mapTileVisuals.wallColor || DEFAULT_MAP_TILE_VISUALS.wallColor}
                onChange={(wallColor) => setMapTileVisuals({ wallColor })}
            />
            <ColorRow
                label="Door Color"
                value={mapTileVisuals.doorColor || DEFAULT_MAP_TILE_VISUALS.doorColor || '#ffcc00'}
                onChange={(doorColor) => setMapTileVisuals({ doorColor })}
            />
            <ColorRow
                label="Road Color (Dark)"
                value={mapTileVisuals.roadColorDark || DEFAULT_MAP_TILE_VISUALS.roadColorDark || ROAD_COLOR_DARK}
                onChange={(roadColorDark) => setMapTileVisuals({ roadColorDark })}
            />
            <ColorRow
                label="Path Color (Dark)"
                value={mapTileVisuals.pathColorDark || DEFAULT_MAP_TILE_VISUALS.pathColorDark || PATH_COLOR_DARK}
                onChange={(pathColorDark) => setMapTileVisuals({ pathColorDark })}
            />
            <div style={terrainGridStyle}>
                {Object.keys(DEFAULT_TERRAIN_COLORS).map((terrain) => (
                    <TerrainColorRow
                        key={terrain}
                        label={terrain}
                        value={mapTileVisuals.terrainColors?.[terrain] || getTerrainColor(terrain, theme === 'dark')}
                        onChange={(color) => setMapTileVisuals({ terrainColors: { [terrain]: color } })}
                    />
                ))}
            </div>

            <label className="setting-label" style={{ color: 'var(--accent)', fontWeight: 'bold', margin: '18px 0 8px', display: 'block' }}>Background Map</label>
            <SliderRow label="Opacity" value={mapBackgroundVisuals.opacity} min={0} max={1} step={0.01} suffix="%" onChange={(opacity) => setMapBackgroundVisuals({ opacity })} />
            <SliderRow label="Brightness" value={mapBackgroundVisuals.brightness} min={0.05} max={1.4} step={0.01} suffix="%" onChange={(brightness) => setMapBackgroundVisuals({ brightness })} />
            <SliderRow label="Saturation" value={mapBackgroundVisuals.saturation} min={0} max={3} step={0.01} suffix="%" onChange={(saturation) => setMapBackgroundVisuals({ saturation })} />
            <SliderRow label="Grayscale" value={mapBackgroundVisuals.grayscale} min={0} max={1} step={0.01} suffix="%" onChange={(grayscale) => setMapBackgroundVisuals({ grayscale })} />
            <SliderRow label="Contrast" value={mapBackgroundVisuals.contrast} min={0.4} max={2.2} step={0.01} suffix="%" onChange={(contrast) => setMapBackgroundVisuals({ contrast })} />
            <SliderRow label="Hue" value={mapBackgroundVisuals.hue} min={-180} max={180} step={1} suffix="deg" onChange={(hue) => setMapBackgroundVisuals({ hue })} />
            <SliderRow label="Blur Min" value={mapBackgroundVisuals.blurMin} min={0} max={24} step={0.5} onChange={(blurMin) => setMapBackgroundVisuals({ blurMin })} />
            <SliderRow label="Blur Max" value={mapBackgroundVisuals.blurMax} min={0} max={60} step={0.5} onChange={(blurMax) => setMapBackgroundVisuals({ blurMax })} />
            <SliderRow label="Blur Slope" value={mapBackgroundVisuals.blurScale} min={0} max={60} step={0.5} onChange={(blurScale) => setMapBackgroundVisuals({ blurScale })} />
            <ColorRow label="Tint Color" value={mapBackgroundVisuals.tintColor} onChange={(tintColor) => setMapBackgroundVisuals({ tintColor })} />
            <SliderRow label="Tint Amount" value={mapBackgroundVisuals.tintOpacity} min={0} max={1} step={0.01} suffix="%" onChange={(tintOpacity) => setMapBackgroundVisuals({ tintOpacity })} />

            <label className="setting-label" style={{ color: 'var(--accent)', fontWeight: 'bold', margin: '18px 0 8px', display: 'block' }}>Zone Atmospheres</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '10px 0', borderTop: '1px solid var(--border-modal)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '0.85rem' }}>Select Zone to Edit:</span>
                    <select 
                        value={selectedZone} 
                        onChange={(e) => setSelectedZone(e.target.value)}
                        style={{
                            background: 'var(--bg-input, rgba(0,0,0,0.3))',
                            color: 'var(--text-main)',
                            border: '1px solid var(--border-modal)',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            fontSize: '0.85rem',
                            outline: 'none'
                        }}
                    >
                        {scannedZones.map(key => (
                            <option key={key} value={key}>
                                {key.charAt(0).toUpperCase() + key.slice(1)} {currentZone && currentZone.toLowerCase().includes(key) ? '(Active)' : ''}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Zone Visual Overrides */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '10px 0', borderTop: '1px solid var(--border-modal)' }}>
                    <label className="setting-label" style={{ color: 'var(--accent)', fontWeight: 'bold', margin: '4px 0', fontSize: '0.8rem' }}>Zone Elements</label>
                    <ZoneColorRow
                        label="Wall Color"
                        value={currentThemeSettings.wallColor || mapTileVisuals.wallColor || WALL_COLOR}
                        isOverridden={!!currentThemeSettings.wallColor}
                        onReset={() => setZoneFilter(selectedZone, editMode === 'dark', { wallColor: undefined })}
                        onChange={(color) => setZoneFilter(selectedZone, editMode === 'dark', { wallColor: color })}
                    />
                    <ZoneColorRow
                        label="Door Color"
                        value={currentThemeSettings.doorColor || mapTileVisuals.doorColor || '#ffcc00'}
                        isOverridden={!!currentThemeSettings.doorColor}
                        onReset={() => setZoneFilter(selectedZone, editMode === 'dark', { doorColor: undefined })}
                        onChange={(color) => setZoneFilter(selectedZone, editMode === 'dark', { doorColor: color })}
                    />
                    <ZoneColorRow
                        label="Road Color"
                        value={currentThemeSettings.roadColor || ROAD_COLOR_DARK}
                        isOverridden={!!currentThemeSettings.roadColor}
                        onReset={() => setZoneFilter(selectedZone, editMode === 'dark', { roadColor: undefined })}
                        onChange={(color) => setZoneFilter(selectedZone, editMode === 'dark', { roadColor: color })}
                    />
                    <ZoneColorRow
                        label="Path Color"
                        value={currentThemeSettings.pathColor || PATH_COLOR_DARK}
                        isOverridden={!!currentThemeSettings.pathColor}
                        onReset={() => setZoneFilter(selectedZone, editMode === 'dark', { pathColor: undefined })}
                        onChange={(color) => setZoneFilter(selectedZone, editMode === 'dark', { pathColor: color })}
                    />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '10px 0', borderTop: '1px solid var(--border-modal)', borderBottom: '1px solid var(--border-modal)' }}>
                    <label className="setting-label" style={{ color: 'var(--accent)', fontWeight: 'bold', margin: '4px 0', fontSize: '0.8rem' }}>Zone Terrains</label>
                    <div style={terrainGridStyle}>
                        {Object.keys(DEFAULT_TERRAIN_COLORS).map((terrain) => (
                            <ZoneTerrainColorRow
                                key={terrain}
                                label={terrain}
                                value={currentThemeSettings.terrainColors?.[terrain] || mapTileVisuals.terrainColors?.[terrain] || getTerrainColor(terrain, editMode === 'dark')}
                                isOverridden={!!currentThemeSettings.terrainColors?.[terrain]}
                                onReset={() => {
                                    const next = { ...currentThemeSettings.terrainColors };
                                    delete next[terrain];
                                    setZoneFilter(selectedZone, editMode === 'dark', { terrainColors: next });
                                }}
                                onChange={(color) => {
                                    const next = { ...currentThemeSettings.terrainColors, [terrain]: color };
                                    setZoneFilter(selectedZone, editMode === 'dark', { terrainColors: next });
                                }}
                            />
                        ))}
                    </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px' }}>
                    <button 
                        className="btn-secondary" 
                        onClick={() => {
                            if (window.confirm("Are you sure you want to reset all zone filters back to defaults?")) {
                                resetZoneFilters();
                            }
                        }}
                        style={{ padding: '4px 10px', fontSize: '0.75rem', width: 'auto', marginTop: 0 }}
                    >
                        Reset All Zones
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MapVisualSettings;
