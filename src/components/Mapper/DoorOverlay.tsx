import React, { useMemo } from 'react';
import { useGame, useUI, useVitals } from '../../context/GameContext';
import { GameButton } from '../Controls/GameButton/GameButton';
import { GRID_SIZE, DIRS, getGateState } from './mapperUtils';
import { CustomButton } from '../../types';
import './DoorOverlay.css';

interface DoorOverlayProps {
    rooms: Record<string, any>;
    currentRoomId: string | null;
    camera: { x: number, y: number, zoom: number };
    canvasRect: DOMRect | null;
    preloaded: Record<string, any>;
}

export const DoorOverlay: React.FC<DoorOverlayProps> = ({
    rooms, currentRoomId, camera, canvasRect, preloaded
}) => {
    const {
        triggerHaptic, executeCommand,
        viewport, btn, handleButtonClick, joystick
    } = useGame();

    const { target, stats } = useVitals();
    const { ui, setUI, setPopoverState } = useUI();

    const doorButtons = useMemo(() => {
        if (!currentRoomId || !canvasRect) return [];

        const room = rooms[`m_${currentRoomId}`] || rooms[currentRoomId];
        if (!room) return [];

        const doors: any[] = [];
        const s = GRID_SIZE;
        const rx = room.x, ry = room.y;

        // Calculate room's top-left in world space
        const wx = Math.round(rx) * s;
        const wy = Math.round(ry) * s;

        // Base coordinate calculation (relative to canvas top-left)
        const toScreen = (worldX: number, worldY: number) => {
            return {
                x: (worldX - camera.x) * camera.zoom,
                y: (worldY - camera.y) * camera.zoom
            };
        };

        const dirs: ('n' | 's' | 'e' | 'w')[] = ['n', 's', 'e', 'w'];

        dirs.forEach(d => {
            const wEx = preloaded[currentRoomId]?.[4]?.[d];
            const { hasDoor, isClosed } = getGateState(room, wEx, d, rooms, preloaded);

            if (hasDoor) {
                let doorWorldX = wx + s / 2;
                let doorWorldY = wy + s / 2;

                if (d === 'n') doorWorldY = wy;
                else if (d === 's') doorWorldY = wy + s;
                else if (d === 'e') doorWorldX = wx + s;
                else if (d === 'w') doorWorldX = wx;

                const screenPos = toScreen(doorWorldX, doorWorldY);
                const dirName = DIRS[d].name.toLowerCase();

                // Mock a CustomButton for the door
                const doorBtn: CustomButton = {
                    id: `door-${currentRoomId}-${d}`,
                    label: isClosed ? 'Door' : 'Open',
                    command: isClosed ? `open ${dirName}` : `close ${dirName}`,
                    actionType: 'command',
                    display: 'floating',
                    style: {
                        x: 0,
                        y: 0,
                        w: 32,
                        h: 32,
                        backgroundColor: isClosed ? 'rgba(255, 204, 0, 0.8)' : 'rgba(230, 126, 34, 0.8)',
                        borderColor: isClosed ? '#ffcc00' : '#fab387',
                        borderRadius: 16,
                        fontSize: 0.5,
                        shape: 'circle'
                    },
                    isVisible: true,
                    swipeActionTypes: {
                        up: 'command',
                        down: 'command',
                        left: 'command',
                        right: 'command'
                    },
                    longCommand: `pick ${dirName}`,
                    // Map common directions to door actions
                    swipeCommands: {
                        up: `open ${dirName}`,
                        down: `close ${dirName}`,
                        left: `unlock ${dirName}`,
                        right: `bash ${dirName}`
                    } as any, // Extending CustomButton type contextually
                    trigger: {
                        enabled: false,
                        pattern: '',
                        isRegex: false,
                        autoHide: false,
                        duration: 0
                    }
                };

                if (!isClosed) {
                    doorBtn.label = 'Open';
                    doorBtn.command = `close ${dirName}`;
                } else {
                    doorBtn.label = 'Door';
                    doorBtn.command = `open ${dirName}`;
                }

                doors.push({
                    button: doorBtn,
                    screenX: screenPos.x,
                    screenY: screenPos.y,
                    dir: d,
                    isClosed
                });
            }
        });

        return doors;
    }, [rooms, currentRoomId, camera, canvasRect, preloaded]);

    if (!doorButtons.length) return null;

    return (
        <div className="door-overlay" style={{ pointerEvents: 'none' }}>
            {doorButtons.map((door) => (
                <div
                    key={door.button.id}
                    className="door-button-wrapper"
                    style={{
                        position: 'absolute',
                        left: door.screenX,
                        top: door.screenY,
                        transform: 'translate(-50%, -50%)',
                        pointerEvents: 'auto',
                        zIndex: 100
                    }}
                >
                    <GameButton
                        button={door.button}
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
                            isActive: joystick.joystickActive,
                            currentDir: joystick.currentDir,
                            isTargetModifierActive: joystick.isTargetModifierActive,
                            setIsJoystickConsumed: joystick.setIsJoystickConsumed
                        }}
                        target={target}
                        setActiveSet={() => { }}
                        setButtons={() => { }}
                        useDefaultPositioning={false}
                        className="door-map-btn"
                    />
                </div>
            ))}
        </div>
    );
};
