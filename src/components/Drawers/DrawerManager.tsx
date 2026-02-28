import React from 'react';
import { InventoryDrawer } from './InventoryDrawer';
import { CharacterDrawer } from './CharacterDrawer';
import { EquipmentDrawer } from './EquipmentDrawer';

interface DrawerManagerProps {
    isMobile: boolean;
    drawers: {
        inventory: { isOpen: boolean; setOpen: (val: boolean) => void };
        character: { isOpen: boolean; setOpen: (val: boolean) => void };
        right: { isOpen: boolean; setOpen: (val: boolean) => void };
    };
    triggerHaptic: (ms: number) => void;
    statsHtml: string;
    mood: string;
    setMood: (mood: string) => void;
    spellSpeed: string;
    setSpellSpeed: (speed: string) => void;
    alertness: string;
    setAlertness: (alertness: string) => void;
    playerPosition: string;
    setPlayerPosition: (pos: string) => void;
    executeCommand: (cmd: string) => void;
    stats: any;
    hpRowRef: React.RefObject<HTMLDivElement>;
    manaRowRef: React.RefObject<HTMLDivElement>;
    moveRowRef: React.RefObject<HTMLDivElement>;
    handleWimpyChange: (val: number) => void;
    eqHtml: string;
    inventoryHtml: string;
    handleLogClick: (e: React.MouseEvent) => void;
}

export const DrawerManager: React.FC<DrawerManagerProps> = ({
    isMobile,
    drawers,
    triggerHaptic,
    statsHtml,
    mood,
    setMood,
    spellSpeed,
    setSpellSpeed,
    alertness,
    setAlertness,
    playerPosition,
    setPlayerPosition,
    executeCommand,
    stats,
    hpRowRef,
    manaRowRef,
    moveRowRef,
    handleWimpyChange,
    eqHtml,
    inventoryHtml,
    handleLogClick
}) => {

    const anyOpen = drawers.inventory.isOpen || drawers.character.isOpen || drawers.right.isOpen;

    return (
        <>
            <div
                className={`drawer-backdrop ${anyOpen ? 'open' : ''}`}
                onClick={() => {
                    drawers.inventory.setOpen(false);
                    drawers.character.setOpen(false);
                    drawers.right.setOpen(false);
                }}
            />

            <InventoryDrawer
                isOpen={drawers.inventory.isOpen}
                onClose={() => drawers.inventory.setOpen(false)}
                triggerHaptic={triggerHaptic}
            />

            <CharacterDrawer
                isOpen={drawers.character.isOpen}
                onClose={() => drawers.character.setOpen(false)}
                statsHtml={statsHtml}
                mood={mood}
                setMood={setMood}
                spellSpeed={spellSpeed}
                setSpellSpeed={setSpellSpeed}
                alertness={alertness}
                setAlertness={setAlertness}
                playerPosition={playerPosition}
                setPlayerPosition={setPlayerPosition}
                executeCommand={executeCommand}
                triggerHaptic={triggerHaptic}
                stats={stats}
                hpRowRef={hpRowRef}
                manaRowRef={manaRowRef}
                moveRowRef={moveRowRef}
                handleWimpyChange={handleWimpyChange}
            />

            <EquipmentDrawer
                isOpen={drawers.right.isOpen}
                onClose={() => drawers.right.setOpen(false)}
                eqHtml={eqHtml}
                inventoryHtml={inventoryHtml}
                handleLogClick={handleLogClick}
                triggerHaptic={triggerHaptic}
            />
        </>
    );
};
