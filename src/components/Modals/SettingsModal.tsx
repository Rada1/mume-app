import React from 'react';
import { X, Music, Cog, Activity, HelpCircle } from 'lucide-react';
import { useGame, useUI } from '../../context/GameContext';
import GeneralSettings from '../Settings/GeneralSettings';
import DataManagement from '../Settings/DataManagement';
import SoundSettings from '../Settings/SoundSettings';
import ActionSettings from '../Settings/ActionSettings';
import HelpGuides from '../Settings/HelpGuides';
import { SoundTrigger, UiMode } from '../../types';

interface SettingsModalProps {
    connectionUrl: string;
    setConnectionUrl: (val: string) => void;
    bgImage: string;
    setBgImage: (val: string) => void;
    handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    exportSettings: () => void;
    importSettings: (e: React.ChangeEvent<HTMLInputElement>) => void;
    isLoading: boolean;
    newSoundPattern: string;
    setNewSoundPattern: (val: string) => void;
    newSoundRegex: boolean;
    setNewSoundRegex: (val: boolean) => void;
    handleSoundUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    soundTriggers: SoundTrigger[];
    setSoundTriggers: React.Dispatch<React.SetStateAction<SoundTrigger[]>>;
    resetButtons: () => void;
    connect: () => void;
    loginName: string;
    setLoginName: (val: string) => void;
    loginPassword: string;
    setLoginPassword: (val: string) => void;
    autoConnect: boolean;
    setAutoConnect: (val: boolean) => void;
    showDebugEchoes: boolean;
    setShowDebugEchoes: (val: boolean) => void;
    uiMode: UiMode;
    setUiMode: (val: UiMode) => void;
    disableSmoothScroll: boolean;
    setDisableSmoothScroll: (val: boolean) => void;
    isImmersionMode: boolean;
    setIsImmersionMode: (val: boolean) => void;
    isHighlighterEnabled: boolean;
    setIsHighlighterEnabled: (val: boolean) => void;
    isBloomEnabled: boolean;
    setIsBloomEnabled: (val: boolean) => void;
    isSpectateMode: boolean;
    setIsSpectateMode: (val: boolean) => void;
    isTimestampEnabled: boolean;
    setIsTimestampEnabled: (val: boolean) => void;
    fontFamily: string;
    setFontFamily: (val: string) => void;
    isNewbieMode: boolean;
    setIsNewbieMode: (val: boolean) => void;
    showLegacyButtons?: boolean;
    setShowLegacyButtons?: (val: boolean) => void;
    showRecordingIndicator?: boolean;
    setShowRecordingIndicator?: (val: boolean) => void;
    autoSaveSessions?: boolean;
    setAutoSaveSessions?: (val: boolean) => void;
    showSpectatePromptInLog?: boolean;
    setShowSpectatePromptInLog?: (val: boolean) => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({
    connectionUrl,
    setConnectionUrl,
    bgImage,
    setBgImage,
    handleFileUpload,
    exportSettings,
    importSettings,
    isLoading,
    newSoundPattern,
    setNewSoundPattern,
    newSoundRegex,
    setNewSoundRegex,
    handleSoundUpload,
    soundTriggers,
    setSoundTriggers,
    resetButtons,
    connect,
    loginName,
    setLoginName,
    loginPassword,
    setLoginPassword,
    autoConnect,
    setAutoConnect,
    showDebugEchoes,
    setShowDebugEchoes,
    uiMode,
    setUiMode,
    disableSmoothScroll,
    setDisableSmoothScroll,
    isImmersionMode,
    setIsImmersionMode,
    isHighlighterEnabled,
    setIsHighlighterEnabled,
    isBloomEnabled,
    setIsBloomEnabled,
    isSpectateMode,    setIsSpectateMode,
    isTimestampEnabled,
    setIsTimestampEnabled,
    fontFamily,
    setFontFamily,
    isNewbieMode,
    setIsNewbieMode,
    showRecordingIndicator,
    setShowRecordingIndicator,
    autoSaveSessions,
    setAutoSaveSessions,
    showSpectatePromptInLog,
    setShowSpectatePromptInLog
}) => {
    const {
        isMmapperMode, setIsMmapperMode,
        isSoundEnabled, setIsSoundEnabled,
        theme, setTheme,
        actions, setActions,
        status
    } = useGame();

    const { setIsSettingsOpen, settingsTab, setSettingsTab } = useUI();

    return (
        <div className="modal-overlay" onClick={() => setIsSettingsOpen(false)}>
            <div className={`modal ${settingsTab === 'help' ? 'large' : ''}`} onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <div className="modal-title">Settings</div>
                    <button onClick={() => setIsSettingsOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer' }}>
                        <X size={24} />
                    </button>
                </div>

                <div className="modal-tabs">
                    <div className={`modal-tab ${settingsTab === 'general' ? 'active' : ''}`} onClick={() => setSettingsTab('general')}>
                        <Cog size={16} /> <span>General</span>
                    </div>
                    <div className={`modal-tab ${settingsTab === 'sound' ? 'active' : ''}`} onClick={() => setSettingsTab('sound')}>
                        <Music size={16} /> <span>Sound</span>
                    </div>
                    <div className={`modal-tab ${settingsTab === 'actions' ? 'active' : ''}`} onClick={() => setSettingsTab('actions')}>
                        <Activity size={16} /> <span>Actions</span>
                    </div>
                    <div className={`modal-tab ${settingsTab === 'help' ? 'active' : ''}`} onClick={() => setSettingsTab('help')}>
                        <HelpCircle size={16} /> <span>Help & Guides</span>
                    </div>
                </div>

                <div className={`modal-body settings-modal`}>
                    {settingsTab === 'general' && (
                        <>
                            <GeneralSettings
                                connectionUrl={connectionUrl}
                                setConnectionUrl={setConnectionUrl}
                                status={status}
                                connect={connect}
                                autoConnect={autoConnect}
                                setAutoConnect={setAutoConnect}
                                loginName={loginName}
                                setLoginName={setLoginName}
                                loginPassword={loginPassword}
                                setLoginPassword={setLoginPassword}
                                isMmapperMode={isMmapperMode}
                                setIsMmapperMode={setIsMmapperMode}
                                theme={theme}
                                setTheme={setTheme}
                                showDebugEchoes={showDebugEchoes}
                                setShowDebugEchoes={setShowDebugEchoes}
                                bgImage={bgImage}
                                setBgImage={setBgImage}
                                handleFileUpload={handleFileUpload}
                                uiMode={uiMode}
                                setUiMode={setUiMode}
                                disableSmoothScroll={disableSmoothScroll}
                                setDisableSmoothScroll={setDisableSmoothScroll}
                                isImmersionMode={isImmersionMode}
                                setIsImmersionMode={setIsImmersionMode}
                                showRecordingIndicator={showRecordingIndicator}
                                setShowRecordingIndicator={setShowRecordingIndicator}
                                isHighlighterEnabled={isHighlighterEnabled}
                                setIsHighlighterEnabled={setIsHighlighterEnabled}
                                isBloomEnabled={isBloomEnabled}
                                setIsBloomEnabled={setIsBloomEnabled}
                                isSpectateMode={isSpectateMode}
                                setIsSpectateMode={setIsSpectateMode}
                                isTimestampEnabled={isTimestampEnabled}
                                setIsTimestampEnabled={setIsTimestampEnabled}
                                isNewbieMode={isNewbieMode}
                                setIsNewbieMode={setIsNewbieMode}
                                fontFamily={fontFamily}
                                setFontFamily={setFontFamily}
                                autoSaveSessions={autoSaveSessions}
                                setAutoSaveSessions={setAutoSaveSessions}
                                showSpectatePromptInLog={showSpectatePromptInLog}
                                setShowSpectatePromptInLog={setShowSpectatePromptInLog}
                            />
                            <DataManagement
                                exportSettings={exportSettings}
                                importSettings={importSettings}
                                isLoading={isLoading}
                                resetButtons={resetButtons}
                            />
                        </>
                    )}

                    {settingsTab === 'sound' && (
                        <SoundSettings
                            isSoundEnabled={isSoundEnabled}
                            setIsSoundEnabled={setIsSoundEnabled}
                            soundTriggers={soundTriggers}
                            setSoundTriggers={setSoundTriggers}
                            newSoundPattern={newSoundPattern}
                            setNewSoundPattern={setNewSoundPattern}
                            newSoundRegex={newSoundRegex}
                            setNewSoundRegex={setNewSoundRegex}
                            handleSoundUpload={handleSoundUpload}
                        />
                    )}

                    {settingsTab === 'actions' && (
                        <ActionSettings
                            actions={actions}
                            setActions={setActions}
                        />
                    )}

                    {settingsTab === 'help' && (
                        <HelpGuides />
                    )}
                </div>
            </div>
        </div>
    );
};

export default SettingsModal;
