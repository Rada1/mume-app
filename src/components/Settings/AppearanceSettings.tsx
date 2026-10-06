/**
 * @file AppearanceSettings.tsx
 * @description Component managing MUD visual appearance settings (Theme, Fonts, Immersion, Performance).
 */

import React from 'react';
import FontSizeSetting from './FontSizeSetting';
import { ToggleRow } from './SettingHelpers';
import { useSettingsStore } from '../../stores/useSettingsStore';

interface AppearanceSettingsProps {
    theme: 'light' | 'dark';
    setTheme: (val: 'light' | 'dark') => void;
    fontFamily: string;
    setFontFamily: (val: string) => void;
    logFontSize: number;
    logFontSizePx: number;
    setLogFontSize: (v: number | ((prev: number) => number)) => void;
    isImmersionMode: boolean;
    setIsImmersionMode: (val: boolean) => void;
    isPerformanceMode: boolean;
    setIsPerformanceMode: (val: boolean) => void;
}

export const AppearanceSettings: React.FC<AppearanceSettingsProps> = ({
    theme,
    setTheme,
    fontFamily,
    setFontFamily,
    logFontSize,
    logFontSizePx,
    setLogFontSize,
    isImmersionMode,
    setIsImmersionMode,
    isPerformanceMode,
    setIsPerformanceMode,
}) => {
    const uiMode = useSettingsStore(s => s.uiMode);
    const setUiMode = useSettingsStore(s => s.setUiMode);
    const keepScreenAwake = useSettingsStore(s => s.keepScreenAwake);
    const setKeepScreenAwake = useSettingsStore(s => s.setKeepScreenAwake);
    const screenWakeLockStatus = useSettingsStore(s => s.screenWakeLockStatus);
    const isImmersionTextAnimationsEnabled = useSettingsStore(s => s.isImmersionTextAnimationsEnabled);
    const setIsImmersionTextAnimationsEnabled = useSettingsStore(s => s.setIsImmersionTextAnimationsEnabled);
    const isImmersionWeatherEffectsEnabled = useSettingsStore(s => s.isImmersionWeatherEffectsEnabled);
    const setIsImmersionWeatherEffectsEnabled = useSettingsStore(s => s.setIsImmersionWeatherEffectsEnabled);
    const showCommandSuggestions = useSettingsStore(s => s.showCommandSuggestions);
    const setShowCommandSuggestions = useSettingsStore(s => s.setShowCommandSuggestions);
    const isTimestampEnabled = useSettingsStore(s => s.isTimestampEnabled);
    const setIsTimestampEnabled = useSettingsStore(s => s.setIsTimestampEnabled);
    const useTacticalPanelBlur = useSettingsStore(s => s.useTacticalPanelBlur);
    const setUseTacticalPanelBlur = useSettingsStore(s => s.setUseTacticalPanelBlur);

    const screenWakeLockDescription = screenWakeLockStatus === 'insecure-context'
        ? 'Chrome supports this, but the app must be opened over HTTPS (localhost is also secure).'
        : screenWakeLockStatus === 'unsupported'
            ? 'Screen wake lock is unavailable in this browser or platform.'
        : screenWakeLockStatus === 'unavailable'
            ? 'The device could not keep the screen awake. Check battery saver settings.'
            : screenWakeLockStatus === 'paused'
                ? 'Paused while the app is hidden; it will resume when you return.'
                : keepScreenAwake
                    ? 'The screen stays awake while the app is visible. Uses more battery.'
                    : 'Prevent the screen from dimming while MUME is open.';

    return (
        <>
            <div className="setting-group" style={{ border: '1px solid var(--border-modal)', background: 'var(--bg-panel)', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                    <div>
                        <label className="setting-label" style={{ color: 'var(--accent)', fontWeight: 'bold', margin: 0 }}>Adjust View</label>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '4px' }}>Choose automatic, desktop, portrait, or landscape layout.</div>
                    </div>
                    <div role="group" aria-label="Adjust view" style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
                        {(['auto', 'desktop', 'portrait', 'landscape'] as const).map(mode => (
                            <button
                                key={mode}
                                type="button"
                                aria-pressed={uiMode === mode}
                                onClick={() => setUiMode(mode)}
                                style={{
                                    padding: '4px 10px', borderRadius: '18px', border: 'none', cursor: 'pointer',
                                    backgroundColor: uiMode === mode ? 'var(--accent)' : 'transparent',
                                    color: uiMode === mode ? '#000' : 'var(--text-primary)',
                                    fontSize: '0.7rem', fontWeight: 'bold', textTransform: 'capitalize', margin: '2px'
                                }}
                            >{mode}</button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Appearance */}
            <div className="setting-group" style={{ border: '1px solid var(--border-modal)', background: 'var(--bg-panel)', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
                <label className="setting-label" style={{ color: 'var(--accent)', fontWeight: 'bold', margin: 0 }}>Appearance</label>

                <ToggleRow
                    label="Light Mode"
                    description="Use the warm parchment-and-gold light theme."
                    value={theme === 'light'}
                    onToggle={() => setTheme(theme === 'light' ? 'dark' : 'light')}
                />

                {/* Immersion Mode */}
                <ToggleRow
                    label="Immersion Mode"
                    description="Enable lighting, fog, embers, and scene backgrounds."
                    value={isImmersionMode}
                    onToggle={() => setIsImmersionMode(!isImmersionMode)}
                />

                {isImmersionMode && (
                    <>
                        <ToggleRow
                            label="Immersion Weather Effects"
                            description="Show clouds, rain, snow, and lightning in immersion mode. Off by default."
                            value={isImmersionWeatherEffectsEnabled}
                            onToggle={() => setIsImmersionWeatherEffectsEnabled(!isImmersionWeatherEffectsEnabled)}
                        />
                        <ToggleRow
                            label="Immersion Text Animations"
                            description="Animate text effects in the game log, including word waves, spell blooms, and room-arrival motion."
                            value={isImmersionTextAnimationsEnabled}
                            onToggle={() => setIsImmersionTextAnimationsEnabled(!isImmersionTextAnimationsEnabled)}
                        />
                    </>
                )}

                {/* Performance Mode */}
                <ToggleRow
                    label="Performance Mode"
                    description="Disable blurs, shadows, animations, transitions, and weather for smoother performance."
                    value={isPerformanceMode}
                    onToggle={() => setIsPerformanceMode(!isPerformanceMode)}
                />

                <ToggleRow
                    label="Blur Panels"
                    description="Blur the background behind the command wheel and mobile panels. Off uses a solid background; Performance Mode keeps blur off."
                    value={useTacticalPanelBlur}
                    onToggle={() => setUseTacticalPanelBlur(!useTacticalPanelBlur)}
                />

                <ToggleRow
                    label="Command Suggestions"
                    description="Show command, spell, and target suggestions while typing in the command bar. On by default."
                    value={showCommandSuggestions}
                    onToggle={() => setShowCommandSuggestions(!showCommandSuggestions)}
                />

                <ToggleRow
                    label="Show Timestamps"
                    description="Show the time beside messages in the game log."
                    value={isTimestampEnabled}
                    onToggle={() => setIsTimestampEnabled(!isTimestampEnabled)}
                />

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
                        <option value={'ui-monospace, SFMono-Regular, Consolas, "Liberation Mono", monospace'}>Terminal (Default)</option>
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

                {/* Keep Screen Awake */}
                <ToggleRow
                    label="Keep Screen Awake"
                    description={screenWakeLockDescription}
                    value={keepScreenAwake}
                    onToggle={() => setKeepScreenAwake(!keepScreenAwake)}
                />
            </div>
        </>
    );
};
