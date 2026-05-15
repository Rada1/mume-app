import React from 'react';
import { CustomButton, PopoverState, MessageType, GameEntity } from '../../../types';
import { sanitizeGameTarget } from '../../../utils/gameUtils';
import { getEffectiveKeyword } from '../../../utils/keywordUtils';


interface PopoverActionButtonProps {
    button: CustomButton;
    depth?: number;
    isSubButton?: boolean;
    compact?: boolean;
    favorites: string[];
    toggleFavorite: (e: React.MouseEvent, command: string) => void;
    popoverState: PopoverState;
    setPopoverState: React.Dispatch<React.SetStateAction<PopoverState | null>>;
    setButtons: React.Dispatch<React.SetStateAction<CustomButton[]>>;
    handleButtonClick: (button: CustomButton, e: any, context?: string, isContainer?: boolean, parentNoun?: string, direction?: string) => void;
    executeCommand: (cmd: string, silent?: boolean, isSystem?: boolean, isHistorical?: boolean, fromDrawer?: boolean, options?: { shouldFocus?: boolean, fromUi?: boolean }) => void;
    addMessage: (type: MessageType, content: string) => void;
    handleTabClick: (drawer: 'character' | 'players' | 'equipment') => void;
    setGearTab: (tab: 'worn' | 'inv' | 'vicinity') => void;
    selectedObjectIds: Set<string>;
    clearObjectSelection: () => void;
    entities: Record<string, GameEntity>;
    keywordOverrides?: Record<string, string>;
    direction?: string;
}

export const PopoverActionButton: React.FC<PopoverActionButtonProps> = ({
    button, depth = 0, isSubButton = false, compact = false, favorites, toggleFavorite, popoverState, setPopoverState, setButtons, handleButtonClick, executeCommand, addMessage, handleTabClick, setGearTab, selectedObjectIds, clearObjectSelection, entities, keywordOverrides, direction
}) => {
    const isFav = favorites.includes(button.command);
    
    const handleClick = (e: React.MouseEvent) => {
        if (popoverState.assignSourceId) {
            const isExecute = popoverState.executeAndAssign;
            const dir = popoverState.assignSwipeDir;
            setButtons(prev => prev.map(b => b.id === popoverState.assignSourceId ? (dir ? { 
                ...b, 
                swipeCommands: { ...(b.swipeCommands || {}), [dir]: button.command }, 
                swipeActionTypes: { ...(b.swipeActionTypes || {}), [dir]: button.actionType || 'command' } 
            } : { ...b, command: button.command, label: button.label, actionType: button.actionType || 'command' }) : b));
            if (isExecute) handleButtonClick(button, e, popoverState.context, undefined, popoverState.parentNoun, direction);
            setPopoverState(null);
            addMessage('system', `${isExecute ? 'Executed and assigned' : 'Assigned'} '${button.label}'${dir ? ` to swipe ${dir}` : ''}.`);
        } else if (button.label === 'Look In') {
            const target = sanitizeGameTarget(popoverState.context || '');
            executeCommand(`look in ${target}`, false, false);
            setPopoverState(null);
        } else if (button.label === 'Browse Shop...') {
            setPopoverState({ ...popoverState, type: 'shop-search' });
        } else if (button.command === 'shop-mend') {
            handleTabClick('equipment');
            setGearTab('inv');
            setPopoverState(null);
        } else {
            // MULTI-ACTION LOGIC
            if (selectedObjectIds && selectedObjectIds.size > 1) {
                const selectedEntries = Array.from(selectedObjectIds) as string[];
                selectedEntries.forEach(entry => {
                    const parts = entry.split(':');
                    const id = parts.length > 2 ? parts[1] : (parts.length === 2 ? parts[1] : parts[0]);
                    const context = parts.length > 2 ? parts[2] : undefined;
                    
                    let noun = context || "";
                    if (entities[id]) {
                        const entity = entities[id];
                        noun = getEffectiveKeyword(entity.name || '', undefined, entity, keywordOverrides || {});
                    } else if (!noun) {
                        noun = id.replace(/^(auto-npc-|auto-item-|auto-obj-|roomnpcs:|roomitems:|inventorylist:|equipmentlist:|log-npc-|npc-|player-|object-)/, '')
                                 .replace(/-[a-f0-9]+$/, '').replace(/-/g, ' ');
                    }
                    
                    handleButtonClick(button, e as any, noun, undefined, popoverState.parentNoun, direction);
                });
                clearObjectSelection();
                setPopoverState(null);
            } else {
                handleButtonClick(button, e as any, popoverState.context, undefined, popoverState.parentNoun, direction);
            }
        }
    };

    const isMenuAction = ['nav', 'menu', 'select-assign', 'select-recipient', 'select-container', 'assign', 'teleport-manage'].includes(button.actionType || '') || button.label === 'Look In';
    const label = button.label.replace(/%n/g, popoverState.context || '').replace(/%p/g, popoverState.parentNoun || '');

    if (compact) {
        return (
            <div
                className="popover-action-chip"
                data-menu-item="true"
                data-is-menu={isMenuAction ? "true" : "false"}
                onPointerDown={(e) => { e.stopPropagation(); }}
                onClick={handleClick}
                style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '3px',
                    padding: '4px 8px',
                    fontSize: '0.78rem',
                    borderRadius: '4px',
                    border: isFav ? '1px solid rgba(255,215,0,0.35)' : '1px solid rgba(255,255,255,0.08)',
                    background: isFav ? 'rgba(255,215,0,0.07)' : 'rgb(35, 35, 40)',
                    cursor: 'pointer',
                    userSelect: 'none',
                    WebkitTapHighlightColor: 'transparent',
                    whiteSpace: 'nowrap',
                    '--set-accent': 'var(--accent)'
                } as any}
            >
                <span style={{ pointerEvents: 'none' }}>{label}</span>
                <span
                    onClick={(e) => toggleFavorite(e, button.command)}
                    style={{
                        color: isFav ? '#ffd700' : 'rgba(255,255,255,0.2)',
                        fontSize: '0.6rem',
                        lineHeight: 1,
                        cursor: 'pointer',
                        WebkitTapHighlightColor: 'transparent'
                    }}
                >
                    {isFav ? '★' : '☆'}
                </span>
            </div>
        );
    }

    return (
        <div
            className={`popover-item ${isSubButton ? 'is-sub-item' : ''}`}
            data-menu-item="true"
            data-is-menu={isMenuAction ? "true" : "false"}
            onPointerDown={(e) => { e.stopPropagation(); }}
            onClick={handleClick}
            style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingLeft: `${12 + (depth * 12)}px`,
                '--set-accent': 'var(--accent)'
            } as any}
        >
            <span style={{ pointerEvents: 'none', display: 'flex', alignItems: 'center', fontSize: '0.82rem' }}>
                {depth > 0 && <span style={{ opacity: 0.3, marginRight: '6px', fontSize: '0.75rem' }}>﹂</span>}
                {label}
            </span>
            <div style={{ display: 'flex', alignItems: 'center' }}>
                <div
                    className={`favorite-star ${isFav ? 'active' : ''}`}
                    onClick={(e) => toggleFavorite(e, button.command)}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        opacity: isFav ? 1 : 0.3,
                        color: isFav ? '#ffd700' : 'inherit',
                        fontSize: '1.1rem',
                        transition: 'all 0.2s ease',
                        padding: '10px 10px',
                        margin: '-10px -12px -10px auto',
                        cursor: 'pointer',
                        userSelect: 'none',
                        WebkitTapHighlightColor: 'transparent',
                        zIndex: 10
                    }}
                >
                    {isFav ? '★' : '☆'}
                </div>
            </div>
        </div>
    );
};
