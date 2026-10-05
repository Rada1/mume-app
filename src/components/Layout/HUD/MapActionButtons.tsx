/** @file MapActionButtons.tsx — Hit and Flee actions at the bottom of the mobile map. */

import React from 'react';
import type { ActivePrompt, CustomButton } from '../../../types';
import { GameButton, type GameButtonProps } from '../../Controls/GameButton/GameButton';

// --- Logic Section ---
const MAP_ACTIONS: CustomButton[] = [
    {
        id: 'map-action-hit',
        label: 'Hit',
        command: 'hit',
        setId: 'Tactical',
        actionType: 'command',
        swipeCommands: { up: 'assist' },
        swipeActionTypes: { up: 'command' },
        display: 'floating',
        style: { x: 0, y: 0, w: 270, h: 40, backgroundColor: 'rgba(255, 255, 255, 0.04)', borderColor: 'rgba(255, 255, 255, 0.18)', color: 'rgba(255, 255, 255, 0.82)', borderRadius: 8, fontSize: 13, shape: 'pill' },
        position: { x: 0, y: 0, w: 270, h: 40 },
        isVisible: true
    },
    {
        id: 'map-action-flee',
        label: 'Flee',
        command: 'flee',
        setId: 'Tactical',
        actionType: 'command',
        swipeCommands: { up: 'disengage' },
        swipeActionTypes: { up: 'command' },
        display: 'floating',
        style: { x: 0, y: 0, w: 270, h: 40, backgroundColor: 'rgba(255, 255, 255, 0.04)', borderColor: 'rgba(255, 255, 255, 0.18)', color: 'rgba(255, 255, 255, 0.82)', borderRadius: 8, fontSize: 13, shape: 'pill' },
        position: { x: 0, y: 0, w: 270, h: 40 },
        isVisible: true
    }
];

type SharedButtonProps = Pick<GameButtonProps,
    'isGridEnabled' | 'gridSize' | 'dragState' | 'handleDragStart' | 'handleButtonClick' |
    'wasDraggingRef' | 'triggerHaptic' | 'setPopoverState' | 'executeCommand' |
    'setCommandPreview' | 'setHeldButton' | 'heldButton' | 'joystick' | 'target' | 'setActiveSet' |
    'setButtons' | 'isMobile'
>;

interface Props extends SharedButtonProps {
    setEditButton: GameButtonProps['setEditButton'];
    activePrompt: ActivePrompt | null;
}

// --- UI Section ---
export const MapActionButtons: React.FC<Props> = props => (
    <div className="mobile-map-bottom-actions" aria-label="Map actions">
        {MAP_ACTIONS.map(button => (
            <GameButton
                key={button.id}
                button={button}
                className={`map-action-button ${button.id}`}
                isEditMode={false}
                isGridEnabled={props.isGridEnabled}
                gridSize={props.gridSize}
                isSelected={false}
                dragState={props.dragState}
                handleDragStart={props.handleDragStart}
                handleButtonClick={props.handleButtonClick}
                wasDraggingRef={props.wasDraggingRef}
                triggerHaptic={props.triggerHaptic}
                setPopoverState={props.setPopoverState}
                setEditButton={props.setEditButton}
                activePrompt={props.activePrompt?.text ?? null}
                executeCommand={props.executeCommand}
                setCommandPreview={props.setCommandPreview}
                setHeldButton={props.setHeldButton}
                heldButton={props.heldButton}
                joystick={props.joystick}
                target={props.target}
                setActiveSet={props.setActiveSet}
                setButtons={props.setButtons}
                isMobile={props.isMobile}
                useDefaultPositioning={false}
            />
        ))}
    </div>
);
