/**
 * @file ActionBox.tsx
 * @description Container for tactical buttons (LineCluster) and command line (InputArea) on desktop.
 */

import React, { FC, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useGame, useUI, useVitals } from '../../context/GameContext';
import { useActiveVitals } from '../../stores/useActiveGameState';
import { LineCluster } from '../Layout/HUD/LineCluster';
import InputArea from '../Controls/InputArea';
import { ActionCheatSheet } from './ActionCheatSheet';
import './ActionBox.css';

interface ActionBoxProps {
    handleSend: (e?: React.FormEvent) => void;
    handleInputSwipe: (dir: 'up' | 'down' | 'left' | 'right' | 'sw') => void;
    commandPreview: string | null;
    setCommandPreview: React.Dispatch<React.SetStateAction<string | null>>;
    heldButton: unknown;
    setHeldButton: React.Dispatch<React.SetStateAction<unknown>>;
    wasDraggingRef: React.RefObject<boolean>;
}

export const ActionBox: FC<ActionBoxProps> = ({
    handleSend,
    handleInputSwipe,
    commandPreview,
    setCommandPreview,
    heldButton,
    setHeldButton,
    wasDraggingRef
}) => {
    // --- Logic Section ---
    const {
        triggerHaptic,
        executeCommand,
        viewport,
        btn,
        joystick,
        editor,
        handleButtonClick,
        currentTerrain,
        spatButtons,
        setSpatButtons,
        parley,
        setParley,
        whoList,
        gameState
    } = useGame() as {
        triggerHaptic: (ms: number) => void;
        executeCommand: (cmd: string, silent?: boolean, sys?: boolean, isRetry?: boolean, forceHistory?: boolean) => void;
        viewport: { isMobile: boolean; isKeyboardOpen: boolean; isLandscape: boolean };
        btn: {
            isEditMode: boolean;
            buttons: unknown[];
            selectedButtonIds: Set<string>;
            dragState: unknown;
            setEditingButtonId: (id: string | null) => void;
            setSelectedIds: (ids: Set<string>) => void;
            isGridEnabled: boolean;
            gridSize: number;
            setActiveSet: (setId: string) => void;
            setButtons: (val: unknown) => void;
        };
        joystick: unknown;
        editor: {
            handleDragStart: (e: React.PointerEvent, id: string, type: 'move' | 'resize' | 'cluster' | 'cluster-resize') => void;
            wasDraggingRef: React.RefObject<boolean>;
        };
        handleButtonClick: (b: unknown, e: unknown) => void;
        currentTerrain: string;
        spatButtons: unknown;
        setSpatButtons: React.Dispatch<React.SetStateAction<unknown>>;
        parley: unknown;
        setParley: React.Dispatch<React.SetStateAction<unknown>>;
        whoList: unknown;
        gameState: string;
    };

    const { setPopoverState } = useUI() as {
        setPopoverState: (val: unknown) => void;
    };
    const { activePrompt } = useVitals() as {
        activePrompt: unknown;
    };
    const { target } = useActiveVitals() as {
        target: string | null;
    };

    const [isCheatSheetExpanded, setIsCheatSheetExpanded] = useState(() => {
        return localStorage.getItem('mud-cheatsheet-expanded') === 'true';
    });

    const handleToggleCheatSheet = (expanded: boolean) => {
        setIsCheatSheetExpanded(expanded);
        localStorage.setItem('mud-cheatsheet-expanded', String(expanded));
    };

    // The tactical action buttons live in the map drawer (bottom-left), not next to the
    // command line, so they're portaled into a slot rendered by DrawerManager.
    const [tacticalButtonsSlot, setTacticalButtonsSlot] = useState<HTMLElement | null>(null);
    useEffect(() => {
        let timer: any;
        const checkSlot = () => {
            const el = document.getElementById('map-drawer-actions-slot');
            if (el) {
                setTacticalButtonsSlot(el);
            } else {
                setTacticalButtonsSlot(null);
                timer = window.setTimeout(checkSlot, 100);
            }
        };
        checkSlot();
        return () => {
            if (timer) clearTimeout(timer);
        };
    }, [gameState]);

    type LineClusterButtonsType = Parameters<typeof LineCluster>[0]['buttons'];

    const tacticalButtons = gameState !== 'account' && (
        <>
            <div className="desktop-tactical-buttons-persistent" onClick={e => e.stopPropagation()}>
                <LineCluster
                    isEditMode={btn.isEditMode}
                    handleDragStart={editor.handleDragStart}
                    buttons={btn.buttons as LineClusterButtonsType}
                    selectedButtonIds={btn.selectedButtonIds}
                    dragState={btn.dragState}
                    handleButtonClick={handleButtonClick}
                    wasDraggingRef={wasDraggingRef}
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
                    isMobile={viewport.isMobile}
                    isCheatSheetExpanded={isCheatSheetExpanded}
                    setIsCheatSheetExpanded={handleToggleCheatSheet}
                />
            </div>
            {isCheatSheetExpanded && (
                <ActionCheatSheet executeCommand={executeCommand} />
            )}
        </>
    );

    return (
        <>
            {tacticalButtonsSlot && createPortal(tacticalButtons, tacticalButtonsSlot)}
            <div className="action-box">
                <InputArea
                    onSend={handleSend}
                    onSwipe={handleInputSwipe}
                    isMobile={viewport.isMobile}
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
            </div>
        </>
    );
};

export default ActionBox;
