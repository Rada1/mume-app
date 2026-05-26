/**
 * @file SettingsModal.tsx
 * @description Tabbed settings modal for configuring the MUME client.
 */

import React from 'react';
import { X, Music, Cog, Activity, HelpCircle, Map } from 'lucide-react';
import { useGame, useUI } from '../../context/GameContext';
import GeneralSettings from '../Settings/GeneralSettings';
import DataManagement from '../Settings/DataManagement';
import SoundSettings from '../Settings/SoundSettings';
import ActionSettings from '../Settings/ActionSettings';
import ButtonSettings from '../Settings/ButtonSettings';
import MapSettings from '../Settings/MapSettings';
import HelpGuides from '../Settings/HelpGuides';
import { SoundTrigger, UiMode } from '../../types';

// --- Interface ---

interface SettingsModalProps {
    connectionUrl: string;
    setConnectionUrl: (val: string) => void;
    bgImage: string | null;
    bgImageBottom?: string | null;
    setBgImage: (val: string | null) => void;
    setBgImageBottom?: (val: string | null) => void;
    handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    handleBottomFileUpload?: (e: React.ChangeEvent<HTMLInputElement>) => void;
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
    isBloomEnabled: boolean;
    setIsBloomEnabled: (val: boolean) => void;
    isImmersionMode: boolean;
    setIsImmersionMode: (val: boolean) => void;
    isTimestampEnabled: boolean;
    setIsTimestampEnabled: (val: boolean) => void;
    fontFamily: string;
    setFontFamily: (val: string) => void;
    autoSaveSessions?: boolean;
    setAutoSaveSessions?: (val: boolean) => void;
    showSpectatePromptInLog?: boolean;
    setShowSpectatePromptInLog?: (val: boolean) => void;
    isTextRevealEnabled: boolean;
    setIsTextRevealEnabled: (val: boolean) => void;
    hidePrompt: boolean;
    setHidePrompt: (val: boolean) => void;
    showBlockHeaders: boolean;
    setShowBlockHeaders: (val: boolean) => void;

    // Button specific props
    isEditMode: boolean;
    setIsEditMode: (val: boolean) => void;
    isGridEnabled: boolean;
    setIsGridEnabled: (val: boolean) => void;
    createButton: () => void;
    setIsSetManagerOpen: (val: boolean) => void;
}

// --- Component ---

const SettingsModal: React.FC<SettingsModalProps> = ({
    connectionUrl, setConnectionUrl, bgImage, setBgImage, bgImageBottom, setBgImageBottom, handleFileUpload, handleBottomFileUpload,
    exportSettings, importSettings, isLoading,
    newSoundPattern, setNewSoundPattern, newSoundRegex, setNewSoundRegex, handleSoundUpload, soundTriggers, setSoundTriggers,
    resetButtons, connect, loginName, setLoginName, loginPassword, setLoginPassword,
    autoConnect, setAutoConnect, showDebugEchoes, setShowDebugEchoes, uiMode, setUiMode,
    disableSmoothScroll, setDisableSmoothScroll,
    isBloomEnabled, setIsBloomEnabled,
    isImmersionMode, setIsImmersionMode,
    isTimestampEnabled, setIsTimestampEnabled, fontFamily, setFontFamily,
    autoSaveSessions, setAutoSaveSessions, showSpectatePromptInLog, setShowSpectatePromptInLog,
    isTextRevealEnabled, setIsTextRevealEnabled,
    hidePrompt, setHidePrompt,
    showBlockHeaders, setShowBlockHeaders,
    isEditMode, setIsEditMode, isGridEnabled, setIsGridEnabled, createButton,
    setIsSetManagerOpen,
}) => {
    const {
        isMmapperMode, setIsMmapperMode,
        isSoundEnabled, setIsSoundEnabled,
        theme, setTheme,
        actions, setActions,
        status,
        viewport,
        btn
    } = useGame();

    const { setIsSettingsOpen, settingsTab, setSettingsTab } = useUI();

    return (
        <div
            className={`modal-overlay ${settingsTab === 'map' ? 'no-darken' : ''}`}
            onClick={(e) => {
                if (e.target === e.currentTarget) {
                    setIsSettingsOpen(false);
                }
            }}
        >
            <div className={`modal settings ${settingsTab === 'help' ? 'large' : ''}`} onClick={e => e.stopPropagation()}>
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
                    <div className={`modal-tab ${settingsTab === 'buttons' ? 'active' : ''}`} onClick={() => setSettingsTab('buttons')}>
                        <Activity size={16} /> <span>Buttons</span>
                    </div>
                    <div className={`modal-tab ${settingsTab === 'map' ? 'active' : ''}`} onClick={() => setSettingsTab('map')}>
                        <Map size={16} /> <span>Map</span>
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
                                isImmersionMode={isImmersionMode}
                                setIsImmersionMode={setIsImmersionMode}
                                showDebugEchoes={showDebugEchoes}
                                setShowDebugEchoes={setShowDebugEchoes}
                                bgImage={bgImage}
                                setBgImage={setBgImage}
                                bgImageBottom={bgImageBottom}
                                setBgImageBottom={setBgImageBottom}
                                handleFileUpload={handleFileUpload}
                                handleBottomFileUpload={handleBottomFileUpload}
                                uiMode={uiMode}
                                setUiMode={setUiMode}
                                disableSmoothScroll={disableSmoothScroll}
                                setDisableSmoothScroll={setDisableSmoothScroll}
                                isBloomEnabled={isBloomEnabled}
                                setIsBloomEnabled={setIsBloomEnabled}
                                isTimestampEnabled={isTimestampEnabled}
                                setIsTimestampEnabled={setIsTimestampEnabled}
                                fontFamily={fontFamily}
                                setFontFamily={setFontFamily}
                                logFontSize={viewport.logFontSize}
                                logFontSizePx={viewport.logFontSizePx}
                                setLogFontSize={viewport.setLogFontSize}
                                autoSaveSessions={autoSaveSessions ?? false}
                                setAutoSaveSessions={setAutoSaveSessions ?? (() => {})}
                                showSpectatePromptInLog={showSpectatePromptInLog ?? false}
                                setShowSpectatePromptInLog={setShowSpectatePromptInLog ?? (() => {})}
                                isTextRevealEnabled={isTextRevealEnabled}
                                setIsTextRevealEnabled={setIsTextRevealEnabled}
                                hidePrompt={hidePrompt}
                                setHidePrompt={setHidePrompt}
                                showBlockHeaders={showBlockHeaders}
                                setShowBlockHeaders={setShowBlockHeaders}
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

                    {settingsTab === 'buttons' && (
                        <ButtonSettings
                            isEditMode={isEditMode}
                            setIsEditMode={setIsEditMode}
                            isGridEnabled={isGridEnabled}
                            setIsGridEnabled={setIsGridEnabled}
                            createButton={createButton}
                            setIsSetManagerOpen={setIsSetManagerOpen}
                            activeSet={btn.activeSet}
                            availableSets={btn.availableSets}
                            setActiveSet={btn.setActiveSet}
                        />
                    )}

                    {settingsTab === 'map' && (
                        <MapSettings />
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
