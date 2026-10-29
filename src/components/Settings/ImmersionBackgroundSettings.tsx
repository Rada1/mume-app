/**
 * @file ImmersionBackgroundSettings.tsx
 * @description Controls visibility, placement, and per-zone framing for immersion map art.
 */

// --- Logic Section ---
import React from 'react';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { ToggleRow } from './SettingHelpers';
import ZoneBackgroundPositionSettings from './ZoneBackgroundPositionSettings';

// --- Render Section ---
const ImmersionBackgroundSettings: React.FC = () => {
    const showBackgroundImage = useSettingsStore(state => state.showImmersionBackgroundImage);
    const setShowBackgroundImage = useSettingsStore(state => state.setShowImmersionBackgroundImage);
    const useSidePanel = useSettingsStore(state => state.useImmersionBackgroundSidePanel);
    const setUseSidePanel = useSettingsStore(state => state.setUseImmersionBackgroundSidePanel);

    return (
        <>
            <div className="setting-group" style={{ border: '1px solid var(--border-modal)', background: 'var(--bg-panel)', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
                <label className="setting-label" style={{ color: 'var(--accent)', fontWeight: 'bold', margin: 0 }}>Immersion Background</label>
                <ToggleRow
                    label="Show Background Image"
                    description="Show or hide the zone map image in Immersion Mode."
                    value={showBackgroundImage}
                    onToggle={() => setShowBackgroundImage(!showBackgroundImage)}
                />
                <ToggleRow
                    label="Show as Side Panel"
                    description="On desktop, place the image in a faded panel beside the log. Mobile keeps it behind the client."
                    value={useSidePanel}
                    onToggle={() => setUseSidePanel(!useSidePanel)}
                />
            </div>
            <ZoneBackgroundPositionSettings />
        </>
    );
};

export default ImmersionBackgroundSettings;
