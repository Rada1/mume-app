/**
 * @file ExperimentalSettings.tsx
 * @description Component managing experimental client settings, including Spectate mode and Discord Activity SDK integrations.
 */

import React from 'react';
import { ToggleRow } from './SettingHelpers';
import { useModeStore } from '../../stores/useModeStore';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { useGame } from '../../context/GameContext';
import { AlertCircle, Info, Sparkles, UserPlus } from 'lucide-react';

interface ExperimentalSettingsProps {
    autoSaveSessions: boolean;
    setAutoSaveSessions: (val: boolean) => void;
    showSpectatePromptInLog: boolean;
    setShowSpectatePromptInLog: (val: boolean) => void;
}

export const ExperimentalSettings: React.FC<ExperimentalSettingsProps> = ({
    autoSaveSessions,
    setAutoSaveSessions,
    showSpectatePromptInLog,
    setShowSpectatePromptInLog,
}) => {
    const isSpectateMode = useModeStore(s => s.isSpectating);
    const setIsSpectateMode = useModeStore(s => s.setIsSpectating);
    const showDeveloperTools = useSettingsStore(s => s.showDeveloperTools ?? false);
    const setShowDeveloperTools = useSettingsStore(s => s.setShowDeveloperTools);

    // Discord Activity Settings
    const isDiscordEnabled = useSettingsStore(s => s.isDiscordEnabled ?? true);
    const setIsDiscordEnabled = useSettingsStore(s => s.setIsDiscordEnabled);
    const { discordActivity } = useGame();

    const isIframe = discordActivity?.isDiscordIframe ?? false;
    const ready = discordActivity?.sdkReady ?? false;
    const authenticated = discordActivity?.isAuthenticated ?? false;
    const user = discordActivity?.discordUser;
    const error = discordActivity?.authError;

    return (
        <div className="setting-group" style={{ border: '1px solid rgba(212, 170, 0, 0.3)', background: 'rgba(10, 13, 21, 0.6)', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '15px' }}>
                <Sparkles size={16} style={{ color: 'var(--accent)' }} />
                <label className="setting-label" style={{ color: 'var(--accent)', fontWeight: 'bold', margin: 0 }}>Experiments</label>
                <span style={{ fontSize: '0.65rem', background: 'var(--accent)', color: '#000', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold', letterSpacing: '0.5px' }}>LAB</span>
            </div>

            {/* Auto-Save Sessions */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ flex: '1 1 200px' }}>
                    <label className="setting-label" style={{ color: 'var(--text-primary)', fontWeight: 'bold', margin: 0 }}>Auto-Save Sessions</label>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '4px' }}>Automatically start recording on login and save to archive on logoff.</div>
                </div>
                <button
                    className={`setting-toggle ${autoSaveSessions ? 'active' : ''}`}
                    onClick={() => setAutoSaveSessions(!autoSaveSessions)}
                    style={{ height: '24px', width: '45px', position: 'relative', border: 'none', backgroundColor: autoSaveSessions ? 'var(--accent)' : 'var(--input-bg)', borderRadius: '12px', cursor: 'pointer', transition: 'all 0.3s' }}
                >
                    <div style={{ width: '20px', height: '20px', background: '#fff', borderRadius: '50%', position: 'absolute', top: '2px', left: autoSaveSessions ? '22px' : '2px', transition: 'all 0.3s' }} />
                </button>
            </div>

            {/* Show Spectated Player's Prompt */}
            <ToggleRow
                label="Show Spectated Player's Prompt"
                description="Display the snooped player's prompt line in the message log during spectate mode."
                value={showSpectatePromptInLog}
                onToggle={() => setShowSpectatePromptInLog(!showSpectatePromptInLog)}
            />

            <ToggleRow
                label="Diagnostics and tools"
                description="Expose diagnostics and tools."
                value={showDeveloperTools}
                onToggle={() => setShowDeveloperTools(!showDeveloperTools)}
            />

            {/* Spectate Mode */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginTop: '10px', paddingTop: '10px', borderTop: '1px solid var(--border-modal)' }}>
                <div style={{ flex: '1 1 200px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <label className="setting-label" style={{ color: 'var(--text-primary)', fontWeight: 'bold', margin: 0 }}>Spectate Mode</label>
                        <span style={{ fontSize: '0.65rem', background: 'var(--accent)', color: '#000', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold', letterSpacing: '0.5px' }}>EXP</span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '4px' }}>Mirror a grouped player's location and vitals as if you are them. Requires Group.</div>
                </div>
                <button
                    className={`setting-toggle ${isSpectateMode ? 'active' : ''}`}
                    onClick={(e) => { e.stopPropagation(); setIsSpectateMode(!isSpectateMode); }}
                    style={{ height: '24px', width: '45px', position: 'relative', border: 'none', backgroundColor: isSpectateMode ? 'var(--accent)' : 'var(--input-bg)', borderRadius: '12px', cursor: 'pointer', transition: 'all 0.3s' }}
                >
                    <div style={{ width: '20px', height: '20px', background: '#fff', borderRadius: '50%', position: 'absolute', top: '2px', left: isSpectateMode ? '22px' : '2px', transition: 'all 0.3s' }} />
                </button>
            </div>

            {/* Discord Activity Integration Card */}
            <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '2px dashed var(--border-modal)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <label className="setting-label" style={{ color: '#5865F2', fontWeight: 'bold', margin: 0 }}>Discord Integration</label>
                            <span style={{ fontSize: '0.65rem', background: '#5865F2', color: '#fff', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold', letterSpacing: '0.5px' }}>DISCORD</span>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '4px' }}>Share character vitals, combat status, and location via Rich Presence.</div>
                    </div>
                    <button
                        className={`setting-toggle ${isDiscordEnabled ? 'active' : ''}`}
                        onClick={() => setIsDiscordEnabled(!isDiscordEnabled)}
                        style={{ height: '24px', width: '45px', position: 'relative', border: 'none', backgroundColor: isDiscordEnabled ? '#5865F2' : 'var(--input-bg)', borderRadius: '12px', cursor: 'pointer', transition: 'all 0.3s' }}
                    >
                        <div style={{ width: '20px', height: '20px', background: '#fff', borderRadius: '50%', position: 'absolute', top: '2px', left: isDiscordEnabled ? '22px' : '2px', transition: 'all 0.3s' }} />
                    </button>
                </div>

                {/* Discord Status and Stats */}
                {isDiscordEnabled && (
                    <div style={{ 
                        background: 'rgba(88, 101, 242, 0.08)', 
                        border: '1px solid rgba(88, 101, 242, 0.2)', 
                        borderRadius: '6px', 
                        padding: '12px', 
                        marginTop: '10px' 
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                            <span style={{ 
                                width: '8px', 
                                height: '8px', 
                                borderRadius: '50%', 
                                display: 'inline-block',
                                backgroundColor: !isIframe ? '#64748b' : authenticated ? '#22c55e' : error ? '#ef4444' : '#eab308'
                            }} />
                            <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                                {!isIframe 
                                    ? 'Inactive (Outside Discord Activity)' 
                                    : authenticated 
                                        ? `Connected as ${user?.username || 'Discord User'}` 
                                        : error 
                                            ? 'Authentication Failed' 
                                            : 'Connecting to Discord...'}
                            </span>
                        </div>

                        {/* Error info if auth failed */}
                        {isIframe && error && (
                            <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-start', color: '#ef4444', fontSize: '0.7rem', marginTop: '6px' }}>
                                <AlertCircle size={14} style={{ flexShrink: 0, marginTop: '1px' }} />
                                <span>{error}</span>
                            </div>
                        )}

                        {/* Help prompt if running outside iframe */}
                        {!isIframe && (
                            <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-start', color: 'var(--text-dim)', fontSize: '0.7rem', marginTop: '6px' }}>
                                <Info size={14} style={{ flexShrink: 0, marginTop: '1px', color: '#5865F2' }} />
                                <span>Play directly inside a Discord Server Voice Channel as an Activity to enable live status updates.</span>
                            </div>
                        )}

                        {/* Action buttons if connected */}
                        {isIframe && ready && (
                            <button
                                onClick={() => discordActivity?.openInviteDialog()}
                                style={{
                                    marginTop: '10px',
                                    width: '100%',
                                    padding: '6px 12px',
                                    background: '#5865F2',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: '4px',
                                    fontSize: '0.75rem',
                                    fontWeight: 'bold',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '6px',
                                    transition: 'background 0.2s'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.background = '#4752C4'}
                                onMouseLeave={(e) => e.currentTarget.style.background = '#5865F2'}
                            >
                                <UserPlus size={14} />
                                <span>Invite Friends to Play</span>
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
