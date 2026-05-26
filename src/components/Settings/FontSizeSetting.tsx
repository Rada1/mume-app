/**
 * @file FontSizeSetting.tsx
 * @description Effective pixel-size control for the auto-fit log font.
 */

import React from 'react';

// --- Constants ---

const MIN_FONT_SIZE_PX = 6;
const MAX_FONT_SIZE_PX = 48;
const MIN_FONT_MULTIPLIER = 0.5;
const MAX_FONT_MULTIPLIER = 2.5;
const FONT_SIZE_STEP_PX = 0.5;

interface FontSizeSettingProps {
    logFontSize: number;
    logFontSizePx: number;
    setLogFontSize: (v: number | ((prev: number) => number)) => void;
    inline?: boolean;
}

// --- Helpers ---

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const toStableMultiplier = (value: number) => Math.round(value * 10000) / 10000;

const toDisplayedFontSize = (value: number) => Math.round(value / FONT_SIZE_STEP_PX) * FONT_SIZE_STEP_PX;

// --- Component ---

const FontSizeSetting: React.FC<FontSizeSettingProps> = ({
    logFontSize,
    logFontSizePx,
    setLogFontSize,
    inline = false,
}) => {
    const displayedFontSizePx = toDisplayedFontSize(logFontSizePx);
    const baseFontSizePx = logFontSize > 0 ? logFontSizePx / logFontSize : logFontSizePx;

    const setEffectiveFontSizePx = (fontSizePx: number) => {
        if (baseFontSizePx <= 0) return;
        const targetPx = clamp(fontSizePx, MIN_FONT_SIZE_PX, MAX_FONT_SIZE_PX);
        const nextMultiplier = clamp(
            targetPx / baseFontSizePx,
            MIN_FONT_MULTIPLIER,
            MAX_FONT_MULTIPLIER
        );
        setLogFontSize(toStableMultiplier(nextMultiplier));
    };

    const inner = (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', ...(inline ? { flexWrap: 'wrap' as const, gap: '8px', marginTop: '10px', paddingTop: '10px', borderTop: '1px solid var(--border-modal)' } : {}) }}>
                <div>
                    <label className="setting-label" style={{ color: 'var(--accent)', fontWeight: 'bold', margin: 0 }}>Font Size</label>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '4px' }}>Auto-sizes to fit 80 chars. Adjust to taste.</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <button
                        className="btn-secondary"
                        style={{ padding: '2px 10px', fontSize: '1rem', lineHeight: 1, margin: 0 }}
                        onClick={() => setEffectiveFontSizePx(displayedFontSizePx - FONT_SIZE_STEP_PX)}
                    >-</button>
                    <input
                        className="setting-input"
                        aria-label="Log font size in pixels"
                        type="number"
                        min={MIN_FONT_SIZE_PX}
                        max={MAX_FONT_SIZE_PX}
                        step={FONT_SIZE_STEP_PX}
                        value={displayedFontSizePx}
                        onChange={e => setEffectiveFontSizePx(Number(e.target.value))}
                        style={{
                            width: '64px',
                            textAlign: 'center',
                            fontSize: '0.85rem',
                            color: 'var(--text-primary)',
                            fontFamily: 'monospace',
                            padding: '3px 6px',
                            margin: 0
                        }}
                    />
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-dim)', fontFamily: 'monospace' }}>px</span>
                    <button
                        className="btn-secondary"
                        style={{ padding: '2px 10px', fontSize: '1rem', lineHeight: 1, margin: 0 }}
                        onClick={() => setEffectiveFontSizePx(displayedFontSizePx + FONT_SIZE_STEP_PX)}
                    >+</button>
                    {logFontSize !== 1.0 && (
                        <button
                            className="btn-secondary"
                            style={{ padding: '2px 8px', fontSize: '0.7rem', margin: 0 }}
                            onClick={() => setLogFontSize(1.0)}
                        >Reset</button>
                    )}
                </div>
        </div>
    );

    return inline ? inner : (
        <div className="setting-group" style={{ border: '1px solid var(--border-modal)', background: 'var(--bg-panel)', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
            {inner}
        </div>
    );
};

export default FontSizeSetting;
