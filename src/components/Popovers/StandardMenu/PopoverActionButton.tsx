import React from 'react';
import { CustomButton, PopoverState, MessageType, GameEntity } from '../../../types';
import { sanitizeGameTarget } from '../../../utils/gameUtils';
import { isDesktopInlineActionPanel } from '../../../utils/popoverPanelUtils';
import { getCommandTextColor } from '../../../utils/swipeCommandColors';
import { resolveHelpTopic } from '../../../utils/commandHelpUtils';
import { getMovementDirectionLabel, normalizeMovementDirection } from '../../../utils/movementDirections';


interface PopoverActionButtonProps {
    button: CustomButton;
    displayLabel?: string;
    displayContent?: React.ReactNode;
    displayColor?: string;
    treeRow?: boolean;
    depth?: number;
    isSubButton?: boolean;
    compact?: boolean;
    terminal?: boolean;
    showFavorite?: boolean;
    glowDelay?: string;
    favorites: string[];
    toggleFavorite: (e: React.MouseEvent, command: string) => void;
    popoverState: PopoverState;
    setPopoverState: React.Dispatch<React.SetStateAction<PopoverState | null>>;
    setButtons: React.Dispatch<React.SetStateAction<CustomButton[]>>;
    handleButtonClick: (button: CustomButton, e: any, context?: string, isContainer?: boolean, parentNoun?: string, direction?: string) => void;
    executeCommand: (cmd: string, silent?: boolean, isSystem?: boolean, isHistorical?: boolean, fromDrawer?: boolean, options?: { shouldFocus?: boolean, fromUi?: boolean }) => void;
    addMessage: (type: MessageType, content: string) => void;
    handleTabClick: (drawer: 'character' | 'equipment') => void;
    setGearTab: (tab: 'worn' | 'inv' | 'vicinity') => void;
    selectedObjectIds: Set<string>;
    clearObjectSelection: () => void;
    entities: Record<string, GameEntity>;
    keywordOverrides?: Record<string, string>;
    direction?: string;
    onRequestShop?: (button: CustomButton) => boolean;
    onRequestPractice?: (button: CustomButton) => boolean;
    onRequestSelfState?: (button: CustomButton) => void;
    onRequestCommunication?: (command: string) => boolean;
    onRequestWhois?: () => void;
    onRequestRoomReport?: (kind: 'who' | 'where' | 'exits' | 'map' | 'weather local') => void;
    onRequestWeatherReport?: (scope: 'global' | 'fog') => void;
    onRequestPersonalReport?: (kind: 'info' | 'stat' | 'score') => void;
    onRequestExamine?: (command: string) => void;
    onRequestLook?: () => void;
    isHelpMode?: boolean;
    onRequestHelp?: (topic: string) => void;
}

export const PopoverActionButton: React.FC<PopoverActionButtonProps> = ({
    button, displayLabel, displayContent, displayColor, treeRow = false, depth = 0, isSubButton = false, compact = false, terminal = false, showFavorite = true, glowDelay, favorites, toggleFavorite, popoverState, setPopoverState, setButtons, handleButtonClick, executeCommand, addMessage, handleTabClick, setGearTab, selectedObjectIds, clearObjectSelection, entities, keywordOverrides, direction, onRequestShop, onRequestPractice, onRequestSelfState, onRequestCommunication, onRequestWhois, onRequestRoomReport, onRequestWeatherReport, onRequestPersonalReport, onRequestExamine, onRequestLook, isHelpMode = false, onRequestHelp
}) => {
    const isFav = favorites.includes(button.command);
    
    const handleClick = (e: React.MouseEvent) => {
        if (isHelpMode && onRequestHelp) {
            e.preventDefault();
            e.stopPropagation();
            onRequestHelp(resolveHelpTopic(button.command, button.label));
            return;
        }
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
        } else if (button.setId === 'trait-state' && onRequestSelfState) {
            onRequestSelfState(button);
        } else if (button.id === 'btn-exit-go') {
            const exitDirection = popoverState.context?.replace(/^exit\s+/i, '').trim() || '';
            const normalizedDirection = normalizeMovementDirection(exitDirection);
            if (normalizedDirection) {
                handleButtonClick({ ...button, command: getMovementDirectionLabel(normalizedDirection) }, e as any, undefined, undefined, popoverState.parentNoun, direction);
            } else {
                handleButtonClick(button, e as any, popoverState.context, undefined, popoverState.parentNoun, direction);
            }
        } else if (button.command.trim().toLowerCase() === 'weather global' && onRequestWeatherReport) {
            onRequestWeatherReport('global');
        } else if (button.command.trim().toLowerCase() === 'weather fog' && onRequestWeatherReport) {
            onRequestWeatherReport('fog');
        } else if (/^(?:who|where|exits|map|weather local)$/i.test(button.command.trim()) && onRequestRoomReport) {
            onRequestRoomReport(button.command.trim().toLowerCase() as 'who' | 'where' | 'exits' | 'map' | 'weather local');
        } else if (/^look$/i.test(button.command.trim()) && onRequestLook) {
            onRequestLook();
        } else if (/^examine(?:\s|$)/i.test(button.command) && onRequestExamine) {
            onRequestExamine(button.command);
        } else if (/^whois(?:\s|$)/i.test(button.command) && onRequestWhois) {
            onRequestWhois();
        } else if (/^(?:info|stat|score)$/i.test(button.command.trim()) && onRequestPersonalReport) {
            onRequestPersonalReport(button.command.trim().toLowerCase() as 'info' | 'stat' | 'score');
        } else if (button.setId === 'trait-communication' && onRequestCommunication?.(button.command)) {
            return;
        } else if (onRequestPractice?.(button)) {
            return;
        } else if (onRequestShop?.(button)) {
            return;
        } else if (button.label === 'Look In') {
            const target = sanitizeGameTarget(popoverState.context || '');
            const inputEl = document.querySelector('.input-field');
            executeCommand(`look in ${target}`, false, false, false, false, {
                shouldFocus: !!inputEl && document.activeElement === inputEl,
                fromUi: true
            });
            if (!isDesktopInlineActionPanel(popoverState, window.innerWidth)) setPopoverState(null);
        } else if (button.label === 'Browse Shop...') {
            setPopoverState({ ...popoverState, type: 'shop-search' });
        } else if (button.command === 'shop-mend') {
            handleTabClick('equipment');
            setGearTab('inv');
            setPopoverState(null);
        } else {
            handleButtonClick(button, e as any, popoverState.context, undefined, popoverState.parentNoun, direction);
        }
    };

    const isMenuAction = ['nav', 'menu', 'select-assign', 'select-recipient', 'select-container', 'assign'].includes(button.actionType || '') || button.label === 'Look In';
    const label = displayLabel ?? (button.id === 'btn-exit-go' ? 'Move' : button.label).replace(/%n/g, popoverState.context || '').replace(/%p/g, popoverState.parentNoun || '');
    const actionVerb = button.command.trim().toLowerCase().split(/\s+/)[0];
    const terminalTone = ['remove', 'drop'].includes(actionVerb)
        ? ' terminal-action-demote'
        : ['get', 'take', 'wear', 'wield', 'hold'].includes(actionVerb)
            ? ' terminal-action-promote'
            : '';
    const rawCommandContext = popoverState.context || '';
    const commandContext = (button.id === 'btn-exit-go' || /^point\s+%n$/i.test(button.command.trim())) && /^exit\s+/i.test(rawCommandContext)
        ? getMovementDirectionLabel(rawCommandContext.replace(/^exit\s+/i, '').trim())
        : rawCommandContext;
    const commandPreview = button.command.replace(/%n(?:\|[^\s]+)?/g, commandContext).replace(/%p/g, popoverState.parentNoun || '');

    if (treeRow) {
        return <button type="button" className={`command-tree-row${isHelpMode ? ' is-help-mode' : ''}`}
            title={`${label}\n${commandPreview}`} data-menu-item="true" data-help-mode={isHelpMode || undefined}
            onPointerDown={event => event.stopPropagation()} onClick={handleClick}>
            <span className={`command-tree-row-label${displayContent ? ' is-gear-target' : ''}`} style={{color:displayColor || (displayLabel || displayContent ? undefined : getCommandTextColor(button.command, button.setId))}}>{displayContent ?? label}</span>
        </button>;
    }

    if (compact) {
        return (
            <div
                className={terminal ? `terminal-action-row${terminalTone}${isHelpMode ? ' is-help-mode' : ''}` : `popover-action-chip${isHelpMode ? ' is-help-mode' : ''}`}
                role="button"
                tabIndex={0}
                onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); event.currentTarget.click(); } }}
                data-menu-item="true"
                data-is-menu={isMenuAction ? "true" : "false"}
                data-help-mode={isHelpMode ? "true" : undefined}
                onPointerDown={(e) => { e.stopPropagation(); }}
                onMouseDown={e => {
                    const inputEl = document.querySelector('.input-field');
                    if (inputEl && document.activeElement === inputEl) e.preventDefault();
                }}
                onClick={handleClick}
                style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '3px',
                    padding: '4px 8px',
                    fontSize: '0.78rem',
                    borderRadius: '4px',
                    border: isFav ? '1px solid rgba(255,215,0,0.45)' : '1px solid rgba(184,134,11,0.22)',
                    background: isFav ? 'rgba(255,215,0,0.09)' : 'rgba(184,134,11,0.06)',
                    cursor: 'pointer',
                    userSelect: 'none',
                    WebkitTapHighlightColor: 'transparent',
                    whiteSpace: 'nowrap',
                    animationDelay: glowDelay || '0s',
                    '--set-accent': 'var(--accent)'
                } as any}
            >
                <span style={{ pointerEvents: 'none', color: terminal ? getCommandTextColor(button.command, button.setId) : undefined }}>{label}</span>
                {terminal && <span className="terminal-action-command">&lt;{commandPreview}&gt;</span>}
                {!terminal && showFavorite && <span
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
                </span>}
            </div>
        );
    }

    return (
        <div
            className={`popover-item ${isSubButton ? 'is-sub-item' : ''}${isHelpMode ? ' is-help-mode' : ''}`}
            data-menu-item="true"
            data-is-menu={isMenuAction ? "true" : "false"}
            data-help-mode={isHelpMode ? "true" : undefined}
            onPointerDown={(e) => { e.stopPropagation(); }}
            onMouseDown={e => {
                const inputEl = document.querySelector('.input-field');
                if (inputEl && document.activeElement === inputEl) e.preventDefault();
            }}
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
