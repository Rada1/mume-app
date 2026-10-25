/** @file InlineContainerGetAction.tsx — Optional contents selection for Get on containers. */
import React from 'react';
import type { CustomButton } from '../../../types';
import { useGame, useUI } from '../../../context/GameContext';
import { getContainerTargetSuggestions, getGearTargetSuggestions } from '../../../objects/gearTargetSuggestions';
import type { CommandTargetSuggestion } from '../../../objects/targetSuggestionTypes';
import type { InlineCommandDisplayParts } from './inlineCommandDisplay';

// --- Container Target Section ---
interface InlineContainerGetActionProps {
    button: CustomButton;
    entityId: string;
    targetContext: string;
    renderGet: (button: CustomButton, displayParts?: InlineCommandDisplayParts) => React.ReactNode;
}

const normalizeTarget = (value: string): string => value.trim().replace(/^\d+\./, '').toLowerCase();
const isNothingLine = (value: string): boolean => /^\s*nothing\.?\s*$/i.test(
    value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
);
const pendingContentsRequests = new Set<string>();

export const InlineContainerGetAction: React.FC<InlineContainerGetActionProps> = ({
    button,
    entityId,
    targetContext,
    renderGet
}) => {
    const game = useGame();
    const ui = useUI();
    const [openState, setOpenState] = React.useState<{ key: string; open: boolean } | null>(null);
    const [selection, setSelection] = React.useState<{ key: string; itemKey: string } | null>(null);

    const containers = React.useMemo(() => getContainerTargetSuggestions(
        game.roomItems || [],
        ui.displayInventoryLines || [],
        ui.displayEqLines || []
    ).filter(target => target.meta !== 'exit'), [game.roomItems, ui.displayInventoryLines, ui.displayEqLines]);
    const matchedContainer = containers.find(target =>
        target.objectId === entityId || target.key === entityId || target.containerId === entityId
    ) || containers.find(target => target.value.toLowerCase() === targetContext.toLowerCase())
        || containers.find(target => normalizeTarget(target.value) === normalizeTarget(targetContext));

    const containerValue = matchedContainer?.value || targetContext;
    const containerId = matchedContainer?.containerId || entityId || `inline-container:${targetContext}`;
    const containerKey = `${game.roomNum}:${containerId}:${containerValue}`;
    const isOpen = openState?.key === containerKey && openState.open;
    const contents = game.containerContents[containerId];
    const items = React.useMemo(() => [
        { key: `inline-get-all:${containerKey}`, label: 'All', value: 'all', meta: 'container' },
        ...(contents ? getGearTargetSuggestions(contents.filter(line =>
            !isNothingLine(line.text) && !isNothingLine(line.rawText || '')
        ), 'inventory') : [])
    ], [contents, containerKey]);
    const selectedItem = selection?.key === containerKey
        ? items.find(item => item.key === selection.itemKey)
        : undefined;
    const selectedGetButton = selectedItem
        ? { ...button, command: selectedItem.value === 'all'
            ? `get all from ${containerValue}`
            : `get ${selectedItem.value} ${containerValue}` }
        : button;
    const requestKey = `${game.roomNum}:${containerId}`;

    // --- Contents Capture Section ---
    React.useEffect(() => {
        if (contents !== undefined) {
            pendingContentsRequests.delete(requestKey);
            return;
        }
        if (!isOpen || pendingContentsRequests.has(requestKey)
            || game.gameState !== 'playing' || game.isSpectateMode) return;

        const command = matchedContainer?.containerCommand || `look in ${containerValue}`;
        // The inline deck mounts desktop and mobile copies, with CSS showing one.
        // Share this guard so both copies cannot request the same capture.
        pendingContentsRequests.add(requestKey);
        window.setTimeout(() => pendingContentsRequests.delete(requestKey), 15000);
        game.parser.setLastRequestedContainerId?.(containerId);
        game.parser.setPendingFlags(true, true, command);
        game.executeCommand(command, true, true, false, true, { fromUi: true, shouldFocus: false });
    }, [isOpen, contents, requestKey, game.gameState, game.isSpectateMode, game.parser, game.executeCommand,
        containerId, containerValue, matchedContainer]);

    const toggleContents = (event: React.MouseEvent) => {
        event.stopPropagation();
        setOpenState({ key: containerKey, open: !isOpen });
        if (isOpen) setSelection(null);
    };

    const selectItem = (event: React.MouseEvent, item: CommandTargetSuggestion) => {
        event.stopPropagation();
        setSelection({ key: containerKey, itemKey: item.key });
    };

    return (
        <div className="inline-container-get-action">
            <div className="inline-container-get-row">
                {renderGet(selectedGetButton, { prefix: 'get', suffix: containerValue })}
                <button type="button" className="terminal-inspect-in-toggle inline-container-get-toggle"
                    aria-expanded={isOpen} aria-controls={`container-contents-${containerId.replace(/[^a-zA-Z0-9_-]/g, '-')}`}
                    title={`Choose an item inside ${containerValue}`}
                    onPointerDown={event => event.stopPropagation()} onClick={toggleContents}>
                    Contents
                </button>
            </div>
            {isOpen && <div className="inline-container-get-contents" id={`container-contents-${containerId.replace(/[^a-zA-Z0-9_-]/g, '-')}`}
                role="listbox" aria-label={`Contents of ${containerValue}`} aria-busy={contents === undefined}>
                {items.map(item => (
                    <button type="button" role="option" aria-selected={selectedItem?.key === item.key}
                        className="inline-container-get-item" key={item.key}
                        onPointerDown={event => event.stopPropagation()} onClick={event => selectItem(event, item)}>
                        <span>{item.label}</span>
                        <span>{item.value}</span>
                    </button>
                ))}
                {contents === undefined && <div className="inline-container-get-status">Loading contents…</div>}
                {contents !== undefined && items.length === 1 && <div className="inline-container-get-status">Container is empty.</div>}
                {selectedItem && <div className="inline-container-get-selection">
                    {selectedItem.value === 'all'
                        ? `Get will take everything from ${containerValue}.`
                        : `Get will take ${selectedItem.label} from ${containerValue}.`}
                </div>}
            </div>}
        </div>
    );
};
