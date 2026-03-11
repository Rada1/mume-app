import React from 'react';
import { X, Music, Cog, Activity, HelpCircle } from 'lucide-react';
import { useGame, useUI } from '../context/GameContext';
import GeneralSettings from './Settings/GeneralSettings';
import DataManagement from './Settings/DataManagement';
import SoundSettings from './Settings/SoundSettings';
import ActionSettings from './Settings/ActionSettings';
import HelpGuides from './Settings/HelpGuides';
import { SettingsModalProps } from '../types';

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
    disable3dScroll,
    setDisable3dScroll,
    disableSmoothScroll,
    setDisableSmoothScroll,
    isImmersionMode,
    setIsImmersionMode,
    isMobileBrevityMode,
    setIsMobileBrevityMode,
    showLegacyButtons,
    setShowLegacyButtons,
}) => {
    const {
        isMmapperMode, setIsMmapperMode,
        isSoundEnabled, setIsSoundEnabled,
        isNoviceMode, setIsNoviceMode,
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
                                isNoviceMode={isNoviceMode}
                                setIsNoviceMode={setIsNoviceMode}
                                theme={theme}
                                setTheme={setTheme}
                                showDebugEchoes={showDebugEchoes}
                                setShowDebugEchoes={setShowDebugEchoes}
                                bgImage={bgImage}
                                setBgImage={setBgImage}
                                handleFileUpload={handleFileUpload}
                                uiMode={uiMode}
                                setUiMode={setUiMode}
                                disable3dScroll={disable3dScroll}
                                setDisable3dScroll={setDisable3dScroll}
                                disableSmoothScroll={disableSmoothScroll}
                                setDisableSmoothScroll={setDisableSmoothScroll}
                                isImmersionMode={isImmersionMode}
                                setIsImmersionMode={setIsImmersionMode}
                                isMobileBrevityMode={isMobileBrevityMode}
                                setIsMobileBrevityMode={setIsMobileBrevityMode}
                                showLegacyButtons={showLegacyButtons}
                                setShowLegacyButtons={setShowLegacyButtons}
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
