import React from 'react';
import { CustomButton, PopoverState, MessageType, GameEntity } from '../../../types';
import { sanitizeGameTarget } from '../../../utils/gameUtils';
import { getEffectiveKeyword } from '../../../utils/keywordUtils';
import { CircleHelp } from 'lucide-react';

interface PopoverActionButtonProps {
    button: CustomButton;
    depth?: number;
    isSubButton?: boolean;
    favorites: string[];
    toggleFavorite: (e: React.MouseEvent, command: string) => void;
    popoverState: PopoverState;
    setPopoverState: React.Dispatch<React.SetStateAction<PopoverState | null>>;
    setButtons: React.Dispatch<React.SetStateAction<CustomButton[]>>;
    handleButtonClick: (button: CustomButton, e: any, context?: string, isContainer?: boolean, parentNoun?: string, direction?: string) => void;
    executeCommand: (cmd: string, silent?: boolean, isSystem?: boolean, isHistorical?: boolean, fromDrawer?: boolean, options?: { shouldFocus?: boolean, fromUi?: boolean }) => void;
    addMessage: (type: MessageType, content: string) => void;
    triggerHaptic?: (ms: number) => void;
    setIsInventoryOpen?: (open: boolean) => void;
    selectedObjectIds: Set<string>;
    clearObjectSelection: () => void;
    entities: Record<string, GameEntity>;
    keywordOverrides?: Record<string, string>;
    direction?: string;
}

export const PopoverActionButton: React.FC<PopoverActionButtonProps> = ({
    button, depth = 0, isSubButton = false, favorites, toggleFavorite, popoverState, setPopoverState, setButtons, handleButtonClick, executeCommand, addMessage, triggerHaptic, setIsInventoryOpen, selectedObjectIds, clearObjectSelection, entities, keywordOverrides, direction
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
            executeCommand(`look in ${target}`, true, true);
            setPopoverState((prev: any) => {
                if (!prev) return null;
                return { ...prev, type: 'container', containerItems: [] };
            });
        } else if (button.label === 'Browse Shop...') {
            setPopoverState({ ...popoverState, type: 'shop-search' });
        } else if (button.command === 'shop-mend') {
            setIsInventoryOpen?.(true);
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

    return (
        <div
            className={`popover-item ${isSubButton ? 'is-sub-item' : ''}`}
            data-menu-item="true"
            data-is-menu={['nav', 'menu', 'select-assign', 'select-recipient', 'select-container', 'assign', 'teleport-manage'].includes(button.actionType || '') || button.label === 'Look In' ? "true" : "false"}
            data-drop-cmd={button.command}
            data-drop-context={popoverState.context}
            data-drop-parent={popoverState.parentNoun}
            onPointerDown={(e) => { e.stopPropagation(); }}
            onClick={handleClick}
            style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                paddingLeft: `${16 + (depth * 16)}px`,
                '--set-accent': 'var(--accent)'
            } as any}
        >
            <span style={{ pointerEvents: 'none', display: 'flex', alignItems: 'center' }}>
                {depth > 0 && <span style={{ opacity: 0.3, marginRight: '8px', fontSize: '0.8rem' }}>﹂</span>}
                {button.label.replace(/%n/g, popoverState.context || '').replace(/%p/g, popoverState.parentNoun || '')}
            </span>
            <div style={{ display: 'flex', alignItems: 'center' }}>
                {popoverState.context && (
                    <div 
                        title={`Help for ${button.command.split(' ')[0]}`}
                        onClick={(e) => {
                            e.stopPropagation();
                            triggerHaptic?.(20);
                            const keyword = button.command.split(' ')[0] || button.label.toLowerCase();
                            executeCommand(`help ${keyword}`, false, false, false, false, { fromUi: true });
                            setPopoverState(null);
                        }}
                        style={{ 
                            padding: '8px', 
                            opacity: 0.4, 
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'opacity 0.2s ease',
                            WebkitTapHighlightColor: 'transparent'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                        onMouseLeave={(e) => e.currentTarget.style.opacity = '0.4'}
                    >
                        <CircleHelp size={14} />
                    </div>
                )}
                <div 
                    className={`favorite-star ${isFav ? 'active' : ''}`}
                    onClick={(e) => toggleFavorite(e, button.command)}
                    style={{ 
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        opacity: isFav ? 1 : 0.3, 
                        color: isFav ? '#ffd700' : 'inherit',
                        fontSize: '1.2rem',
                        transition: 'all 0.2s ease',
                        padding: '16px 14px', 
                        margin: '-16px -16px -16px auto', 
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
