import React from 'react';
import Header from '../Header';
import MessageLog from '../MessageLog';
import InputArea from '../InputArea';
import { useGame } from '../../context/GameContext';
import { getButtonCommand } from '../../utils/buttonUtils';

interface MainContentLayerProps {
    handleMouseUp: (e: React.MouseEvent) => void;
    handleLogPointerDown: (e: React.PointerEvent) => void;
    handleSend: (e?: React.FormEvent) => void;
    handleInputSwipe: (dir: 'up' | 'down' | 'left' | 'right') => void;
    commandPreview: string | null;
    setCommandPreview: React.Dispatch<React.SetStateAction<string | null>>;
    heldButton: any;
    setHeldButton: React.Dispatch<React.SetStateAction<any>>;
}

export const MainContentLayer: React.FC<MainContentLayerProps> = ({
    handleMouseUp,
    handleLogPointerDown,
    handleSend,
    handleInputSwipe,
    commandPreview,
    setCommandPreview,
    heldButton,
    setHeldButton
}) => {
    const {
        env,
        input,
        setInput,
        target,
        triggerHaptic,
        btn,
        joystick,
        currentTerrain,
        viewport,
        handleLogClick,
        handleLogDoubleClick,
        handleDragStart,
        spatButtons,
        setSpatButtons,
        executeCommand,
        setPopoverState,
        isImmersionMode
    } = useGame();
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
        btn.setUiPositions(prev => ({
            ...prev,
            mapper: { x: undefined, y: 75, w: 320, h: 320, scale: 1 }
        }));
    };

    const handleTargetClick = () => {
        if (target) {
            if (heldButton) {
                const hbtn = btn.buttons.find(b => b.id === heldButton.id);
                const newMods = [...heldButton.modifiers, target];
                setHeldButton((prev: any) => prev ? { ...prev, modifiers: newMods } : null);
                if (hbtn) {
                    const result = getButtonCommand(hbtn, 0, 0, undefined, 0, newMods, joystick, target);
                    setCommandPreview(result?.cmd || null);
                }
                triggerHaptic(20);
            } else {
                setInput(prev => {
                    const trimmed = prev.trim();
                    return trimmed ? `${trimmed} ${target} ` : `${target} `;
                });
            }
        }
    };

    return (
        <div className="content-layer">
            {true && (
                <Header
                    isLandscape={isLandscape}
                    getLightingIcon={getLightingIcon}
                    getWeatherIcon={getWeatherIcon}
                    onResetMap={onResetMap}
                />
            )}

            <div className="message-log-container" ref={logContainerRef}>
                <MessageLog
                    onLogClick={handleLogClick}
                    onMouseUp={handleMouseUp}
                    onDoubleClick={handleLogDoubleClick}
                    onPointerDown={handleLogPointerDown}
                    onDragStart={handleDragStart}
                    onDragEnd={(e) => {
                        const targetEl = (e.target as HTMLElement).closest('.inline-btn');
                        if (targetEl) targetEl.classList.remove('dragging');
                    }}
                />
            </div>

            <InputArea
                input={input}
                setInput={setInput}
                onSend={handleSend}
                onSwipe={handleInputSwipe}
                isMobile={isMobile}
                isKeyboardOpen={viewport.isKeyboardOpen}
                commandPreview={commandPreview}
                target={target}
                onTargetClick={handleTargetClick}
                terrain={currentTerrain}
                spatButtons={spatButtons}
                setActiveSet={btn.setActiveSet}
                executeCommand={executeCommand}
                setSpatButtons={setSpatButtons}
                setPopoverState={setPopoverState}
            />
        </div>
    );
};
