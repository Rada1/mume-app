import React from 'react';
import { SpatButton } from '../types';

interface SpatButtonsProps {
    spatButtons: SpatButton[];
    isMobile: boolean;
    setActiveSet: (setId: string) => void;
    executeCommand: (cmd: string) => void;
    setSpatButtons: React.Dispatch<React.SetStateAction<SpatButton[]>>;
}

export const SpatButtons: React.FC<SpatButtonsProps> = ({
    spatButtons,
    isMobile,
    setActiveSet,
    executeCommand,
    setSpatButtons
}) => {
    return (
        <>
            {spatButtons.map((sb, idx) => {
                const hSlotWidth = 130;
                const vSlotSpacing = 60; // Better spacing for mobile

                let dynamicTargetX = sb.targetX;
                let dynamicTargetY = sb.targetY;

                if (isMobile) {
                    // Stack vertically upward on the right
                    // idx 0 (oldest) is at the bottom. 
                    // Set base to 60% height to stay clear of joystick/controls
                    dynamicTargetY = (window.innerHeight * 0.6) - (idx * vSlotSpacing);
                    // Land 15px from the right edge.
                    dynamicTargetX = window.innerWidth - 15;
                } else {
                    // Desktop: horizontal stack from right to left
                    dynamicTargetX = sb.targetX - (idx * hSlotWidth);
                }

                return (
                    <div
                        key={sb.id}
                        className="spat-button"
                        style={{
                            '--start-x': `${Math.round(sb.startX)}px`,
                            '--start-y': `${Math.round(sb.startY)}px`,
                            '--target-x': `${Math.round(dynamicTargetX)}px`,
                            '--target-y': `${Math.round(dynamicTargetY)}px`,
                            '--target-transform': isMobile ? 'translate(-100%, -50%)' : 'translate(0, -50%)',
                            borderColor: sb.color,
                            boxShadow: `0 4px 15px rgba(0, 0, 0, 0.5), 0 0 10px ${sb.color}`,
                            '--accent': sb.color
                        } as any}
                        onClick={(e) => {
                            e.stopPropagation();
                            if (sb.action === 'nav') setActiveSet(sb.command);
                            else executeCommand(sb.command);
                            setSpatButtons(prev => prev.filter(x => x.id !== sb.id));
                        }}
                    >
                        {sb.label}
                    </div>
                );
            })}
        </>
    );
};
