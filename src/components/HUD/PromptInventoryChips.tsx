/**
 * @file PromptInventoryChips.tsx
 * @description Compact worn and inventory object chip rows for the prompt box.
 */

import React, { useMemo } from 'react';
import { ChevronRight } from 'lucide-react';
import { useGame, useUI } from '../../context/GameContext';
import { useUIStore } from '../../stores/useUIStore';
import type { DrawerLine } from '../../types';
import { extractMumeKeyword, isItemContainer } from '../../utils/gameUtils';
import { useSettingsStore } from '../../stores/useSettingsStore';
import './PromptInventoryChips.css';

type GearChipKind = 'worn' | 'inventory';

interface GearChip {
    entityId: string;
    menuEntityId: string;
    label: string;
    context: string;
    category: 'cat-worn-object' | 'cat-inventory-object' | 'cat-container-item';
    kind: GearChipKind;
    line: DrawerLine;
}

type ChipVars = React.CSSProperties & Record<'--prompt-object-color', string>;

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

    return {
        entityId: line.entityId || line.stableId || line.id,
        menuEntityId: line.entityId || line.stableId || line.id,
        label: context,
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

export const PromptInventoryChips: React.FC = () => {
    const {
        triggerHaptic,
        expandedContainers,
        setExpandedContainers,
        containerContents,
        executeCommand,
        parser
    } = useGame();
    const { displayEqLines, displayInventoryLines } = useUI();
    const selectedTarget = useUIStore(s => s.selectedTarget);
    const toggleObjectSelection = useUIStore(s => s.toggleObjectSelection);
    const objectColor = useSettingsStore(state => state.objectColor);
    const chipVars: ChipVars = { '--prompt-object-color': objectColor };

    const wornChips = useMemo(() => withDuplicateOrdinals(
        displayEqLines
            .map(line => makeChip(line, 'worn', 'cat-worn-object'))
            .filter((chip): chip is GearChip => !!chip)
    ), [displayEqLines]);

    const inventoryChips = useMemo(() => withDuplicateOrdinals(
        displayInventoryLines
            .map(line => makeChip(line, 'inventory', 'cat-inventory-object'))
            .filter((chip): chip is GearChip => !!chip)
    ), [displayInventoryLines]);

    const rows = [
        { id: 'worn', label: 'worn:', chips: wornChips },
        { id: 'inventory', label: 'inventory', chips: inventoryChips }
    ].filter(row => row.chips.length > 0);

    if (rows.length === 0) return null;

    const selectChip = (event: React.MouseEvent<HTMLButtonElement>, chip: GearChip) => {
        event.stopPropagation();
        triggerHaptic?.(12);
        toggleObjectSelection({
            id: chip.menuEntityId,
            setId: chip.category,
            category: chip.category,
            context: chip.context,
            accentColor: objectColor,
            menuDisplay: 'list',
        });
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

    const renderContainerContents = (chip: GearChip, lines: DrawerLine[]) => {
        if (!expandedContainers.has(chip.line.id)) return null;
        const contents = containerContents[chip.line.id]?.filter(shouldShowContainerLine);
        if (!contents?.length) return null;

        const { count, keyword } = getContainerIndexAndKeyword(chip.line, lines);
        const parentNoun = keyword ? `${count}.${keyword}` : undefined;

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
                            className={`prompt-inventory-chip prompt-container-content-chip${selectedTarget?.id === subChip.menuEntityId ? ' is-active' : ''}`}
                            onClick={event => selectChip(event, subChip)}
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
                        <div className="prompt-inventory-chip-row">
                            <span className="prompt-inventory-chip-label">{row.label}</span>
                            <div className="prompt-inventory-chip-list">
                                {row.chips.map(chip => {
                                    const isContainer = isItemContainer(chip.line.text);
                                    const isExpanded = expandedContainers.has(chip.line.id);
                                    const isLoading = isExpanded && !containerContents[chip.line.id];

                                    return (
                                        isContainer ? (
                                            <span
                                                className={`prompt-inventory-chip prompt-inventory-chip-shell${selectedTarget?.id === chip.menuEntityId ? ' is-active' : ''}`}
                                                key={`${chip.menuEntityId}:${chip.label}`}
                                            >
                                                <button
                                                    type="button"
                                                    className="prompt-inventory-chip-main"
                                                    onClick={event => selectChip(event, chip)}
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
                                                key={`${chip.menuEntityId}:${chip.label}`}
                                                type="button"
                                                className={`prompt-inventory-chip${selectedTarget?.id === chip.menuEntityId ? ' is-active' : ''}`}
                                                onClick={event => selectChip(event, chip)}
                                                title={chip.context}
                                            >
                                                {chip.label}
                                            </button>
                                        )
                                    );
                                })}
                            </div>
                        </div>
                        {row.chips.map(chip => renderContainerContents(chip, sourceLines))}
                    </React.Fragment>
                );
            })}
        </div>
    );
};

export default React.memo(PromptInventoryChips);
