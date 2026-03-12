import React, { useCallback } from 'react';
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { useGame, useVitals } from '../../context/GameContext';
import './DpadCluster.css';
import { getButtonCommand } from '../../utils/buttonUtils';

interface DpadClusterProps {
    exits: Record<string, any>;
    currentRoomId?: string | null;
    rooms?: Record<string, any>;
    preloaded?: Record<string, any>;
    heldButton?: any;
    setHeldButton?: (val: any) => void;
    setCommandPreview?: (val: string | null) => void;
}

export const DpadCluster: React.FC<DpadClusterProps> = ({
    exits, currentRoomId, rooms, preloaded, heldButton, setHeldButton, setCommandPreview
}) => {
    const { executeCommand, triggerHaptic, joystick, handleButtonClick, btn } = useGame();
    const { target } = useVitals();

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
        const dirMap: Record<string, string> = {
            n: 'north', s: 'south', e: 'east', w: 'west', u: 'up', d: 'down'
        };
        const fullDir = dirMap[dir] || dir;

        if (heldButton && !heldButton.didFire) {
            const hbtn = btn.buttons.find(b => b.id === heldButton.id);
            if (hbtn) {
                // Pass undefined for joystick state so getButtonCommand doesn't append the direction itself,
                // as we are manually appending the fullDir right below.
                const result = getButtonCommand(hbtn, heldButton.dx || 0, heldButton.dy || 0, undefined, 0, heldButton.modifiers, undefined, target);
                if (result && result.cmd) {
                    const finalCmd = `${result.cmd} ${fullDir}`;
                    executeCommand(finalCmd);
                    triggerHaptic(60);
                    if (setHeldButton) setHeldButton((prev: any) => prev ? { ...prev, didFire: true } : null);
                    if (setCommandPreview) setCommandPreview(null);
                    setIsJoystickConsumed(true);
                }
            }
        } else if (!isJoystickConsumed) {
            executeCommand(fullDir);
        }

        setCurrentDir(null);
        setIsJoystickConsumed(false);
    }, [executeCommand, isJoystickConsumed, setCurrentDir, setIsJoystickConsumed, heldButton, btn.buttons, joystick, target, setHeldButton, setCommandPreview]);

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
        </div>
    );
};
