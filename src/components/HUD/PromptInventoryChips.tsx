/**
 * @file PromptInventoryChips.tsx
 * @description Compact worn and inventory object chip rows for the prompt box.
 */

import React, { useMemo } from 'react';
import { ChevronRight } from 'lucide-react';
import { useGame, useUI, useVitals } from '../../context/GameContext';
import { useUIStore } from '../../stores/useUIStore';
import type { DrawerLine } from '../../types';
import { extractMumeKeyword, isItemContainer } from '../../utils/gameUtils';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { audioManager } from '../../services/audio/AudioManager';
import { useObjectDragCommands } from '../../hooks/useObjectDragCommands';
import { targetTextMatchesEntity } from '../../utils/selectionUtils';
import { getAffectChipTone } from '../../utils/affectUtils';
import './PromptInventoryChips.css';


type GearChipKind = 'worn' | 'inventory';

interface PromptInventoryChipsProps {
    affects?: string[];
}

interface GearChip {
    entityId: string;
    menuEntityId: string;
    label: string;
    context: string;
    category: 'cat-worn-object' | 'cat-inventory-object' | 'cat-container-item';
    kind: GearChipKind;
    line: DrawerLine;
}

type ChipVars = React.CSSProperties & Record<'--prompt-object-color' | '--target-color', string>;

const SLOT_LABEL_MAP: Record<string, string> = {
    '<wielded>':              'wielded',
    '<held in weapon hand>':  'wielded',
    '<held in shield hand>':  'shield',
    '<worn as shield>':       'shield',
    '<worn on head>':         'head',
    '<worn on hands>':        'hands',
    '<worn on arms>':         'arms',
    '<worn on body>':         'body',
    '<worn about body>':      'about body',
    '<worn on legs>':         'legs',
    '<worn on feet>':         'feet',
    '<worn on belt>':         'on belt',
    '<worn as belt>':         'belt',
    '<worn across back>':     'x-back',
    '<worn on back>':         'back',
    '<worn on wrists>':       'wrists',
    '<worn on finger>':       'finger',
    '<worn around neck>':     'neck',
};

const getSlotLabel = (prefix: string | undefined): string | null => {
    if (!prefix) return null;
    return SLOT_LABEL_MAP[prefix.trim().toLowerCase()] ?? null;
};

const SLOT_SORT_ORDER = 'WSHbcahlfnwF-qB';

const PREFIX_TO_SLOT_LETTER: Record<string, string> = {
    '<wielded>':              'W',
    '<held in weapon hand>':  'W',
    '<held in shield hand>':  'S',
    '<worn as shield>':       'S',
    '<worn on head>':         'H',
    '<worn on body>':         'b',
    '<worn about body>':      'c',
    '<worn on arms>':         'a',
    '<worn on hands>':        'h',
    '<worn on legs>':         'l',
    '<worn on feet>':         'f',
    '<worn around neck>':     'n',
    '<worn on wrists>':       'w',
    '<worn on finger>':       'F',
    '<worn on back>':         '-',
    '<worn across back>':     'q',
    '<worn as belt>':         'B',
    '<worn on belt>':         'B',
};

const getSlotSortWeight = (prefix: string | undefined): number => {
    if (!prefix) return 999;
    const letter = PREFIX_TO_SLOT_LETTER[prefix.trim().toLowerCase()];
    if (!letter) return 999;
    const idx = SLOT_SORT_ORDER.indexOf(letter);
    return idx === -1 ? 999 : idx;
};

const cleanItemText = (line: DrawerLine): string => (
    line.text
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
);

const makeChip = (
    line: DrawerLine,
    kind: GearChipKind,
    category: GearChip['category']
): GearChip | null => {
    if (!line.isItem || line.isHeader) return null;
    const text = cleanItemText(line);
    if (!text) return null;

    const context = line.context || extractMumeKeyword(text);
    if (!context) return null;

    let label = context;
    if (kind === 'worn') {
        const textWithoutParentheses = text.replace(/\([^)]*\)/g, '').trim();
        const words = textWithoutParentheses.split(/\s+/);
        label = words.length <= 2 ? textWithoutParentheses : words.slice(-2).join(' ');
    }

    return {
        entityId: line.entityId || line.stableId || line.id,
        menuEntityId: line.entityId || line.stableId || line.id,
        label,
        context,
        category,
        kind,
        line
    };
};

const getContainerIndexAndKeyword = (line: DrawerLine, lines: DrawerLine[]) => {
    const keyword = extractMumeKeyword(line.text);
    if (!keyword) return { count: 1, keyword: '' };

    let count = 0;
    for (const item of lines) {
        if (item.isItem && extractMumeKeyword(item.text) === keyword) {
            count++;
        }
        if (item.id === line.id) break;
    }
    return { count, keyword };
};

const shouldShowContainerLine = (line: DrawerLine): boolean => {
    const clean = line.text.replace(/<[^>]*>/g, '').trim().toLowerCase();
    if (clean.includes('empty')) return true;
    if (line.isHeader) return false;
    if (clean === '') return false;
    return !(clean.startsWith('in ') || clean.startsWith('when you look') || clean.endsWith(':'));
};

const withDuplicateOrdinals = (chips: GearChip[]): GearChip[] => {
    const totals = chips.reduce<Record<string, number>>((acc, chip) => {
        acc[chip.label] = (acc[chip.label] || 0) + 1;
        return acc;
    }, {});
    const idTotals = chips.reduce<Record<string, number>>((acc, chip) => {
        acc[chip.entityId] = (acc[chip.entityId] || 0) + 1;
        return acc;
    }, {});
    const seen: Record<string, number> = {};
    const seenIds: Record<string, number> = {};

    return chips.map(chip => {
        const labelIndex = (seen[chip.label] || 0) + 1;
        const idIndex = (seenIds[chip.entityId] || 0) + 1;
        seen[chip.label] = labelIndex;
        seenIds[chip.entityId] = idIndex;

        return {
            ...chip,
            menuEntityId: idTotals[chip.entityId] > 1 ? `${chip.entityId}#${idIndex}` : chip.entityId,
            label: totals[chip.label] > 1 ? `${labelIndex}.${chip.label}` : chip.label
        };
    });
};

const getChipCommandNoun = (chip: GearChip): string => (
    chip.context
);

const isChipTargeted = (chip: GearChip, selectedTargetId: string | undefined, target: string | null | undefined): boolean => (
    selectedTargetId === chip.menuEntityId || targetTextMatchesEntity(target, chip.context, chip.label)
);

export const PromptInventoryChips: React.FC<PromptInventoryChipsProps> = ({ affects = [] }) => {
    const {
        triggerHaptic,
        expandedContainers,
        setExpandedContainers,
        containerContents,
        executeCommand,
        parser,
        setPopoverState,
        popoverState
    } = useGame();
    const { target, setTarget } = useVitals();
    const { displayEqLines, displayInventoryLines } = useUI();
    const selectedTarget = useUIStore(s => s.selectedTarget);
    const toggleObjectSelection = useUIStore(s => s.toggleObjectSelection);
    const objectDragState = useUIStore(s => s.objectDragState);
    const objectColor = useSettingsStore(state => state.objectColor);
    const targetColor = useSettingsStore(state => state.targetColor);
    const chipVars: ChipVars = { '--prompt-object-color': objectColor, '--target-color': targetColor };
    const startObjectDrag = useObjectDragCommands({ executeCommand, triggerHaptic });

    const wornChips = useMemo(() => {
        const chips = displayEqLines
            .map(line => makeChip(line, 'worn', 'cat-worn-object'))
            .filter((chip): chip is GearChip => !!chip);
        
        chips.sort((a, b) => getSlotSortWeight(a.line.prefix) - getSlotSortWeight(b.line.prefix));
        
        return withDuplicateOrdinals(chips);
    }, [displayEqLines]);

    const inventoryChips = useMemo(() => withDuplicateOrdinals(
        displayInventoryLines
            .map(line => makeChip(line, 'inventory', 'cat-inventory-object'))
            .filter((chip): chip is GearChip => !!chip)
    ), [displayInventoryLines]);

    const affectChips = useMemo(() => Array.from(new Set(
        affects.map(affect => affect.trim()).filter(Boolean)
    )), [affects]);

    const rows = [
        { id: 'worn', label: 'worn:', chips: wornChips },
        { id: 'inventory', label: 'inventory', chips: inventoryChips }
    ].filter(row => row.chips.length > 0);

    if (rows.length === 0 && affectChips.length === 0) return null;

    const selectChip = (event: React.MouseEvent<HTMLButtonElement>, chip: GearChip) => {
        event.stopPropagation();
        const currentTarget = useUIStore.getState().selectedTarget;
        const isAlreadySelected = currentTarget?.id === chip.menuEntityId;

        if (isAlreadySelected) {
            const el = event.currentTarget;
            const rect = el.getBoundingClientRect();
            if (popoverState?.entityId === chip.menuEntityId && popoverState.setId === chip.category) {
                setPopoverState(null);
                triggerHaptic?.(10);
            } else {
                setPopoverState({
                    x: rect.right,
                    y: rect.top + rect.height / 2,
                    setId: chip.category,
                    category: chip.category,
                    context: chip.context,
                    entityId: chip.menuEntityId,
                    accentColor: objectColor,
                    menuDisplay: 'list',
                    preferSide: 'right',
                });
                audioManager.playEffect('actionmenu');
                triggerHaptic?.(20);
            }
            return;
        }

        audioManager.playEffect('target', { skipJitter: true });
        triggerHaptic?.(12);
        toggleObjectSelection({
            id: chip.menuEntityId,
            setId: chip.category,
            category: chip.category,
            context: chip.context,
            accentColor: objectColor,
            menuDisplay: 'list',
        });
        setTarget(chip.context);
    };

    const toggleContainer = (event: React.MouseEvent<HTMLButtonElement>, chip: GearChip, lines: DrawerLine[]) => {
        event.stopPropagation();
        triggerHaptic?.(12);

        if (expandedContainers.has(chip.line.id)) {
            setExpandedContainers((prev: Set<string>) => {
                const next = new Set(prev);
                next.delete(chip.line.id);
                return next;
            });
            return;
        }

        setExpandedContainers((prev: Set<string>) => {
            const next = new Set(prev);
            next.add(chip.line.id);
            return next;
        });

        const { count, keyword } = getContainerIndexAndKeyword(chip.line, lines);
        if (!keyword) return;

        const cmd = `look in ${count}.${keyword}`;
        parser?.setPendingFlags?.(true, true, cmd);
        parser?.setLastRequestedContainerId?.(chip.line.id);
        executeCommand(cmd, true, true, false, true);
    };

    const renderContainerContents = (chip: GearChip) => {
        if (!expandedContainers.has(chip.line.id)) return null;
        const contents = containerContents[chip.line.id]?.filter(shouldShowContainerLine);
        if (!contents?.length) return null;

        return (
            <div className="prompt-container-content-row" key={`${chip.line.id}:contents`}>
                <span className="prompt-container-content-label">in {chip.label}</span>
                <div className="prompt-inventory-chip-list prompt-container-chip-list">
                    {withDuplicateOrdinals(contents
                        .map(line => makeChip(line, 'inventory', 'cat-container-item'))
                        .filter((subChip): subChip is GearChip => !!subChip)
                    ).map(subChip => (
                        <button
                            key={`${chip.line.id}:${subChip.menuEntityId}:${subChip.label}`}
                            type="button"
                            className={`prompt-inventory-chip prompt-container-content-chip${isChipTargeted(subChip, selectedTarget?.id, target) ? ' is-active is-target' : ''}`}
                            onClick={event => selectChip(event, subChip)}
                            onPointerDown={event => startObjectDrag(event, {
                                row: 'inventory',
                                noun: getChipCommandNoun(subChip),
                                label: subChip.label
                            })}
                            title={subChip.context}
                        >
                            {subChip.label}
                        </button>
                    ))}
                </div>
            </div>
        );
    };

    return (
        <div className="prompt-inventory-chip-rows" style={chipVars} aria-label="Worn and inventory objects">
            {rows.map(row => {
                const sourceLines = row.id === 'worn' ? displayEqLines : displayInventoryLines;
                return (
                    <React.Fragment key={row.id}>
                        <div
                            className={`prompt-inventory-chip-row${objectDragState?.target?.type === 'row' && objectDragState.target.row === row.id ? ' is-drop-target' : ''}`}
                            data-object-drop-row={row.id}
                        >
                            <span className="prompt-inventory-chip-label">{row.label}</span>
                            <div className="prompt-inventory-chip-list">
                                {row.chips.map(chip => {
                                    const isContainer = isItemContainer(chip.line.text);
                                    const isExpanded = expandedContainers.has(chip.line.id);
                                    const isLoading = isExpanded && !containerContents[chip.line.id];

                                    const slotLabel = row.id === 'worn' ? getSlotLabel(chip.line.prefix) : null;

                                    return (
                                        <span
                                            key={`${chip.menuEntityId}:${chip.label}`}
                                            className={`prompt-chip-with-slot${objectDragState?.target?.type === 'row' && objectDragState.target.row === 'worn' && objectDragState.target.slot === slotLabel ? ' is-drop-target' : ''}`}
                                            data-object-drop-row={row.id === 'worn' ? 'worn' : undefined}
                                            data-object-drop-slot={row.id === 'worn' ? slotLabel || undefined : undefined}
                                        >
                                            {slotLabel && <span className="prompt-slot-icon">{slotLabel}</span>}
                                            {isContainer ? (
                                                <span
                                                    className={`prompt-inventory-chip prompt-inventory-chip-shell${isChipTargeted(chip, selectedTarget?.id, target) ? ' is-active is-target' : ''}`}
                                                >
                                                    <button
                                                        type="button"
                                                        className="prompt-inventory-chip-main"
                                                        onClick={event => selectChip(event, chip)}
                                                        onPointerDown={event => startObjectDrag(event, {
                                                            row: row.id as 'worn' | 'inventory',
                                                            noun: getChipCommandNoun(chip),
                                                            label: chip.label
                                                        })}
                                                        title={chip.context}
                                                    >
                                                        {chip.label}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className={`prompt-container-toggle${isExpanded ? ' is-expanded' : ''}${isLoading ? ' is-loading' : ''}`}
                                                        onClick={event => toggleContainer(event, chip, sourceLines)}
                                                        aria-label={`${isExpanded ? 'Hide' : 'Look in'} ${chip.context}`}
                                                        title={`${isExpanded ? 'Hide' : 'Look in'} ${chip.context}`}
                                                    >
                                                        {isLoading ? '...' : <ChevronRight size={10} strokeWidth={2.5} />}
                                                    </button>
                                                </span>
                                            ) : (
                                                <button
                                                    type="button"
                                                    className={`prompt-inventory-chip${isChipTargeted(chip, selectedTarget?.id, target) ? ' is-active is-target' : ''}`}
                                                    onClick={event => selectChip(event, chip)}
                                                    onPointerDown={event => startObjectDrag(event, {
                                                        row: row.id as 'worn' | 'inventory',
                                                        noun: getChipCommandNoun(chip),
                                                        label: chip.label
                                                    })}
                                                    title={chip.context}
                                                >
                                                    {chip.label}
                                                </button>
                                            )}
                                        </span>
                                    );
                                })}
                            </div>
                        </div>
                        {row.chips.map(chip => renderContainerContents(chip))}
                    </React.Fragment>
                );
            })}
            {affectChips.length > 0 && (
                <div className="prompt-inventory-chip-row prompt-affect-chip-row" onClick={event => event.stopPropagation()}>
                    <span className="prompt-inventory-chip-label">affects</span>
                    <div className="prompt-inventory-chip-list">
                        {affectChips.map(affect => (
                            <span
                                key={affect}
                                className={`prompt-inventory-chip prompt-affect-chip is-${getAffectChipTone(affect)}`}
                                title={affect}
                            >
                                {affect}
                            </span>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default React.memo(PromptInventoryChips);
