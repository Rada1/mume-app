import React, { FC } from 'react';
import Header from '../HUD/Header';
import MessageLog from '../Messages/MessageLog';
import ChatWindow from '../Messages/ChatWindow';
import PlayersPanel from '../Players/PlayersPanel';
import InputArea from '../Controls/InputArea';
import { useGame, useUI, useVitals, useLog } from '../../context/GameContext';
import { useModeStore } from '../../stores/useModeStore';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { LineCluster } from './HUD/LineCluster';
import PromptBox from '../HUD/PromptBox';
import ActionBox from '../HUD/ActionBox';
import { CharacterCard } from '../HUD/CharacterCard';
import { useCharacterCardStore } from '../../stores/useCharacterCardStore';
import { ansiConvert } from '../../utils/ansi';
import { sanitizeMumeHtml } from '../../utils/securityUtils';
import { TokenRenderer } from '../Messages/TokenRenderer';
import { ShopPanel } from '../Shop/ShopPanel';
import { TimerExpiryToast } from '../Timers/TimerExpiryToast';
import { QuickButtonBar } from '../HUD/QuickButtonBar';
import { ReplayHUD } from './HUD/ReplayHUD';
import type { MumeEditState } from '../../stores/useUIStore';
import { DrawerResizeHandle } from '../Drawers/DrawerResizeHandle';
import { StickyRoomHeader } from './StickyRoomHeader';
import { MapperRoomInfo } from '../Mapper/MapperRoomInfo';
import RoomChipRows from '../Mapper/RoomChipRows';
import { useActiveVitals } from '../../stores/useActiveGameState';
import { getRoomTerrainVisualKey, getZoneVisualKey } from '../../utils/roomTerrainVisuals';

interface MainContentLayerProps {
    handleMouseUp: (e: React.MouseEvent) => void;
    handleLogPointerDown: (e: React.PointerEvent) => void;
    handleLogPointerUp: (e: React.PointerEvent) => void;
    handleSend: (e?: React.FormEvent) => void;
    handleInputSwipe: (dir: 'up' | 'down' | 'left' | 'right' | 'sw') => void;
    commandPreview: string | null;
    setCommandPreview: React.Dispatch<React.SetStateAction<string | null>>;
    heldButton: any;
    setHeldButton: React.Dispatch<React.SetStateAction<any>>;
    mumeEditState: MumeEditState;
    setMumeEditState: React.Dispatch<React.SetStateAction<MumeEditState>>;
    wasDraggingRef: React.MutableRefObject<boolean>;
}

export const MainContentLayer: FC<MainContentLayerProps> = ({
    handleMouseUp,
    handleLogPointerDown,
    handleLogPointerUp,
    handleSend,
    handleInputSwipe,
    commandPreview,
    setCommandPreview,
    heldButton,
    setHeldButton,
    mumeEditState,
    setMumeEditState,
    wasDraggingRef
}) => {
    const { setStats } = useVitals() as any;
    const {
        env,
        triggerHaptic,
        btn,
        joystick,
        currentTerrain,
        roomZone,
        viewport,
        roomName,
        roomDesc,
        handleLogClick,
        handleLogDoubleClick,
        handleButtonClick,
        spatButtons,
        setSpatButtons,
        executeCommand,
        parley,
        setParley,
        whoList,
        showControls,
        isNewbieMode,
        gameState,
        sessionMode,
        inCombat,
        accountState,
        activeSession,
        spectateTerrain
    } = useGame() as any;
    const { lighting, weather } = useActiveVitals();

    const isSpectateMode = useModeStore(s => s.isSpectating);
    const activeView = useModeStore(s => s.activeView);
    const { processMessageHtml, processMessageTokens } = useLog();
    const isCharacterCardOpen = useCharacterCardStore(s => s.isOpen);

    const manualBgImage = useSettingsStore(s => s.bgImage);
    const showChatWindow = useSettingsStore(s => s.showChatWindow);
    const showPlayersPanel = useSettingsStore(s => s.showPlayersPanel);
    const isSpectating = activeSession === 'spectate' || activeView === 'target';
    const roomCardTerrain = isSpectating ? spectateTerrain : currentTerrain;

    // Account mode keeps the log transparent (environment shows through) like the
    // in-game view, rather than a dark account splash behind the menu text.
    const resolvedBgImage = manualBgImage || null;

    const zoneKey = React.useMemo(() => {
        if (!roomZone) return 'unknown';
        return roomZone.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    }, [roomZone]);
    const zoneVisualKey = React.useMemo(() => getZoneVisualKey(roomZone), [roomZone]);
    const skyLightingClass = lighting === 'sun' ? 'lighting-sun' : 'lighting-none';

    const { setPopoverState } = useUI();

    const handleWimpyChange = React.useCallback((val: number) => {
        triggerHaptic(10);
        // Optimistic update
        setStats(prev => ({ ...prev, wimpy: val }));
        executeCommand(`change wimpy ${val}`, true, true);
    }, [executeCommand, triggerHaptic, setStats]);
    const logContainerRef = React.useRef<HTMLDivElement>(null);

    const [headerHeight, setHeaderHeight] = React.useState(0);

    React.useLayoutEffect(() => {
        const el = document.querySelector('.header') as HTMLElement | null;
        if (!el) return;
        const update = () => {
            document.documentElement.style.setProperty('--shop-panel-top', `${el.getBoundingClientRect().height}px`);
        };
        const obs = new ResizeObserver(update);
        obs.observe(el);
        update();
        return () => obs.disconnect();
    }, []);


    // --- Dynamic Room Card Spacing ---
    // In Newbie Mode, the room card is sticky. We need to measure it
    // so the message log can add appropriate top padding to prevent text overlap.
    React.useLayoutEffect(() => {
        if (!isNewbieMode) {
            document.documentElement.style.setProperty('--room-card-height', '0px');
            return;
        }

        const updateHeight = () => {
            const header = document.querySelector('.sticky-room-header');
            if (header) {
                const height = header.getBoundingClientRect().height;
                setHeaderHeight(height);
                document.documentElement.style.setProperty('--room-card-height', `${height}px`);
            }
        };

        const observer = new ResizeObserver(updateHeight);
        const header = document.querySelector('.sticky-room-header');
        if (header) {
            observer.observe(header);
            updateHeight();
        }

        return () => observer.disconnect();
    }, [isNewbieMode, roomName, roomDesc]);

    React.useLayoutEffect(() => {
        const updateCenter = () => {
            if (logContainerRef.current) {
                const rect = logContainerRef.current.getBoundingClientRect();
                const x = rect.left + rect.width / 2;
                const y = rect.top + rect.height / 2;
                document.documentElement.style.setProperty('--wheel-center-x', `${x}px`);
                document.documentElement.style.setProperty('--wheel-center-y', `${y}px`);
            }
        };

        const observer = new ResizeObserver(updateCenter);
        if (logContainerRef.current) {
            observer.observe(logContainerRef.current);
            if (logContainerRef.current.parentElement) {
                observer.observe(logContainerRef.current.parentElement);
            }
        }

        const timeout = setTimeout(updateCenter, 100);
        window.addEventListener('resize', updateCenter);
        return () => {
            clearTimeout(timeout);
            observer.disconnect();
            window.removeEventListener('resize', updateCenter);
        };
    }, []);

    // --- Full-width terrain strip alignment ---
    // The pixel-art terrain border used to be scoped to the log column only. To let it
    // span the full client width (across the drawers too), a separate fixed-position
    // element renders it instead — this keeps that element's bottom offset in sync with
    // the log container's actual bottom edge (which moves with prompt-box/input height).
    React.useLayoutEffect(() => {
        const updateBottomOffset = () => {
            if (!logContainerRef.current) return;
            const rect = logContainerRef.current.getBoundingClientRect();
            const measured = Math.max(0, window.innerHeight - rect.bottom);
            // On the account/login screen there's no bottom control bar to reserve
            // space, so floor the offset to give a visible frosted band with the
            // forest terrain line sitting on top of it.
            const offset = gameState === 'account' ? Math.max(measured, 52) : measured;
            document.documentElement.style.setProperty('--log-terrain-bottom-offset', `${offset}px`);
        };

        const observer = new ResizeObserver(updateBottomOffset);
        if (logContainerRef.current) {
            observer.observe(logContainerRef.current);
            if (logContainerRef.current.parentElement) {
                observer.observe(logContainerRef.current.parentElement);
            }
        }

        const timeout = setTimeout(updateBottomOffset, 100);
        window.addEventListener('resize', updateBottomOffset);
        return () => {
            clearTimeout(timeout);
            observer.disconnect();
            window.removeEventListener('resize', updateBottomOffset);
        };
    }, [gameState]);

    // --- Full-width sky art strip alignment ---
    // Same idea as the terrain strip above, but for the sun/moon/cloud row at the top
    // of the log — keeps the fixed element's top offset in sync with the log's actual
    // top edge (which moves with the header height).
    React.useLayoutEffect(() => {
        const updateTopOffset = () => {
            if (!logContainerRef.current) return;
            const rect = logContainerRef.current.getBoundingClientRect();
            document.documentElement.style.setProperty('--log-sky-top-offset', `${Math.max(0, rect.top)}px`);
        };

        const observer = new ResizeObserver(updateTopOffset);
        if (logContainerRef.current) {
            observer.observe(logContainerRef.current);
            if (logContainerRef.current.parentElement) {
                observer.observe(logContainerRef.current.parentElement);
            }
        }

        const timeout = setTimeout(updateTopOffset, 100);
        window.addEventListener('resize', updateTopOffset);
        return () => {
            clearTimeout(timeout);
            observer.disconnect();
            window.removeEventListener('resize', updateTopOffset);
        };
    }, []);

    const { getLightingIcon, getWeatherIcon } = env;
    const { isMobile, isLandscape } = viewport;
    const isReplaying = sessionMode === 'replay';
    const shouldShowAccountInput = gameState === 'account' && !isReplaying;

    // Tactical-targeting flag, scoped to the log container instead of the root
    // .app-container. Toggling a class on the root invalidates style matching for the
    // entire tree; scoping it here bounds the recalc to the message log subtree.
    const heldBtnActionType = typeof heldButton?.id === 'string'
        ? btn.buttons.find((b: any) => b.id === heldButton.id)?.actionType
        : undefined;
    const isTacticalTargetingActive = !!heldButton
        && !heldButton.didFire
        && typeof heldButton.id === 'string'
        && (heldButton.id.startsWith('tactical-') || heldButton.id === 'map-long-press')
        && heldBtnActionType !== 'modifier';

    return (
        <div className={`content-layer view-mode-${activeView}`}>
            {!viewport.isMobile && (
                <div
                    className={`app-terrain-strip log-terrain-${getRoomTerrainVisualKey(gameState === 'account' ? 'forest' : roomCardTerrain)} log-lore-${gameState === 'account' ? 'default' : zoneVisualKey}`}
                    style={{
                        position: 'fixed',
                        left: 0,
                        right: 0,
                        bottom: 'var(--log-terrain-bottom-offset, 0px)',
                        zIndex: 4500,
                        pointerEvents: 'none'
                    }}
                />
            )}
            {!viewport.isMobile && gameState !== 'account' && (
                <div
                    className={`app-sky-art-strip ${skyLightingClass} weather-${weather} terrain-${getRoomTerrainVisualKey(roomCardTerrain)}`}
                    style={{
                        position: 'fixed',
                        left: 0,
                        right: 0,
                        top: 'var(--log-sky-top-offset, 0px)',
                        zIndex: 4500,
                        pointerEvents: 'none'
                    }}
                />
            )}
            {!viewport.isMobile && gameState !== 'account' && (
                <div
                    className={`app-ceiling-strip log-terrain-${getRoomTerrainVisualKey(roomCardTerrain)} log-lore-${zoneVisualKey}`}
                    style={{
                        position: 'fixed',
                        left: 0,
                        right: 0,
                        top: 'var(--log-sky-top-offset, 0px)',
                        zIndex: 4500,
                        pointerEvents: 'none'
                    }}
                />
            )}
            <Header
                isLandscape={isLandscape}
                getLightingIcon={getLightingIcon}
                getWeatherIcon={getWeatherIcon}
            />
            <div className="shop-panel-wrap">
                <ShopPanel />
            </div>
            <ReplayHUD />

            <div className={`message-log-wrapper${showChatWindow && gameState !== 'account' ? ' chat-window-active' : ''}`} style={{ display: 'flex', flex: 1, minHeight: 0, position: 'relative', gap: '8px' }}>
                {isCharacterCardOpen && gameState !== 'account' && viewport.isMobile && <CharacterCard />}
                <div
                    className="desktop-center-column"
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        flex: 1,
                        minHeight: 0,
                        overflow: 'hidden',
                        position: 'relative',
                        maxWidth: viewport.isMobile ? 'none' : 'var(--desktop-log-width, clamp(600px, 38vw, 1000px))',
                        width: '100%',
                        margin: viewport.isMobile ? 0 : '0 auto'
                    }}
                >
                    <div
                        className={`message-log-container${isTacticalTargetingActive ? ' tactical-targeting-active' : ''} log-terrain-${getRoomTerrainVisualKey(roomCardTerrain)} log-lighting-${lighting} log-weather-${weather} log-zone-${zoneKey} log-lore-${zoneVisualKey}`}
                        ref={logContainerRef}
                        style={{
                            flex: 1,
                            position: 'relative',
                            overflow: 'hidden',
                        } as React.CSSProperties}
                    >
                        {resolvedBgImage && <div className="log-background-layer" style={{ backgroundImage: `url(${resolvedBgImage})` }} />}
                        {!viewport.isMobile && <>
                            <DrawerResizeHandle handleType="log-left" widthVar="--desktop-log-width" />
                            <DrawerResizeHandle handleType="log-right" widthVar="--desktop-log-width" />
                        </>}
                        {gameState !== 'account' && roomName && (
                            <div className="desktop-log-room-card-wrapper">
                                <MapperRoomInfo section="details" />
                            </div>
                        )}
                        <StickyRoomHeader
                            isNewbieMode={isNewbieMode}
                            roomName={roomName}
                            roomDesc={roomDesc}
                            currentTerrain={currentTerrain}
                            processMessageTokens={processMessageTokens}
                            processMessageHtml={processMessageHtml}
                        />
                        <MessageLog
                            onLogClick={handleLogClick}
                            onMouseUp={handleMouseUp}
                            onPointerDown={handleLogPointerDown}
                            onPointerUp={handleLogPointerUp}
                        />
                        <TimerExpiryToast />
                        {gameState !== 'account' && <QuickButtonBar />}
                        {gameState !== 'account' && roomName && (
                            <div className="log-terrain-chips-overlay">
                                <RoomChipRows variant="terrain-pins" />
                            </div>
                        )}
                    </div>

                    {gameState !== 'account' && (
                        <PromptBox
                            processMessageHtml={processMessageHtml}
                            processMessageTokens={processMessageTokens}
                            onWimpyChange={handleWimpyChange}
                            heldButton={heldButton}
                            setHeldButton={setHeldButton}
                            setCommandPreview={setCommandPreview}
                        />
                    )}

                    {!viewport.isMobile && (gameState !== 'account' || shouldShowAccountInput) && (
                        <ActionBox
                            handleSend={handleSend}
                            handleInputSwipe={handleInputSwipe}
                            commandPreview={commandPreview}
                            setCommandPreview={setCommandPreview}
                            heldButton={heldButton}
                            setHeldButton={setHeldButton}
                            wasDraggingRef={wasDraggingRef}
                        />
                    )}
                </div>
                {showPlayersPanel && gameState !== 'account' && <PlayersPanel />}
                {showChatWindow && gameState !== 'account' && <ChatWindow />}
            </div>

            {isMobile ? (
                /* Mobile Layout: PromptBox and InputArea stacked in control-card-wrapper */
                (gameState !== 'account' || (shouldShowAccountInput && isLandscape)) && (
                    <div className="control-card-wrapper">
                        {((shouldShowAccountInput && isLandscape) || (gameState !== 'account' && isLandscape)) && (
                            <InputArea
                                onSend={handleSend}
                                onSwipe={handleInputSwipe}
                                isMobile={isMobile}
                                isKeyboardOpen={viewport.isKeyboardOpen}
                                commandPreview={commandPreview}
                                terrain={currentTerrain}
                                spatButtons={spatButtons}
                                setActiveSet={btn.setActiveSet}
                                executeCommand={executeCommand}
                                setSpatButtons={setSpatButtons}
                                setPopoverState={setPopoverState}
                                parley={parley}
                                setParley={setParley}
                                whoList={whoList}
                                gameState={gameState}
                            />
                        )}
                    </div>
                )
            ) : null}
        </div>
    );
};
