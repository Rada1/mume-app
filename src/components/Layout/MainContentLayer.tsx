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

    const isImmersionMode = useSettingsStore(s => s.isImmersionMode);
    const manualBgImage = useSettingsStore(s => s.bgImage);
    const showChatWindow = useSettingsStore(s => s.showChatWindow);
    const showPlayersPanel = useSettingsStore(s => s.showPlayersPanel);
    const isSpectating = activeSession === 'spectate' || activeView === 'target';
    const roomCardTerrain = isSpectating ? spectateTerrain : currentTerrain;

    // Account mode keeps the log transparent (environment shows through) like the
    // in-game view, rather than a dark account splash behind the menu text.
    const resolvedBgImage = manualBgImage || null;
    React.useEffect(() => {
        const root = document.documentElement;
        if (!resolvedBgImage) {
            root.style.removeProperty('--account-gutter-bg-image');
            return;
        }
        root.style.setProperty('--account-gutter-bg-image', `url("${resolvedBgImage.replace(/"/g, '\\"')}")`);
        return () => {
            root.style.removeProperty('--account-gutter-bg-image');
        };
    }, [resolvedBgImage]);

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

    // --- Terrain Strip Cross-Fade State & Effects ---
    const currentTerrainKey = getRoomTerrainVisualKey(gameState === 'account' ? 'forest' : roomCardTerrain);
    const currentLoreKey = gameState === 'account' ? 'default' : zoneVisualKey;

    const [terrainState, setTerrainState] = React.useState({
        currentTerrain: currentTerrainKey,
        currentLore: currentLoreKey,
        prevTerrain: null as string | null,
        prevLore: null as string | null,
        triggerFade: false
    });

    React.useLayoutEffect(() => {
        if (currentTerrainKey !== terrainState.currentTerrain || currentLoreKey !== terrainState.currentLore) {
            setTerrainState(prev => ({
                currentTerrain: currentTerrainKey,
                currentLore: currentLoreKey,
                prevTerrain: prev.currentTerrain,
                prevLore: prev.currentLore,
                triggerFade: false
            }));
        }
    }, [currentTerrainKey, currentLoreKey, terrainState.currentTerrain, terrainState.currentLore]);

    React.useEffect(() => {
        if (terrainState.prevTerrain && !terrainState.triggerFade) {
            const raf = requestAnimationFrame(() => {
                setTerrainState(prev => ({ ...prev, triggerFade: true }));
            });
            return () => cancelAnimationFrame(raf);
        }
    }, [terrainState.prevTerrain, terrainState.triggerFade]);

    React.useEffect(() => {
        if (terrainState.triggerFade) {
            const timer = setTimeout(() => {
                setTerrainState(prev => ({
                    ...prev,
                    prevTerrain: null,
                    prevLore: null,
                    triggerFade: false
                }));
            }, 150); // Cross-fade quickly (150ms)
            return () => clearTimeout(timer);
        }
    }, [terrainState.triggerFade]);

    // --- Sky Art Strip Cross-Fade State & Effects ---
    const currentSkyLighting = skyLightingClass;
    const currentSkyWeather = weather;
    const currentSkyTerrain = getRoomTerrainVisualKey(roomCardTerrain);

    const [skyState, setSkyState] = React.useState({
        currentLighting: currentSkyLighting,
        currentWeather: currentSkyWeather,
        currentTerrain: currentSkyTerrain,
        prevLighting: null as string | null,
        prevWeather: null as string | null,
        prevTerrain: null as string | null,
        triggerFade: false
    });

    React.useLayoutEffect(() => {
        if (
            currentSkyLighting !== skyState.currentLighting ||
            currentSkyWeather !== skyState.currentWeather ||
            currentSkyTerrain !== skyState.currentTerrain
        ) {
            setSkyState(prev => ({
                currentLighting: currentSkyLighting,
                currentWeather: currentSkyWeather,
                currentTerrain: currentSkyTerrain,
                prevLighting: prev.currentLighting,
                prevWeather: prev.currentWeather,
                prevTerrain: prev.currentTerrain,
                triggerFade: false
            }));
        }
    }, [currentSkyLighting, currentSkyWeather, currentSkyTerrain, skyState.currentLighting, skyState.currentWeather, skyState.currentTerrain]);

    React.useEffect(() => {
        if (skyState.prevTerrain && !skyState.triggerFade) {
            const raf = requestAnimationFrame(() => {
                setSkyState(prev => ({ ...prev, triggerFade: true }));
            });
            return () => cancelAnimationFrame(raf);
        }
    }, [skyState.prevTerrain, skyState.triggerFade]);

    React.useEffect(() => {
        if (skyState.triggerFade) {
            const timer = setTimeout(() => {
                setSkyState(prev => ({
                    ...prev,
                    prevLighting: null,
                    prevWeather: null,
                    prevTerrain: null,
                    triggerFade: false
                }));
            }, 150); // Cross-fade quickly (150ms)
            return () => clearTimeout(timer);
        }
    }, [skyState.triggerFade]);

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
            // On mobile account screens the account gutter is rendered outside the
            // normal desktop action box, so keep the terrain strip above that sheet
            // instead of letting the gutter lip cover the pixel art.
            const accountGutter = document.querySelector<HTMLElement>('.mobile-bottom-gutter.account-gutter');
            const accountGutterHeight = viewport.isMobile && !viewport.isLandscape && accountGutter
                ? Math.ceil(accountGutter.getBoundingClientRect().height)
                : 52;
            const offset = gameState === 'account' ? Math.max(measured, accountGutterHeight) : measured;
            document.documentElement.style.setProperty('--log-terrain-bottom-offset', `${offset}px`);
        };

        const observer = new ResizeObserver(updateBottomOffset);
        if (logContainerRef.current) {
            observer.observe(logContainerRef.current);
            if (logContainerRef.current.parentElement) {
                observer.observe(logContainerRef.current.parentElement);
            }
        }
        const accountGutter = document.querySelector<HTMLElement>('.mobile-bottom-gutter.account-gutter');
        if (accountGutter) {
            observer.observe(accountGutter);
        }

        const timeout = setTimeout(updateBottomOffset, 100);
        window.addEventListener('resize', updateBottomOffset);
        return () => {
            clearTimeout(timeout);
            observer.disconnect();
            window.removeEventListener('resize', updateBottomOffset);
        };
    }, [gameState, viewport.isLandscape, viewport.isMobile]);

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
            {!viewport.isMobile && isImmersionMode && (
                <div
                    style={{
                        position: 'fixed',
                        left: 0,
                        right: 0,
                        bottom: 'var(--log-terrain-bottom-offset, 0px)',
                        zIndex: 4500,
                        pointerEvents: 'none',
                        height: '46px'
                    }}
                >
                    {terrainState.prevTerrain && (
                        <div
                            className={`app-terrain-strip log-terrain-${terrainState.prevTerrain} log-lore-${terrainState.prevLore}`}
                            style={{
                                position: 'absolute',
                                left: 0,
                                right: 0,
                                bottom: 0,
                                transition: 'opacity 150ms ease-in-out',
                                opacity: terrainState.triggerFade ? 0 : 1,
                            }}
                        />
                    )}
                    <div
                        className={`app-terrain-strip log-terrain-${terrainState.currentTerrain} log-lore-${terrainState.currentLore}`}
                        style={{
                            position: 'absolute',
                            left: 0,
                            right: 0,
                            bottom: 0,
                            transition: terrainState.prevTerrain ? 'opacity 150ms ease-in-out' : 'none',
                            opacity: terrainState.prevTerrain ? (terrainState.triggerFade ? 1 : 0) : 1,
                        }}
                    />
                </div>
            )}
            {!viewport.isMobile && gameState !== 'account' && isImmersionMode && (
                <div
                    style={{
                        position: 'fixed',
                        left: 0,
                        right: 0,
                        top: 'var(--log-sky-top-offset, 0px)',
                        zIndex: 4500,
                        pointerEvents: 'none',
                        height: '32px'
                    }}
                >
                    {/* Sky Art Strip */}
                    {skyState.prevTerrain && (
                        <div
                            className={`app-sky-art-strip ${skyState.prevLighting} weather-${skyState.prevWeather} terrain-${skyState.prevTerrain}`}
                            style={{
                                position: 'absolute',
                                left: 0,
                                right: 0,
                                top: 0,
                                transition: 'opacity 150ms ease-in-out',
                                opacity: skyState.triggerFade ? 0 : 1,
                            }}
                        />
                    )}
                    <div
                        className={`app-sky-art-strip ${skyState.currentLighting} weather-${skyState.currentWeather} terrain-${skyState.currentTerrain}`}
                        style={{
                            position: 'absolute',
                            left: 0,
                            right: 0,
                            top: 0,
                            transition: skyState.prevTerrain ? 'opacity 150ms ease-in-out' : 'none',
                            opacity: skyState.prevTerrain ? (skyState.triggerFade ? 1 : 0) : 1,
                        }}
                    />

                    {/* Ceiling Strip */}
                    {terrainState.prevTerrain && (
                        <div
                            className={`app-ceiling-strip log-terrain-${terrainState.prevTerrain} log-lore-${terrainState.prevLore}`}
                            style={{
                                position: 'absolute',
                                left: 0,
                                right: 0,
                                top: 0,
                                transition: 'opacity 150ms ease-in-out',
                                opacity: terrainState.triggerFade ? 0 : 1,
                            }}
                        />
                    )}
                    <div
                        className={`app-ceiling-strip log-terrain-${terrainState.currentTerrain} log-lore-${terrainState.currentLore}`}
                        style={{
                            position: 'absolute',
                            left: 0,
                            right: 0,
                            top: 0,
                            transition: terrainState.prevTerrain ? 'opacity 150ms ease-in-out' : 'none',
                            opacity: terrainState.prevTerrain ? (terrainState.triggerFade ? 1 : 0) : 1,
                        }}
                    />
                </div>
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
                        className={`message-log-container${isTacticalTargetingActive ? ' tactical-targeting-active' : ''}${isImmersionMode ? ` log-terrain-${getRoomTerrainVisualKey(roomCardTerrain)} log-lighting-${lighting} log-weather-${weather} log-zone-${zoneKey} log-lore-${zoneVisualKey}` : ''}`}
                        ref={logContainerRef}
                        style={{
                            flex: 1,
                            position: 'relative',
                            overflow: 'hidden',
                        } as React.CSSProperties}
                    >
                        <div className="log-opaque-backdrop" />
                        {resolvedBgImage && <div className="log-background-layer" style={{ backgroundImage: `url(${resolvedBgImage})` }} />}
                        {!viewport.isMobile && <>
                            <DrawerResizeHandle handleType="log-left" widthVar="--desktop-log-width" />
                            <DrawerResizeHandle handleType="log-right" widthVar="--desktop-log-width" />
                        </>}
                        {gameState !== 'account' && roomName && isImmersionMode && (
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
                        {gameState !== 'account' && roomName && isImmersionMode && (
                            <div className="log-terrain-chips-overlay">
                                <RoomChipRows variant="terrain-pins" />
                            </div>
                        )}
                    </div>

                    {/* On mobile the prompt box is a standalone row above the log's
                        bottom. On desktop it slots into the action-box grid instead
                        (passed as promptSlot below) so the bottom bar is one gapless
                        unit — the prompt fills the center's top cell while the side
                        button columns rise to the drawer bottom around it. */}
                    {gameState !== 'account' && viewport.isMobile && isImmersionMode && (
                        <PromptBox
                            processMessageHtml={processMessageHtml}
                            processMessageTokens={processMessageTokens}
                            onWimpyChange={handleWimpyChange}
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
                            promptSlot={gameState !== 'account' && isImmersionMode ? (
                                <PromptBox
                                    processMessageHtml={processMessageHtml}
                                    processMessageTokens={processMessageTokens}
                                    onWimpyChange={handleWimpyChange}
                                />
                            ) : null}
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
