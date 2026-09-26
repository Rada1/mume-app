/** @file gearPanelUtils.ts — Turn captured MUME equipment lines into terminal rows. */
import type { DrawerLine } from '../types';
import { extractMumeKeyword, isItemContainer } from './gameUtils';

export interface GearRow {
    line: DrawerLine;
    slot: string;
    article: string;
    name: string;
    condition: string;
    noun: string;
    isContainer: boolean;
}

// --- Logic Section ---
export function toGearRow(line: DrawerLine): GearRow | null {
    if (!line.isItem || line.isHeader) return null;
    const raw = line.text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    if (!raw) return null;
    const conditionMatch = raw.match(/\s+(\([^)]*\))$/);
    const condition = conditionMatch?.[1] ?? '';
    const withoutCondition = condition ? raw.slice(0, -condition.length).trim() : raw;
    const articleMatch = withoutCondition.match(/^(a|an|the)\s+/i);
    const article = articleMatch?.[0].trim() ?? '';
    const name = article ? withoutCondition.slice(articleMatch![0].length) : withoutCondition;
    return {
        line,
        slot: line.prefix?.trim() ?? '',
        article,
        name,
        condition,
        noun: line.context || extractMumeKeyword(raw),
        isContainer: Boolean(line.isContainer || isItemContainer(line.text)),
    };
}

export function getContainerCommand(line: DrawerLine, lines: DrawerLine[]): string | null {
    const keyword = extractMumeKeyword(line.text);
    if (!keyword) return null;
    let ordinal = 0;
    for (const item of lines) {
        if (item.isItem && extractMumeKeyword(item.text) === keyword) ordinal++;
        if (item.id === line.id) break;
    }
    return `look in ${ordinal}.${keyword}`;
}

export function visibleContainerLine(line: DrawerLine): boolean {
    const text = line.text.replace(/<[^>]*>/g, '').trim().toLowerCase();
    if (text.includes('empty')) return true;
    return !line.isHeader && Boolean(text) && !text.startsWith('in ') && !text.startsWith('when you look') && !text.endsWith(':');
}
