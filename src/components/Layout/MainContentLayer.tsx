import React, { FC } from 'react';
import Header from '../Header';
import MessageLog from '../MessageLog';
import InputArea from '../InputArea';
import { useGame, useUI, useVitals, useLog } from '../../context/GameContext';
import CombatStatsPanel from '../CombatStatsPanel';
import { LineCluster } from './HUD/LineCluster';
import PromptBox from '../PromptBox';

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
    const { stats, characterInfo, opponentName, opponentHealthStatus, target, activePrompt, playerHealthStatus } = useVitals();
    const {
        env,
        input,
        setInput,
        triggerHaptic,
        btn,
        joystick,
        currentTerrain,
        viewport,
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
        inCombat,
        showControls,
        playerPosition,
        isNewbieMode,
        isRiding,
        characterName
    } = useGame();
    const { processMessageHtml } = useLog();

    const prevInCombatRef = React.useRef(false);
    React.useEffect(() => {
        if (inCombat && !prevInCombatRef.current) {
            // Combat just started — populate OB/DB/PB/Armour
            setTimeout(() => executeCommand('stat', true, true, false, false), 400);
        }
        prevInCombatRef.current = inCombat;
    }, [inCombat, executeCommand]);

    const { setPopoverState } = useUI();
    const logContainerRef = React.useRef<HTMLDivElement>(null);

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

    return (
        <div className="content-layer">
            <Header
                isLandscape={isLandscape}
                getLightingIcon={getLightingIcon}
                getWeatherIcon={getWeatherIcon}
                onResetMap={onResetMap}
            />

            <div className="message-log-wrapper" style={{ display: 'flex', flex: 1, minHeight: 0, position: 'relative', gap: '8px' }}>
                <div className="message-log-container" ref={logContainerRef} style={{ flex: 1 }}>
                    <CombatStatsPanel />
                    <MessageLog
                        onLogClick={handleLogClick}
                        onMouseUp={handleMouseUp}
                        onPointerDown={handleLogPointerDown}
                        onPointerUp={handleLogPointerUp}
                        onDragStart={handleDragStart as any}
                        onDragEnd={handleDragEnd as any}
                    />
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

            {isNewbieMode && (
                <PromptBox
                    stats={stats}
                    characterInfo={characterInfo}
                    characterName={characterName}
                    inCombat={inCombat}
                    playerPosition={playerPosition}
                    opponentName={opponentName}
                    opponentHealthStatus={opponentHealthStatus}
                    playerHealthStatus={playerHealthStatus}
                    isRiding={isRiding}
                    processMessageHtml={processMessageHtml}
                />
            )}

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
            />

        </div>
    );
};
