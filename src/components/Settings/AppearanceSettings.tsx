/**
 * @file AppearanceSettings.tsx
 * @description Component managing MUD visual appearance settings (Theme, Fonts, Immersion, Performance).
 */

import React from 'react';
import FontSizeSetting from './FontSizeSetting';
import { ToggleRow } from './SettingHelpers';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { UiMode } from '../../types';

interface AppearanceSettingsProps {
    uiMode: UiMode;
    setUiMode: (val: UiMode) => void;
    theme: 'light' | 'dark';
    setTheme: (val: 'light' | 'dark') => void;
    fontFamily: string;
    setFontFamily: (val: string) => void;
    logFontSize: number;
    logFontSizePx: number;
    setLogFontSize: (v: number | ((prev: number) => number)) => void;
    isTimestampEnabled: boolean;
    setIsTimestampEnabled: (val: boolean) => void;
    hidePrompt: boolean;
    setHidePrompt: (val: boolean) => void;
    showBlockHeaders: boolean;
    setShowBlockHeaders: (val: boolean) => void;
    isTextRevealEnabled: boolean;
    setIsTextRevealEnabled: (val: boolean) => void;
    isImmersionMode: boolean;
    setIsImmersionMode: (val: boolean) => void;
    isPerformanceMode: boolean;
    setIsPerformanceMode: (val: boolean) => void;
}

export const AppearanceSettings: React.FC<AppearanceSettingsProps> = ({
    uiMode,
    setUiMode,
    fontFamily,
    setFontFamily,
    logFontSize,
    logFontSizePx,
    setLogFontSize,
    isTimestampEnabled,
    setIsTimestampEnabled,
    hidePrompt,
    setHidePrompt,
    showBlockHeaders,
    setShowBlockHeaders,
    isTextRevealEnabled,
    setIsTextRevealEnabled,
    isImmersionMode,
    setIsImmersionMode,
    isPerformanceMode,
    setIsPerformanceMode,
}) => {
    const drawerZoom = useSettingsStore(s => s.drawerZoom ?? 1.0);
    const setDrawerZoom = useSettingsStore(s => s.setDrawerZoom);
    const showChatWindow = useSettingsStore(s => s.showChatWindow);
    const setShowChatWindow = useSettingsStore(s => s.setShowChatWindow);

    return (
        <>
            {/* Interface Mode */}
            <div className="setting-group" style={{ border: '1px solid var(--border-modal)', background: 'var(--bg-panel)', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <label className="setting-label" style={{ color: 'var(--accent)', fontWeight: 'bold', margin: 0 }}>Interface Mode</label>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '4px' }}>Force Desktop or Mobile orientation.</div>
                    </div>
                    <div style={{ display: 'flex', backgroundColor: 'var(--input-bg)', borderRadius: '20px', padding: '2px', border: '1px solid var(--border-modal)', overflow: 'hidden', flexWrap: 'wrap', justifyContent: 'center' }}>
                        {(['auto', 'desktop', 'portrait', 'landscape'] as const).map((m) => (
                            <button
                                key={m}
                                onClick={() => setUiMode(m)}
                                style={{
                                    padding: '4px 10px', borderRadius: '18px', border: 'none', cursor: 'pointer',
                                    backgroundColor: uiMode === m ? 'var(--accent)' : 'transparent',
                                    color: uiMode === m ? '#000' : 'var(--text-primary)',
                                    fontSize: '0.7rem', fontWeight: 'bold',
                                    textTransform: 'capitalize',
                                    margin: '2px'
                                }}
                            >{m}</button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Appearance */}
            <div className="setting-group" style={{ border: '1px solid var(--border-modal)', background: 'var(--bg-panel)', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
                <label className="setting-label" style={{ color: 'var(--accent)', fontWeight: 'bold', margin: 0 }}>Appearance</label>

                {/* Main Font Family */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginTop: '10px', paddingTop: '10px', borderTop: '1px solid var(--border-modal)' }}>
                    <div style={{ flex: '1 1 200px' }}>
                        <label className="setting-label" style={{ color: 'var(--text-primary)', fontWeight: 'bold', margin: 0 }}>Main Font Family</label>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '4px' }}>Choose your preferred monospaced typeface.</div>
                    </div>
                    <select
                        className="setting-input"
                        value={fontFamily}
                        onChange={(e) => setFontFamily(e.target.value)}
                        style={{ width: 'auto', minWidth: '150px', fontFamily: fontFamily, fontSize: '0.9rem' }}
                    >
                        <option value="'Iosevka', monospace">Iosevka</option>
                        <option value="'Input Mono', monospace">Input Mono</option>
                        <option value="'Input Mono Condensed', monospace">Input Mono Condensed</option>
                        <option value="'Input Mono Compressed', monospace">Input Mono Compressed</option>
                        <option value="'Menlo', monospace">Menlo</option>
                        <option value="'Space Mono', monospace">Space Mono</option>
                        <option value="'Fira Code', monospace">Fira Code</option>
                        <option value="'JetBrains Mono', monospace">JetBrains Mono</option>
                        <option value="'Roboto Mono', monospace">Roboto Mono</option>
                        <option value="'Inconsolata', monospace">Inconsolata</option>
                        <option value="'Source Code Pro', monospace">Source Code Pro</option>
                        <option value="'Ubuntu Mono', monospace">Ubuntu Mono</option>
                        <option value="'Courier Prime', monospace">Courier Prime</option>
                        <option value="'IBM Plex Mono', monospace">IBM Plex Mono</option>
                        <option value="'Anonymous Pro', monospace">Anonymous Pro</option>
                        <option value="'Aniron', serif">Aniron (Elven)</option>
                        <option value="'Google Sans', sans-serif">Google Sans</option>
                        <option value="'Roboto', sans-serif">Roboto</option>
                        <option value="sans-serif">Sans Serif</option>
                    </select>
                </div>

                {/* Font Size */}
                <FontSizeSetting
                    logFontSize={logFontSize}
                    logFontSizePx={logFontSizePx}
                    setLogFontSize={setLogFontSize}
                    inline
                />

                {/* Utility Drawer Zoom */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginTop: '10px', paddingTop: '10px', borderTop: '1px solid var(--border-modal)' }}>
                    <div>
                        <label className="setting-label" style={{ color: 'var(--text-primary)', fontWeight: 'bold', margin: 0 }}>Utility Drawer Zoom</label>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '4px' }}>Adjust font size and scaling of utility drawer panels.</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <button
                            className="btn-secondary"
                            style={{ padding: '2px 10px', fontSize: '1rem', lineHeight: 1, margin: 0 }}
                            onClick={() => setDrawerZoom(Math.max(0.5, Math.round((drawerZoom - 0.1) * 10) / 10))}
                        >-</button>
                        <span style={{
                            width: '48px',
                            textAlign: 'center',
                            fontSize: '0.85rem',
                            color: 'var(--text-primary)',
                            fontFamily: 'monospace',
                        }}>{Math.round(drawerZoom * 100)}%</span>
                        <button
                            className="btn-secondary"
                            style={{ padding: '2px 10px', fontSize: '1rem', lineHeight: 1, margin: 0 }}
                            onClick={() => setDrawerZoom(Math.min(2.0, Math.round((drawerZoom + 0.1) * 10) / 10))}
                        >+</button>
                        {drawerZoom !== 1.0 && (
                            <button
                                className="btn-secondary"
                                style={{ padding: '2px 8px', fontSize: '0.7rem', margin: 0 }}
                                onClick={() => setDrawerZoom(1.0)}
                            >Reset</button>
                        )}
                    </div>
                </div>

                {/* Show Timestamps */}
                <ToggleRow
                    label="Show Timestamps"
                    description="Display the time for each message (excludes room info)."
                    value={isTimestampEnabled}
                    onToggle={() => setIsTimestampEnabled(!isTimestampEnabled)}
                />

                {/* Hide Vitals/Prompt */}
                <ToggleRow
                    label="Hide Vitals/Prompt"
                    description="Hide the prompt bar above the input area."
                    value={hidePrompt}
                    onToggle={() => setHidePrompt(!hidePrompt)}
                />

                {/* Show Combat/Location Headers */}
                <ToggleRow
                    label="Show Combat/Location Headers"
                    description="Show block header indicators for combat messages and location changes."
                    value={showBlockHeaders}
                    onToggle={() => setShowBlockHeaders(!showBlockHeaders)}
                />

                {/* Chat Window */}
                <ToggleRow
                    label="Show Chat Window"
                    description="Show a separate window for tells, says, narrates, and other communication."
                    value={showChatWindow}
                    onToggle={() => setShowChatWindow(!showChatWindow)}
                />

                {/* Text Reveal Effect */}
                <ToggleRow
                    label="Text Reveal Effect"
                    description="Animate new messages with a typewriter-style reveal as they arrive."
                    value={isTextRevealEnabled}
                    onToggle={() => setIsTextRevealEnabled(!isTextRevealEnabled)}
                />

                {/* Immersion Mode */}
                <ToggleRow
                    label="Immersion Mode"
                    description="Enable lighting, weather, fog, embers, and scene backgrounds."
                    value={isImmersionMode}
                    onToggle={() => setIsImmersionMode(!isImmersionMode)}
                />

                {/* Performance Mode */}
                <ToggleRow
                    label="Performance Mode"
                    description="Disable blurs, shadows, animations, transitions, and weather for smoother performance."
                    value={isPerformanceMode}
                    onToggle={() => setIsPerformanceMode(!isPerformanceMode)}
                />
            </div>
        </>
    );
};
