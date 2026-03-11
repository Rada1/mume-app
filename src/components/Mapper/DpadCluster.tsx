import React, { useCallback, useMemo } from 'react';
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { useGame, useUI, useVitals } from '../../context/GameContext';
import { getGateState, DIRS } from './mapperUtils';
import { GameButton } from '../Controls/GameButton/GameButton';
import { CustomButton } from '../../types';
import './DpadCluster.css';

interface DpadClusterProps {
    exits: Record<string, any>;
    currentRoomId?: string | null;
    rooms?: Record<string, any>;
    preloaded?: Record<string, any>;
}

export const DpadCluster: React.FC<DpadClusterProps> = ({
    exits, currentRoomId, rooms, preloaded
}) => {
    const { executeCommand, triggerHaptic, joystick, handleButtonClick } = useGame();
    const { target } = useVitals();
    const { setPopoverState } = useUI();

    const {
        setCurrentDir = () => { },
        setIsJoystickConsumed = () => { },
        isJoystickConsumed = false
    } = joystick || {};

    const onPointerDown = useCallback((dir: string, e: React.PointerEvent) => {
        e.stopPropagation();
        triggerHaptic(20);
        setCurrentDir(dir as any);
        setIsJoystickConsumed(false);
    }, [triggerHaptic, setCurrentDir, setIsJoystickConsumed]);

    const onPointerUp = useCallback((dir: string, e: React.PointerEvent) => {
        e.stopPropagation();

        if (!isJoystickConsumed) {
            const dirMap: Record<string, string> = {
                n: 'north', s: 'south', e: 'east', w: 'west', u: 'up', d: 'down'
            };
            executeCommand(dirMap[dir] || dir);
        }

        setCurrentDir(null);
        setIsJoystickConsumed(false);
    }, [executeCommand, isJoystickConsumed, setCurrentDir, setIsJoystickConsumed]);

    const onPointerCancel = useCallback(() => {
        setCurrentDir(null);
        setIsJoystickConsumed(false);
    }, [setCurrentDir, setIsJoystickConsumed]);

    const hasExit = (dir: string) => exits && exits[dir] !== undefined;

    const renderBtn = (dir: string, icon: React.ReactNode, className: string) => {
        if (!hasExit(dir)) return null;
        return (
            <div
                className={`dpad-btn ${className}`}
                onPointerDown={(e) => onPointerDown(dir, e)}
                onPointerUp={(e) => onPointerUp(dir, e)}
                onPointerCancel={onPointerCancel}
            >
                {icon}
            </div>
        );
    };

    const doorButtons = useMemo(() => {
        if (!currentRoomId || !rooms || !preloaded) return [];
        const room = rooms[`m_${currentRoomId}`] || rooms[currentRoomId];
        if (!room) return [];

        const doors: CustomButton[] = [];
        const dirs: ('n' | 's' | 'e' | 'w' | 'u' | 'd')[] = ['n', 's', 'e', 'w', 'u', 'd'];
        const vnum = String(currentRoomId || "").replace(/^m_/, '');

        for (const d of dirs) {
            const wEx = preloaded[vnum]?.[4]?.[d];
            const { hasDoor, isClosed } = getGateState(room, wEx, d, rooms, preloaded);

            if (hasDoor) {
                const dirName = DIRS[d].name.toLowerCase();
                const doorBtn: CustomButton = {
                    id: `door-${currentRoomId}-${d}`,
                    label: isClosed ? d.toUpperCase() : 'O',
                    command: isClosed ? `open exit` : `close exit`,
                    actionType: 'command',
                    display: 'floating',
                    style: {
                        x: 0, y: 0, w: 40, h: 70,
                        backgroundColor: 'transparent',
                        borderColor: isClosed ? '#ffcc00' : '#fab387',
                        borderRadius: 8,
                        fontSize: 0.8,
                        shape: 'rect',
                        transparent: true
                    },
                    trigger: {
                        enabled: false,
                        pattern: '',
                        isRegex: false,
                        autoHide: false,
                        duration: 0
                    },
                    isVisible: true,
                    swipeActionTypes: { up: 'command', down: 'command', left: 'command', right: 'command' },
                    longCommand: isClosed ? `pick exit` : `lock exit`,
                    swipeCommands: {
                        up: `open exit`,
                        down: `close exit`,
                        left: `unlock exit`,
                        right: `bash exit`
                    }
                };

                if (!isClosed) {
                    doorBtn.label = 'Open';
                    doorBtn.command = `close exit`;
                } else {
                    doorBtn.label = 'Door';
                    doorBtn.command = `open exit`;
                }

                doors.push(doorBtn);
                break; // Stop after finding the first door
            }
        }
        return doors;
    }, [currentRoomId, rooms, preloaded]);

    return (
        <div className="dpad-container-with-sidebar">
            <div className="dpad-cluster">
                {renderBtn('n', <ChevronUp size={32} />, 'n')}
                {renderBtn('s', <ChevronDown size={32} />, 's')}
                {renderBtn('e', <ChevronRight size={32} />, 'e')}
                {renderBtn('w', <ChevronLeft size={32} />, 'w')}
                {renderBtn('u', <ChevronUp size={32} />, 'u')}
                {renderBtn('d', <ChevronDown size={32} />, 'd')}
            </div>
            {doorButtons.length > 0 && (
                <div className="door-sidebar">
                    {doorButtons.map(btnObj => (
                        <GameButton
                            key={btnObj.id}
                            button={btnObj}
                            isEditMode={false}
                            isGridEnabled={false}
                            gridSize={10}
                            isSelected={false}
                            dragState={null}
                            handleDragStart={() => { }}
                            handleButtonClick={handleButtonClick}
                            wasDraggingRef={{ current: false } as any}
                            triggerHaptic={triggerHaptic}
                            setPopoverState={setPopoverState}
                            setEditButton={() => { }}
                            activePrompt={null}
                            executeCommand={executeCommand}
                            setCommandPreview={() => { }}
                            setHeldButton={() => { }}
                            heldButton={null}
                            joystick={{
                                isActive: joystick?.joystickActive || false,
                                currentDir: joystick?.currentDir || null,
                                isTargetModifierActive: joystick?.isTargetModifierActive || false,
                                setIsJoystickConsumed: joystick?.setIsJoystickConsumed || (() => { })
                            }}
                            target={target}
                            setActiveSet={() => { }}
                            setButtons={() => { }}
                            useDefaultPositioning={false}
                            className="door-sidebar-btn"
                        />
                    ))}
                </div>
            )}
        </div>
    );
};
