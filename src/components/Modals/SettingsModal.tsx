import React from 'react';
import { X, Music, Cog, Activity, HelpCircle, Tag } from 'lucide-react';
import { useGame, useUI } from '../../context/GameContext';
import GeneralSettings from '../Settings/GeneralSettings';
import DataManagement from '../Settings/DataManagement';
import SoundSettings from '../Settings/SoundSettings';
import ActionSettings from '../Settings/ActionSettings';
import ButtonSettings from '../Settings/ButtonSettings';
import HelpGuides from '../Settings/HelpGuides';
import TraitSettings from '../Settings/TraitSettings';
import { SoundTrigger, UiMode, InlineCategoryConfig } from '../../types';

interface SettingsModalProps {
    connectionUrl: string;
    setConnectionUrl: (val: string) => void;
    bgImage: string | null;
    setBgImage: (val: string | null) => void;
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
    objectColor: string;
    setObjectColor: (val: string) => void;
    playerColor: string;
    setPlayerColor: (val: string) => void;
    npcColor: string;
    setNpcColor: (val: string) => void;
    roomColor: string;
    setRoomColor: (val: string) => void;
    isBloomEnabled: boolean;
    setIsBloomEnabled: (val: boolean) => void;
    isTimestampEnabled: boolean;
    setIsTimestampEnabled: (val: boolean) => void;
    fontFamily: string;
    setFontFamily: (val: string) => void;
    isNewbieMode: boolean;
    setIsNewbieMode: (val: boolean) => void;
    showRecordingIndicator?: boolean;
    setShowRecordingIndicator?: (val: boolean) => void;
    autoSaveSessions?: boolean;
    setAutoSaveSessions?: (val: boolean) => void;
    showSpectatePromptInLog?: boolean;
    setShowSpectatePromptInLog?: (val: boolean) => void;
    
    // Button specific props
    isEditMode: boolean;
    setIsEditMode: (val: boolean) => void;
    isGridEnabled: boolean;
    setIsGridEnabled: (val: boolean) => void;
    createButton: () => void;
    setIsSetManagerOpen: (val: boolean) => void;
    showLegacyButtons: boolean;
    setShowLegacyButtons: (val: boolean) => void;
    inlineCategories: InlineCategoryConfig[];
    setInlineCategories: (val: InlineCategoryConfig[] | ((prev: InlineCategoryConfig[]) => InlineCategoryConfig[])) => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({
    connectionUrl, setConnectionUrl, bgImage, setBgImage, handleFileUpload,
    exportSettings, importSettings, isLoading, newSoundPattern, setNewSoundPattern,
    newSoundRegex, setNewSoundRegex, handleSoundUpload, soundTriggers, setSoundTriggers,
    resetButtons, connect, loginName, setLoginName, loginPassword, setLoginPassword,
    autoConnect, setAutoConnect, showDebugEchoes, setShowDebugEchoes, uiMode, setUiMode,
    disableSmoothScroll, setDisableSmoothScroll, isImmersionMode, setIsImmersionMode,
    isHighlighterEnabled, setIsHighlighterEnabled, objectColor, setObjectColor,
    playerColor, setPlayerColor, npcColor, setNpcColor,
    roomColor, setRoomColor,
    isBloomEnabled, setIsBloomEnabled,
    isTimestampEnabled, setIsTimestampEnabled, fontFamily, setFontFamily,
    isNewbieMode, setIsNewbieMode, showRecordingIndicator, setShowRecordingIndicator,
    autoSaveSessions, setAutoSaveSessions, showSpectatePromptInLog, setShowSpectatePromptInLog,
    isEditMode, setIsEditMode, isGridEnabled, setIsGridEnabled, createButton,
    setIsSetManagerOpen, showLegacyButtons, setShowLegacyButtons,
    inlineCategories, setInlineCategories
}) => {
    const {
        isMmapperMode, setIsMmapperMode,
        isSoundEnabled, setIsSoundEnabled,
        theme, setTheme,
        actions, setActions,
        status,
        viewport
    } = useGame();

    const { setIsSettingsOpen, settingsTab, setSettingsTab } = useUI();

    return (
        <div 
            className="modal-overlay" 
            onClick={(e) => {
                if (e.target === e.currentTarget) {
                    setIsSettingsOpen(false);
                }
            }}
        >
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
                    <div className={`modal-tab ${settingsTab === 'buttons' ? 'active' : ''}`} onClick={() => setSettingsTab('buttons')}>
                        <Activity size={16} /> <span>Buttons</span>
                    </div>
                    <div className={`modal-tab ${settingsTab === 'traits' ? 'active' : ''}`} onClick={() => setSettingsTab('traits')}>
                        <Tag size={16} /> <span>Traits</span>
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
                                objectColor={objectColor}
                                setObjectColor={setObjectColor}
                                playerColor={playerColor}
                                setPlayerColor={setPlayerColor}
                                npcColor={npcColor}
                                setNpcColor={setNpcColor}
                                roomColor={roomColor}
                                setRoomColor={setRoomColor}
                                isBloomEnabled={isBloomEnabled}
                                setIsBloomEnabled={setIsBloomEnabled}
                                isTimestampEnabled={isTimestampEnabled}
                                setIsTimestampEnabled={setIsTimestampEnabled}
                                isNewbieMode={isNewbieMode}
                                setIsNewbieMode={setIsNewbieMode}
                                fontFamily={fontFamily}
                                setFontFamily={setFontFamily}
                                logFontSize={viewport.logFontSize}
                                setLogFontSize={viewport.setLogFontSize}
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

                    {settingsTab === 'buttons' && (
                        <ButtonSettings
                            isEditMode={isEditMode}
                            setIsEditMode={setIsEditMode}
                            isGridEnabled={isGridEnabled}
                            setIsGridEnabled={setIsGridEnabled}
                            createButton={createButton}
                            setIsSetManagerOpen={setIsSetManagerOpen}
                        />
                    )}

                    {settingsTab === 'traits' && (
                        <TraitSettings 
                            inlineCategories={inlineCategories}
                            setInlineCategories={setInlineCategories}
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
