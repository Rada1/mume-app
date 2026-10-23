/**
 * @file accountCharacterListHtml.ts
 * @description Adds opacity styling to account character-list columns while preserving ANSI colors.
 */

import { ansiConvert } from '../../utils/ansi';

// --- Logic Section: Column Emphasis ---

interface AccountCharacterLineEmphasis {
    name?: string;
    area?: string;
    rent?: string;
}

interface TextRange {
    start: number;
    end: number;
}

const getRentRange = (text: string, area: string | undefined, rent: string | undefined): TextRange | null => {
    if (!rent) return null;

    const areaStart = area ? text.lastIndexOf(area) : -1;
    const searchStart = areaStart >= 0 ? areaStart + area!.length : 0;
    let start = text.indexOf(rent, searchStart);
    if (start < 0) start = text.lastIndexOf(rent);
    if (start < 0) return null;

    let end = start + rent.length;
    if (/^\d+$/.test(rent)) {
        const unit = text.slice(end).match(/^\s+(?:days?|yrs?|wks?|weeks?|months?|mths?|hours?|hrs?|years?)\b/i);
        if (unit) end += unit[0].length;
    }
    return { start, end };
};

const getEmphasizedRanges = (text: string, emphasis: AccountCharacterLineEmphasis): TextRange[] => {
    const ranges: TextRange[] = [];
    if (emphasis.name) {
        const start = text.indexOf(emphasis.name);
        if (start >= 0) ranges.push({ start, end: start + emphasis.name.length });
    }
    const rentRange = getRentRange(text, emphasis.area, emphasis.rent);
    if (rentRange) ranges.push(rentRange);
    return ranges.sort((left, right) => left.start - right.start);
};

const wrapMutedText = (root: HTMLElement, text: string, emphasizedRanges: TextRange[]) => {
    const mutedRanges: TextRange[] = [];
    let cursor = 0;
    for (const range of emphasizedRanges) {
        const start = Math.max(cursor, range.start);
        if (start > cursor) mutedRanges.push({ start: cursor, end: start });
        cursor = Math.max(cursor, range.end);
    }
    if (cursor < text.length) mutedRanges.push({ start: cursor, end: text.length });
    if (!mutedRanges.length) return;

    const walker = root.ownerDocument.createTreeWalker(root, 4);
    const nodes: Text[] = [];
    while (walker.nextNode()) nodes.push(walker.currentNode as Text);

    const boundaries = mutedRanges.flatMap(range => [range.start, range.end]).sort((a, b) => a - b);
    let nodeStart = 0;
    for (const node of nodes) {
        const value = node.data;
        const nodeEnd = nodeStart + value.length;
        const fragment = root.ownerDocument.createDocumentFragment();
        let localStart = 0;

        while (localStart < value.length) {
            const absoluteStart = nodeStart + localStart;
            const isMuted = mutedRanges.some(range => absoluteStart >= range.start && absoluteStart < range.end);
            const nextBoundary = boundaries.find(boundary => boundary > absoluteStart);
            const localEnd = nextBoundary === undefined
                ? value.length
                : Math.min(value.length, nextBoundary - nodeStart);
            const segment = value.slice(localStart, localEnd);
            if (isMuted) {
                const muted = root.ownerDocument.createElement('span');
                muted.className = 'account-char-muted';
                muted.textContent = segment;
                fragment.appendChild(muted);
            } else {
                fragment.appendChild(root.ownerDocument.createTextNode(segment));
            }
            localStart = localEnd;
        }

        if (fragment.childNodes.length) node.parentNode?.replaceChild(fragment, node);
        nodeStart = nodeEnd;
    }
};

// --- Logic Section: HTML Rendering ---

export const buildAccountCharacterLineHtml = (
    line: string,
    emphasis: AccountCharacterLineEmphasis = {}
): string => {
    const html = ansiConvert.toHtml(line);
    if (typeof document === 'undefined') return html;

    const root = document.createElement('span');
    root.innerHTML = html;
    const visibleText = root.textContent || '';
    wrapMutedText(root, visibleText, getEmphasizedRanges(visibleText, emphasis));
    return root.innerHTML;
};
