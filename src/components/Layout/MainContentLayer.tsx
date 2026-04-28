import React, { FC } from 'react';
import Header from '../HUD/Header';
import MessageLog from '../Messages/MessageLog';
import InputArea from '../Controls/InputArea';
import { useGame, useUI, useVitals, useLog } from '../../context/GameContext';
import { useModeStore } from '../../stores/useModeStore';
import CombatStatsPanel from '../Combat/CombatStatsPanel';
import { LineCluster } from './HUD/LineCluster';
import PromptBox from '../HUD/PromptBox';
import { ansiConvert } from '../../utils/ansi';
import { sanitizeMumeHtml } from '../../utils/securityUtils';
import { TokenRenderer } from '../Messages/TokenRenderer';

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
    mumeEditState: { isOpen: boolean; title: string; text: string; key: string };
    setMumeEditState: React.Dispatch<React.SetStateAction<{ isOpen: boolean; title: string; text: string; key: string }>>;
    handleDragStart: (e: any, id: string, type: string) => void;
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
    handleDragStart,
    wasDraggingRef
}) => {
    const { setStats, activePrompt, target } = useVitals() as any;
    const {
        env,
        bgImage,
        input,
        setInput,
        triggerHaptic,
        btn,
        joystick,
        currentTerrain,
        viewport,
        roomName,
        roomDesc,
        handleLogClick,
        handleLogDoubleClick,
        handleDragEnd,
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
        inCombat
    } = useGame() as any;
    const isSpectateMode = useModeStore(s => s.isSpectating);
    const { processMessageHtml, processMessageTokens } = useLog();

    const prevInCombatRef = React.useRef(false);
    React.useEffect(() => {
    }, [inCombat, executeCommand]);
    
    const { setPopoverState } = useUI();

    const handleWimpyChange = React.useCallback((val: number) => {
        triggerHaptic(10);
        // Optimistic update
        setStats(prev => ({ ...prev, wimpy: val }));
        executeCommand(`change wimpy ${val}`, true, true);
    }, [executeCommand, triggerHaptic, setStats]);
    const logContainerRef = React.useRef<HTMLDivElement>(null);
    const [headerHeight, setHeaderHeight] = React.useState(0);


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

    const { getLightingIcon, getWeatherIcon } = env;
    const { isMobile, isLandscape } = viewport;

    const onResetMap = () => {
        triggerHaptic(20);
        btn.setUiPositions((prev: any) => ({
            ...prev,
            mapper: { x: undefined, y: 75, w: 320, h: 320, scale: 1 }
        }));
    };

    const { activeView } = useModeStore();

    return (
        <div className={`content-layer view-mode-${activeView}`}>
            <Header
                isLandscape={isLandscape}
                getLightingIcon={getLightingIcon}
                getWeatherIcon={getWeatherIcon}
                onResetMap={onResetMap}
            />

            <div className="message-log-wrapper" style={{ display: 'flex', flex: 1, minHeight: 0, position: 'relative', gap: '8px' }}>
                <div className="message-log-container" ref={logContainerRef} style={{ flex: 1 }}>
                    {isNewbieMode && roomName && (
                        <div className={`sticky-room-header terrain-${String(currentTerrain || 'field').toLowerCase()}`} key="newbie-room-header">
                            <div className="room-info-text">
                                <div className="message-content room-name">
                                    {processMessageTokens ? <TokenRenderer tokens={processMessageTokens(`\x1b[1;32m${roomName}\x1b[0m`)} /> : <span dangerouslySetInnerHTML={{ __html: sanitizeMumeHtml(processMessageHtml(ansiConvert.toHtml(`\x1b[1;32m${roomName}\x1b[0m`), 'roomname', true, 'room-name' as any)) }} />}
                                </div>
                                {roomDesc && (
                                    <div className="message-content room-desc">
                                        {processMessageTokens ? <TokenRenderer tokens={processMessageTokens(`\x1b[0m${roomDesc}`)} /> : <span dangerouslySetInnerHTML={{ __html: sanitizeMumeHtml(processMessageHtml(ansiConvert.toHtml(`\x1b[0m${roomDesc}`), 'roomdesc', false, 'room-desc' as any)) }} />}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                    <MessageLog
                        onLogClick={handleLogClick}
                        onMouseUp={handleMouseUp}
                        onPointerDown={handleLogPointerDown}
                        onPointerUp={handleLogPointerUp}
                        onDragStart={handleDragStart as any}
                        onDragEnd={handleDragEnd as any}
                    />
                    {(!isMobile || (viewport as any).isForceDesktop || isLandscape) && <CombatStatsPanel />}
                </div>

                {!isMobile && (
                    <div className={`line-cluster-container desktop-inline ${!showControls && !btn.isEditMode ? 'hud-hidden' : ''}`}>
                        <LineCluster
                            isEditMode={btn.isEditMode}
                            handleDragStart={handleDragStart as any}
                            buttons={btn.buttons}
                            selectedButtonIds={btn.selectedButtonIds}
                            dragState={btn.dragState}
                            handleButtonClick={handleButtonClick}
                            wasDraggingRef={wasDraggingRef as any}
                            triggerHaptic={triggerHaptic}
                            setPopoverState={setPopoverState}
                            setEditingButtonId={btn.setEditingButtonId}
                            setSelectedIds={btn.setSelectedIds}
                            activePrompt={activePrompt}
                            executeCommand={executeCommand}
                            setCommandPreview={setCommandPreview}
                            heldButton={heldButton}
                            setHeldButton={setHeldButton}
                            joystick={joystick}
                            target={target}
                            isGridEnabled={btn.isGridEnabled}
                            gridSize={btn.gridSize}
                            setActiveSet={btn.setActiveSet}
                            setButtons={btn.setButtons}
                            isMobile={isMobile}
                        />
                    </div>
                )}

                {/* Mobile portrait LineCluster is rendered inside MapperCluster (near the map gutter) */}
            </div>

            <PromptBox
                processMessageHtml={processMessageHtml}
                processMessageTokens={processMessageTokens}
                onWimpyChange={!isSpectateMode ? handleWimpyChange : undefined}
            />

            {/* Render InputArea only on desktop, landscape mobile, or during account phase 
                This prevents the duplicate command bar in portrait mobile play mode. */}
            {((gameState === 'account' && (isLandscape || !isMobile)) || (!isMobile && !(viewport as any).isForcePortrait) || isLandscape) && (
                <InputArea
                    input={input}
                    setInput={setInput}
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
    );
};
