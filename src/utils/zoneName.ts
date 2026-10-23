/**
 * @file zoneName.ts
 * @description Shared normalization and display formatting for zone names.
 */

// --- Logic Section ---

const decodeZoneEntities = (value: string): string => {
    const namedEntities: Record<string, string> = {
        amp: '&',
        apos: "'",
        gt: '>',
        lt: '<',
        oacute: String.fromCodePoint(243),
        quot: '"',
    };

    return value
        .replace(/&#(?:x([\da-f]+)|(\d+));/gi, (entity, hex: string | undefined, decimal: string | undefined) => {
            const codePoint = Number.parseInt(hex ?? decimal ?? '', hex ? 16 : 10);
            return Number.isInteger(codePoint) && codePoint >= 0 && codePoint <= 0x10ffff
                ? String.fromCodePoint(codePoint)
                : entity;
        })
        .replace(/&([a-z]+);/gi, (entity, name: string) => namedEntities[name.toLowerCase()] ?? entity);
};

const repairUtf8Mojibake = (value: string): string => {
    let repaired = value;

    for (let attempt = 0; attempt < 2 && /[ÃÂâ]/.test(repaired); attempt += 1) {
        const characters = Array.from(repaired);
        if (characters.some(character => character.charCodeAt(0) > 0xff)) break;

        try {
            const bytes = Uint8Array.from(characters, character => character.charCodeAt(0));
            const decoded = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
            if (decoded === repaired) break;
            repaired = decoded;
        } catch {
            break;
        }
    }

    return repaired;
};

const decodeZoneName = (zone: string): string => repairUtf8Mojibake(decodeZoneEntities(zone));

export const normalizeZoneName = (zone: string | null | undefined): string =>
    decodeZoneName(zone ?? '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[()]/g, '')
        .trim()
        .replace(/\s+/g, ' ')
        .toLowerCase();

export const formatZoneDisplayName = (zone: string): string => {
    const decoded = decodeZoneName(zone)
        .replace(/^\s*\((.*)\)\s*$/s, '$1')
        .trim()
        .replace(/\s+/g, ' ');
    const normalized = normalizeZoneName(decoded).replace(/^the\s+/, '');

    return normalized === 'lorien surroundings' ? 'The Lorien Surroundings' : decoded;
};
