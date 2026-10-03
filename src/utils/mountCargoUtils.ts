/** @file mountCargoUtils.ts — Safe item selectors for corpse and mount cargo actions. */
import type { DrawerLine, Token } from '../types';
import { getDrawerObjectKeyword, getObjectTraits } from '../objects/objectTargetModel';

export interface CargoItemGroup {
    keyword: string;
    label: string;
    count: number;
}

export interface ValuableLootTarget {
    keyword: string;
    label: string;
    ordinal: number;
}

const hasObjectToken = (tokens: Token[] | undefined): boolean => (tokens || []).some(token =>
    token.type === 'entity' && (token.metadata?.kind === 'object' || token.metadata?.category?.includes('object'))
);

const isLikelyCargoLine = (line: DrawerLine): boolean => {
    const text = line.text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    if (!text || /^(?:nothing\.?|it is empty\.?|you see|you notice)\b/i.test(text)) return false;
    if (/\b(?:is|are|was|were|carrying|holding|looks|seems|says|tells)\b/i.test(text)) return false;
    if (/<object\b/i.test(line.rawText || '') || hasObjectToken(line.tokens)) return true;
    return /^(?:a|an|the|some|several|one|two|three|four|five|\d+)\b/i.test(text) && !/[.!?]$/.test(text);
};

const isCurrencyLine = (line: DrawerLine): boolean =>
    /\b(?:\d+\s*)?(?:gold|silver|copper)\s+coins?\b|\b(?:lauren|celeb|busc)\b/i.test(line.text);

export const getCargoItemGroups = (lines: DrawerLine[] | undefined): CargoItemGroup[] => {
    const groups = new Map<string, CargoItemGroup>();
    (lines || []).forEach(line => {
        if (!line.isItem || line.isHeader || isCurrencyLine(line) || !isLikelyCargoLine(line)) return;
        const keyword = getDrawerObjectKeyword(line);
        if (!keyword) return;
        const existing = groups.get(keyword);
        if (existing) existing.count += 1;
        else groups.set(keyword, { keyword, label: line.text.replace(/<[^>]*>/g, '').trim(), count: 1 });
    });
    return Array.from(groups.values());
};

const isValuableLootLine = (line: DrawerLine): boolean => {
    const name = `${line.text} ${line.context || ''}`.toLowerCase();
    return getObjectTraits(line).includes('trait-treasure')
        || /\b(?:metal|iron|steel|mithril|silver|gold|copper|bronze|brass|ore|nugget|adamant|mail)\b/i.test(name);
};

export const getValuableLootTargets = (lines: DrawerLine[] | undefined): ValuableLootTarget[] => {
    const seen = new Map<string, number>();
    const targets: ValuableLootTarget[] = [];
    (lines || []).forEach(line => {
        if (!line.isItem || line.isHeader || isCurrencyLine(line) || !isLikelyCargoLine(line)) return;
        const keyword = getDrawerObjectKeyword(line);
        if (!keyword) return;
        const ordinal = (seen.get(keyword) || 0) + 1;
        seen.set(keyword, ordinal);
        if (isValuableLootLine(line)) targets.push({
            keyword,
            ordinal,
            label: line.text.replace(/<[^>]*>/g, '').trim()
        });
    });
    return targets;
};

export const makeItemSelector = (keyword: string, ordinal: number): string =>
    ordinal > 1 ? `${ordinal}.${keyword}` : keyword;
