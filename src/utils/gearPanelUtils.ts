/** @file gearPanelUtils.ts — Turn captured MUME equipment lines into terminal rows. */
import type { DrawerLine, GearRecipient, GearRow, GmcpOccupant } from '../types';
import { extractMumeKeyword, isItemContainer } from './gameUtils';
import { getRoomObjectKeyword } from '../objects/objectTargetModel';
import { getOccupantCommandKeyword } from './occupantKeywordUtils';
import { normalizeOccupantType } from '../services/classification/normalizeOccupantType';

const ROOM_CHARACTER_TYPES = new Set(['ally', 'enemy', 'neutral', 'npc', 'mount', 'player', 'character', 'self', 'you', 'mob', 'mobile']);
export type { GearRecipient, GearRow } from '../types';

const MUME_DEFAULT_EQUIPMENT_ORDER = 'WSHbcahlfnwF-qB';
const WORN_PREFIX_ORDER: Readonly<Record<string, string>> = {
    '<wielded>': 'W',
    '<held in weapon hand>': 'W',
    '<held in shield hand>': 'S',
    '<worn as shield>': 'S',
    '<worn on head>': 'H',
    '<worn on body>': 'b',
    '<worn about body>': 'c',
    '<worn on arms>': 'a',
    '<worn on hands>': 'h',
    '<worn on legs>': 'l',
    '<worn on feet>': 'f',
    '<worn around neck>': 'n',
    '<worn on wrists>': 'w',
    '<worn on finger>': 'F',
    '<worn on back>': '-',
    '<worn across back>': 'q',
    '<worn as belt>': 'B',
    '<worn on belt>': 'B',
};

// --- Logic Section ---
export function getWornSlotLabel(prefix?: string): string | undefined {
    const raw = prefix?.replace(/[<>]/g, '').trim().replace(/\s+/g, ' ');
    if (!raw) return undefined;
    const normalized = raw.toLowerCase();
    if (normalized === 'wielded' || normalized === 'wield') return 'Wield';

    let label = raw.replace(/^worn\s+/i, '');
    if (/^(?:used\s+)?as\s+/i.test(label)) label = label.replace(/^(?:used\s+)?as\s+/i, '');
    return label ? label[0]!.toUpperCase() + label.slice(1) : undefined;
}

export function sortWornGearRows(rows: GearRow[]): GearRow[] {
    return rows
        .map((row, index) => {
            const prefix = row.line.prefix?.trim().toLowerCase() || '';
            const slot = WORN_PREFIX_ORDER[prefix];
            const order = slot ? MUME_DEFAULT_EQUIPMENT_ORDER.indexOf(slot) : -1;
            return { row, index, order: order < 0 ? Number.MAX_SAFE_INTEGER : order };
        })
        .sort((a, b) => a.order - b.order || a.index - b.index)
        .map(({ row }) => row);
}

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
        slotLabel: getWornSlotLabel(line.prefix) ?? '',
        article,
        name,
        condition,
        noun: line.context || extractMumeKeyword(raw),
        isContainer: Boolean(line.isContainer || isItemContainer(line.text)),
    };
}

export function toNearbyGearRows(items: GmcpOccupant[]): GearRow[] {
    const rows = items.flatMap((item, index) => {
        if (ROOM_CHARACTER_TYPES.has((normalizeOccupantType(item) || '').toLowerCase())) return [];
        const name = item.name || item.short || item.shortdesc || item.keyword || item.desc || '';
        const keyword = getRoomObjectKeyword(item, name);
        if (!name.trim() || !keyword) return [];
        const id = String(item.objectId || item.id || `${keyword}:${index}`);
        const line: DrawerLine = {
            id: `roomitems:${id}`,
            text: name,
            html: name,
            isItem: true,
            isContainer: isItemContainer(name),
            entityId: id,
            context: keyword
        };
        const row = toGearRow(line);
        return row ? [{ row, keyword }] : [];
    });
    const totals = new Map<string, number>();
    rows.forEach(({ keyword }) => totals.set(keyword, (totals.get(keyword) || 0) + 1));
    const seen = new Map<string, number>();
    return rows.map(({ row, keyword }) => {
        const ordinal = (seen.get(keyword) || 0) + 1;
        seen.set(keyword, ordinal);
        return { ...row, noun: (totals.get(keyword) || 0) > 1 ? `${ordinal}.${keyword}` : keyword };
    });
}

export function getGearRecipients(
    entities: Array<GmcpOccupant | string>,
    characterName: string
): GearRecipient[] {
    const rows = entities.flatMap((entity, index) => {
        const name = typeof entity === 'string'
            ? entity.trim()
            : (entity.name || entity.short || entity.shortdesc || entity.keyword || '').trim();
        if (!name || name.toLowerCase() === characterName.toLowerCase()) return [];
        const type = typeof entity === 'string' ? '' : normalizeOccupantType(entity)?.toLowerCase() || '';
        if (type === 'you' || type === 'self') return [];
        const noun = typeof entity === 'string'
            ? getOccupantCommandKeyword({ name }, name)
            : getOccupantCommandKeyword(entity, name);
        if (!noun) return [];
        const id = typeof entity === 'string' ? `${noun}:${index}` : String(entity.id || `${noun}:${index}`);
        const kind: GearRecipient['kind'] = typeof entity !== 'string' && (entity.pc === false || entity.pc === 0
            || ['npc', 'mob', 'mobile', 'mount'].includes(type)) ? 'npc' : 'player';
        return [{ id, label: name.replace(/^[*-]+|[*-]+$/g, ''), noun, kind }];
    });
    const totals = new Map<string, number>();
    rows.forEach(row => totals.set(row.noun, (totals.get(row.noun) || 0) + 1));
    const seen = new Map<string, number>();
    return rows.map(row => {
        const ordinal = (seen.get(row.noun) || 0) + 1;
        seen.set(row.noun, ordinal);
        return {
            ...row,
            noun: (totals.get(row.noun) || 0) > 1 ? `${ordinal}.${row.noun}` : row.noun
        };
    });
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
