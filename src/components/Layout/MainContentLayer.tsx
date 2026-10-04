import React, { FC } from 'react';
import Header from '../HUD/Header';
import MessageLog from '../Messages/MessageLog';
import ChatWindow from '../Messages/ChatTranscriptWindow';
import GearPanel from '../GearPanel';
import { LogDockedInput } from '../HUD/LogDockedInput';
import InputArea from '../Controls/InputArea';
import { RightActionPanel } from '../HUD/RightActionPanel';
import { CommandGuidePanel } from '../HUD/CommandGuidePanel';
import { useGame, useUI, useLog } from '../../context/GameContext';
import { useModeStore } from '../../stores/useModeStore';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { useUIStore } from '../../stores/useUIStore';
import { useHelpStore } from '../../stores/useHelpStore';
import { useArchiveStore } from '../../stores/useArchiveStore';
import { useCommandPanelStore } from '../../stores/useCommandPanelStore';
import { useGearPanelStore } from '../../stores/useGearPanelStore';
import { getDockedWidth } from '../../utils/dockedPanelUtils';
import { LineCluster } from './HUD/LineCluster';
import ActionBox from '../HUD/ActionBox';
import { CharacterCard } from '../HUD/CharacterCard';
import { useCharacterCardStore } from '../../stores/useCharacterCardStore';
import { ansiConvert } from '../../utils/ansi';
import { sanitizeMumeHtml } from '../../utils/securityUtils';
import { TokenRenderer } from '../Messages/TokenRenderer';
import { TimerExpiryToast } from '../Timers/TimerExpiryToast';
import { RoomLootQueue } from '../HUD/RoomLootQueue';
import { QuickButtonBar } from '../HUD/QuickButtonBar';
import { AccountTargetBar } from '../HUD/AccountTargetBar';
import { MobileAccountCommandGrid } from '../HUD/MobileAccountCommandGrid';
import { MobileAccountExperience } from '../HUD/MobileAccountExperience';
import GroupStatusWindow from '../Messages/GroupStatusWindow';
import { ReplayHUD } from './HUD/ReplayHUD';
import type { MumeEditState } from '../../stores/useUIStore';
import { DrawerResizeHandle } from '../Drawers/DrawerResizeHandle';
import { StickyRoomHeader } from './StickyRoomHeader';
import { MapperRoomInfo } from '../Mapper/MapperRoomInfo';
import { useActiveVitals } from '../../stores/useActiveGameState';
import { getRoomTerrainVisualKey, getZoneVisualKey, getRoomTerrainGlowColor } from '../../utils/roomTerrainVisuals';
import { useMobileGearSwipe } from '../../hooks/useMobileGearSwipe';
import { useDockedPanelLayout } from '../../hooks/useDockedPanelLayout';

const HelpPanel = React.lazy(() => import('../Help/HelpPanel'));
const MumeEditor = React.lazy(() => import('../Utility/MumeEditor'));
const MumeArchive = React.lazy(() => import('../Utility/MumeArchive').then(module => ({ default: module.MumeArchive })));
const ShopPanel = React.lazy(() => import('../Shop/ShopPanel').then(module => ({ default: module.ShopPanel })));

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
        parser,
        roomNpcs,
        parley,
        setParley,
        whoList,
        showControls,
        isNewbieMode,
        gameState,
        sessionMode,
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
    const useMobileAccountPanels = useSettingsStore(s => s.useMobileAccountPanels ?? true);
    const manualBgImage = useSettingsStore(s => s.bgImage);
    const showChatWindow = useSettingsStore(s => s.showChatWindow);
    const showGroupPanel = useSettingsStore(s => s.showGroupPanel);
    const isCommandPanelOpen = useCommandPanelStore(s => viewport.isMobile ? s.isMobileGuideOpen : s.isOpen);
    const isSkillsPanelOpen = useCommandPanelStore(s => viewport.isMobile ? s.isMobileOpen : s.isSkillsOpen);
    const setIsCommandPanelOpen = useCommandPanelStore(s => s.setIsOpen);
    const setIsSkillsPanelOpen = useCommandPanelStore(s => s.setIsSkillsOpen);
    const setIsMobileSkillsPanelOpen = useCommandPanelStore(s => s.setIsMobileOpen);
    const isShopOpen = useUIStore(s => s.isShopOpen);
    const isGearPanelOpen = useGearPanelStore(s => s.isOpen);
    const gearSwipe = useMobileGearSwipe(viewport.isMobile && gameState !== 'account', triggerHaptic);
    const isHelpOpen = useHelpStore(s => s.isOpen);
    const isArchiveOpen = useArchiveStore(s => s.isOpen);

    const isEditorOpen = Boolean(
        mumeEditState?.isOpen &&
        mumeEditState.context?.kind !== 'archive-reply' &&
        mumeEditState.context?.kind !== 'archive-compose' &&
        mumeEditState.context?.kind !== 'self-description' &&
        mumeEditState.context?.kind !== 'self-whois'
    );

    const { activeDockedPanels, hasMobileHeaderPanel, getPanelStyle } = useDockedPanelLayout(
        viewport.isMobile,
        gameState,
        isEditorOpen
    );
    const hasDockedPanels = activeDockedPanels.length > 0;

    React.useEffect(() => {
        if (gameState === 'account' && !viewport.isMobile) setIsCommandPanelOpen(true);
    }, [gameState, accountState.stage, viewport.isMobile, setIsCommandPanelOpen]);

    React.useEffect(() => {
        document.body.classList.toggle('has-docked-panels', hasDockedPanels);
        return () => {
            document.body.classList.remove('has-docked-panels');
        };
    }, [hasDockedPanels]);

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

    const { setPopoverState } = useUI();
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
            }, 1200); // Cross-fade smoothly (1200ms)
            return () => clearTimeout(timer);
        }
    }, [terrainState.triggerFade]);

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
                const commandBar = logContainerRef.current.querySelector<HTMLElement>('.message-log-docked-input');
                const commandBarRect = commandBar?.getBoundingClientRect();
                const mapPanel = [
                    document.querySelector<HTMLElement>('.mobile-map-panel'),
                    document.querySelector<HTMLElement>('.map-drawer-desktop.open')
                ].find(panel => {
                    const panelRect = panel?.getBoundingClientRect();
                    return Boolean(panelRect && panelRect.width > 0 && panelRect.height > 0);
                });
                const mapRect = mapPanel?.getBoundingClientRect();
                const x = rect.left + rect.width / 2;
                const y = rect.top + rect.height / 2;
                document.documentElement.style.setProperty('--wheel-center-x', `${x}px`);
                document.documentElement.style.setProperty('--wheel-center-y', `${y}px`);
                document.documentElement.style.setProperty('--target-menu-log-bottom', `${rect.bottom}px`);
                document.documentElement.style.setProperty('--message-log-left', `${rect.left}px`);
                document.documentElement.style.setProperty('--message-log-top', `${rect.top}px`);
                document.documentElement.style.setProperty('--message-log-width', `${rect.width}px`);
                document.documentElement.style.setProperty('--message-log-height', `${rect.height}px`);
                document.documentElement.style.setProperty(
                    '--message-log-action-area-height',
                    `${commandBarRect ? Math.max(0, commandBarRect.top - rect.top) : rect.height}px`
                );
                document.documentElement.style.setProperty('--tactical-map-left', `${mapRect?.left ?? 0}px`);
                document.documentElement.style.setProperty('--tactical-map-top', `${mapRect?.top ?? 0}px`);
                document.documentElement.style.setProperty('--tactical-map-width', `${mapRect?.width ?? window.innerWidth}px`);
                document.documentElement.style.setProperty('--tactical-map-height', `${mapRect?.height ?? window.innerHeight}px`);
            }
        };

        const observer = new ResizeObserver(updateCenter);
        if (logContainerRef.current) {
            observer.observe(logContainerRef.current);
            const commandBar = logContainerRef.current.querySelector<HTMLElement>('.message-log-docked-input');
            if (commandBar) observer.observe(commandBar);
            document.querySelectorAll<HTMLElement>('.mobile-map-panel, .map-drawer-desktop.open')
                .forEach(mapPanel => observer.observe(mapPanel));
            if (logContainerRef.current.parentElement) {
                observer.observe(logContainerRef.current.parentElement);
            }
        }

        const timeout = setTimeout(updateCenter, 100);
        window.addEventListener('resize', updateCenter);
        window.addEventListener('scroll', updateCenter, true);
        return () => {
            clearTimeout(timeout);
            observer.disconnect();
            window.removeEventListener('resize', updateCenter);
            window.removeEventListener('scroll', updateCenter, true);
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
            // Account mode has no bottom gutter — just use the measured offset.
            const offset = measured;
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

    const { getWeatherIcon } = env;
    const { isMobile, isLandscape } = viewport;
    const showMobileAccountExperience = isMobile && gameState === 'account' && useMobileAccountPanels;
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
        <div
            className={`content-layer view-mode-${activeView}${hasDockedPanels ? ' has-docked-panels' : ''}`}
            style={{
                '--terminal-pane-width': activeDockedPanels.length
                    ? 'clamp(150px, 15vw, 280px)'
                    : '0px',
                '--terminal-panels-width': activeDockedPanels.length
                    ? `calc(${activeDockedPanels.map(getDockedWidth).join(' + ')})`
                    : '0px'
            } as React.CSSProperties}
        >
            {hasMobileHeaderPanel && <div className="mobile-header-panel-blur-backdrop" aria-hidden="true" />}
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
                                transition: 'opacity 1200ms ease-in-out',
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
                            transition: terrainState.prevTerrain ? 'opacity 1200ms ease-in-out' : 'none',
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
                    {/* Ceiling Strip */}
                    {terrainState.prevTerrain && (
                        <div
                            className={`app-ceiling-strip log-terrain-${terrainState.prevTerrain} log-lore-${terrainState.prevLore}`}
                            style={{
                                position: 'absolute',
                                left: 0,
                                right: 0,
                                top: 0,
                                transition: 'opacity 1200ms ease-in-out',
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
                            transition: terrainState.prevTerrain ? 'opacity 1200ms ease-in-out' : 'none',
                            opacity: terrainState.prevTerrain ? (terrainState.triggerFade ? 1 : 0) : 1,
                        }}
                    />
                </div>
            )}
            <Header
                isLandscape={isLandscape}
                getWeatherIcon={getWeatherIcon}
            />
            {viewport.isMobile && showGroupPanel && gameState !== 'account' && <GroupStatusWindow />}
            <ReplayHUD />

            <div className={`message-log-wrapper${hasDockedPanels && gameState !== 'account' ? ' chat-window-active' : ''}`} style={{ display: 'flex', flex: 1, minHeight: 0, position: 'relative', gap: '8px' }}>
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
                    {showMobileAccountExperience ? (
                        <MobileAccountExperience />
                    ) : <>
                    <div
                        className={`message-log-container${isTacticalTargetingActive ? ' tactical-targeting-active' : ''}${isImmersionMode ? ` log-terrain-${getRoomTerrainVisualKey(roomCardTerrain)} log-lighting-${lighting} log-weather-${weather} log-zone-${zoneKey} log-lore-${zoneVisualKey}` : ''}`}
                        ref={logContainerRef}
                        onPointerDown={event => {
                            handleLogPointerDown(event);
                            gearSwipe.onLogPointerDown(event);
                        }}
                        onPointerUp={event => {
                            handleLogPointerUp(event);
                            gearSwipe.onLogPointerUp(event);
                        }}
                        onPointerCancel={event => {
                            handleLogPointerUp(event);
                            gearSwipe.onPointerCancel();
                        }}
                        onTouchStartCapture={gearSwipe.onLogTouchStartCapture}
                        onTouchEndCapture={gearSwipe.onLogTouchEndCapture}
                        onTouchCancelCapture={gearSwipe.onTouchCancel}
                        onClickCapture={gearSwipe.onClickCapture}
                        style={{
                            flex: 1,
                            position: 'relative',
                            overflow: 'hidden',
                            ...(isImmersionMode ? { '--terrain-glow-color': getRoomTerrainGlowColor(roomCardTerrain) } : {})
                        } as React.CSSProperties}
                    >
                        <div className="log-opaque-backdrop" />
                        {resolvedBgImage && <div className="log-background-layer" style={{ backgroundImage: `url(${resolvedBgImage})` }} />}
                        {!viewport.isMobile && <>
                            <DrawerResizeHandle handleType="log-left" widthVar="--desktop-log-width" />
                            <DrawerResizeHandle handleType="log-right" widthVar="--desktop-log-width" />
                        </>}
                        {/* Room card hidden for now */}
                        {false && gameState !== 'account' && roomName && isImmersionMode && (
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
                        {gameState !== 'account' && (
                            <RoomLootQueue
                                isMobile={viewport.isMobile}
                                executeCommand={executeCommand}
                                roomNpcs={roomNpcs || []}
                                parser={parser}
                                triggerHaptic={triggerHaptic}
                            />
                        )}
                        {gameState !== 'account' && <QuickButtonBar />}
                        <LogDockedInput
                            handleSend={handleSend}
                            handleInputSwipe={handleInputSwipe}
                            commandPreview={commandPreview}
                        />
                    </div>

                    <MobileAccountCommandGrid />
                    </>}

                    {gameState !== 'account' && (
                        <ActionBox
                            mobile={viewport.isMobile}
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
                {(isCommandPanelOpen || isSkillsPanelOpen) && (
                    <aside className="docked-panel command-docked-panel" style={getPanelStyle('commands')} aria-label={isSkillsPanelOpen ? 'Skills and Practice panel' : 'Command Guide panel'}>
                        {!viewport.isMobile && <DrawerResizeHandle handleType="left" widthVar="--desktop-character-width" minWidth={14} maxWidth={50} />}
                        {gameState === 'account' ? <MobileAccountExperience /> : isSkillsPanelOpen
                            ? <RightActionPanel skillsOnly onClose={() => viewport.isMobile ? setIsMobileSkillsPanelOpen(false) : setIsSkillsPanelOpen(false)} />
                            : <CommandGuidePanel />}
                    </aside>
                )}
                {isGearPanelOpen && gameState !== 'account' && (
                    <GearPanel style={getPanelStyle('gear')} />
                )}
                {showChatWindow && (
                    <ChatWindow
                        style={getPanelStyle('chat')}
                    />
                )}
                {isShopOpen && !isGearPanelOpen && gameState !== 'account' && (
                    <React.Suspense fallback={null}>
                        <ShopPanel style={getPanelStyle('shop')} />
                    </React.Suspense>
                )}
                {isHelpOpen && gameState !== 'account' && (
                    <React.Suspense fallback={null}>
                        <HelpPanel style={getPanelStyle('help')} />
                    </React.Suspense>
                )}
                {isArchiveOpen && gameState !== 'account' && (
                    <React.Suspense fallback={null}>
                        <MumeArchive style={getPanelStyle('archive')} />
                    </React.Suspense>
                )}
                {isEditorOpen && gameState !== 'account' && (
                    <React.Suspense fallback={null}>
                        <MumeEditor style={getPanelStyle('editor')} />
                    </React.Suspense>
                )}
            </div>

            <AccountTargetBar />

            {isMobile ? (
                /* Mobile Layout: InputArea in control-card-wrapper */
                (shouldShowAccountInput && isLandscape && !showMobileAccountExperience) && (
                    <div className="control-card-wrapper">
                        {(shouldShowAccountInput && isLandscape) && (
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
