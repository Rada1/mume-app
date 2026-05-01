/**
 * @file gameUtils.ts
 * @description General game utilities for MUME.
 */

import { GameEntity } from '../types';
import { extractMumeKeyword, extractColorTaggedKeyword, extractNoun, sanitizeGameTarget, formatNpcKeywordTarget } from './keywordUtils';

// Re-export for backward compatibility
export { extractMumeKeyword, extractColorTaggedKeyword, extractNoun, sanitizeGameTarget, formatNpcKeywordTarget };

/**
 * Simplifies a long description into a core noun phrase.
 * Example: "A huge and awesome dealer in black leather" -> "A dealer"
 */
export const simplifyDescription = (text: string): string => {
    // Strip ANSI
    let clean = text.replace(/\x1b\[[0-9;]*m/g, '').trim();
    // Strip parentheticals like (glowing) or (invisible)
    clean = clean.replace(/\s*\([^)]*\)\s*/g, ' ').trim();
    clean = clean.replace(/[.,:;!]+$/, '');

    // Find articles
    const articleMatch = clean.match(/^(A|An|The|Some)\b/i);
    const article = articleMatch ? articleMatch[0] : '';
    
    // Remove article for processing
    let rest = article ? clean.slice(article.length).trim() : clean;

    // Common descriptive prefixes to strip
    const adjs = ["huge", "awesome", "ugly", "strong", "pack", "tall", "short", "large", "small", "tiny", "fierce", "old", "young", "mean", "scary", "dirty", "clean", "bright", "dark", "heavy", "light", "metallic", "runic", "steel", "iron", "wooden", "leather", "black", "white", "red", "green", "blue", "yellow", "gray", "grey", "golden", "silver"];
    const quantifiers = ["a", "an", "the", "some", "pair", "pairs", "set", "piece", "bundle", "pile", "handful", "bit", "slice", "loaf", "lump", "chunk", "portion", "of"];
    
    // Split into words, but look for the "core"
    const words = rest.split(/\s+/);
    let coreNoun = "";
    
    for (let i = 0; i < words.length; i++) {
        const word = words[i].toLowerCase();
        if (["in", "of", "with", "from", "at", "for", "on", "wearing", "carrying", "holding", "offering"].includes(word)) {
            break;
        }
        if (!adjs.includes(word) && !quantifiers.includes(word) && !["and", "&"].includes(word)) {
            coreNoun = words[i];
            break;
        }
    }

    if (!coreNoun) {
        coreNoun = words[0];
    }

    if (article) {
        const result = `${article} ${coreNoun}`.trim();
        return result.charAt(0).toUpperCase() + result.slice(1);
    }
    return coreNoun.charAt(0).toUpperCase() + coreNoun.slice(1);
};

export const numToWord = (n: number) => {
    const words = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten",
        "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen", "twenty"];
    return words[n] || n.toString();
};

export const pluralizeMumeSubject = (subject: string): string => {
    let s = subject.trim();
    const prefixMatch = s.match(/^(A|An|The)\s+(.+)$/i);
    let rest = s;
    if (prefixMatch) rest = prefixMatch[2];

    const ofIdx = rest.toLowerCase().indexOf(' of ');
    if (ofIdx !== -1) {
        const head = rest.substring(0, ofIdx);
        const tail = rest.substring(ofIdx);
        return pluralizeMumeSubject(head) + tail;
    }

    const lower = rest.toLowerCase();
    if (lower.endsWith('wolf')) return rest.slice(0, -1) + 'ves';
    if (lower.endsWith('elf')) return rest.slice(0, -1) + 'ves';
    if (lower.endsWith('thief')) return rest.slice(0, -1) + 'ves';
    if (lower.endsWith('man')) return rest.slice(0, -2) + 'en';
    if (lower.endsWith('woman')) return rest.slice(0, -2) + 'en';
    if (lower.endsWith('child')) return rest + 'ren';
    if (lower.endsWith('y') && !/[aeiou]y$/i.test(lower)) return rest.slice(0, -1) + 'ies';
    if (/[sxz]$|ch$|sh$/i.test(lower)) return rest + 'es';
    return rest + 's';
};

export const pluralizeVerb = (verb: string) => {
    const v = verb.toLowerCase();
    if (v === 'is') return 'are';
    if (v === 'has') return 'have';
    if (v === 'was') return 'were';
    if (v.endsWith('es')) {
        const base = v.slice(0, -2);
        if (base.endsWith('sh') || base.endsWith('ch') || base.endsWith('s') || base.endsWith('x') || base.endsWith('z')) {
            return verb.slice(0, -2);
        }
    }
    if (v.endsWith('s') && !v.endsWith('ss')) return verb.slice(0, -1);
    return verb;
};

export const pluralizeRest = (text: string) => {
    return text.replace(/\bits\b/g, 'their')
        .replace(/\bhimself\b/g, 'themselves')
        .replace(/\bherself\b/g, 'themselves')
        .replace(/\bitself\b/g, 'themselves')
        .replace(/\bhis\b/g, 'their')
        .replace(/\bher\b/g, 'their');
};

/**
 * Detects if a game item is a container based on its description and MUME-specific tags.
 */
export const isItemContainer = (text: string): boolean => {
    const cleanRaw = text.replace(/\x1b\[[0-9;]*m/g, '').toLowerCase();
    if (cleanRaw.includes('(containing)') || 
        cleanRaw.includes('(closed)') || 
        cleanRaw.includes('(open)') || 
        cleanRaw.includes('contains:') || 
        cleanRaw.trim().endsWith(':')) {
        return true;
    }
    const containerKeywords = /sack|satchel|pouch|pack|quiver|backpack|bag|chest|box|barrel|crate|keg|vial|flask|bottle|waterskin|beltpouch|moneybelt/i;
    return containerKeywords.test(cleanRaw);
};

/**
 * Detects if a game item is a fluid container (skin, flask, cup, etc.)
 */
export const isFluidContainer = (text: string): boolean => {
    const cleanRaw = text.replace(/\x1b\[[0-9;]*m/g, '').toLowerCase();
    const fluidKeywords = /\bskin\b|\bflask\b|\bcup\b|\bflagon\b|\bjag\b|\bbottle\b|\bjug\b|\bbarrel\b|\bkeg\b/i;
    return fluidKeywords.test(cleanRaw);
};

/**
 * English number words to integers.
 */
export const parseEnglishNumber = (text: string): number => {
    if (/^\d+$/.test(text)) return parseInt(text, 10);
    const units: Record<string, number> = {
        "zero": 0, "one": 1, "two": 2, "three": 3, "four": 4, "five": 5, "six": 6, "seven": 7, "eight": 8, "nine": 9, "ten": 10,
        "eleven": 11, "twelve": 12, "thirteen": 13, "fourteen": 14, "fifteen": 15, "sixteen": 16, "seventeen": 17, "eighteen": 18, "nineteen": 19
    };
    const tens: Record<string, number> = {
        "twenty": 20, "thirty": 30, "forty": 40, "fifty": 50, "sixty": 60, "seventy": 70, "eighty": 80, "ninety": 90
    };
    const scales: Record<string, number> = { "hundred": 100, "thousand": 1000 };
    const words = text.toLowerCase().replace(/-/g, ' ').split(/\s+/).filter(w => w !== 'and');
    let total = 0;
    let current = 0;
    for (const word of words) {
        if (units[word] !== undefined) current += units[word];
        else if (tens[word] !== undefined) current += tens[word];
        else if (scales[word] !== undefined) {
            current *= scales[word];
            if (current >= 100) { total += current; current = 0; }
        } else if (/^\d+$/.test(word)) current += parseInt(word, 10);
    }
    return total + current;
};

/**
 * Formats a MUME price string into shorthand.
 */
export const formatMumePrice = (priceStr: string): string => {
    if (!priceStr) return "";
    const cleanPrice = priceStr.replace(/<[^>]+>/g, '').replace(/\x1b\[[0-9;]*m/g, '').trim();
    const parts = cleanPrice.toLowerCase().split(/ and |, /);
    const result: string[] = [];
    parts.forEach(part => {
        const match = part.trim().match(/^(.*?)\s+(gold|silver|copper|lauren|celeb|busc|pennies?|coins?)$/);
        if (match) {
            const numPart = match[1].trim();
            const unit = match[2].trim();
            const value = parseEnglishNumber(numPart);
            if (value > 0 || (parts.length === 1 && value === 0)) result.push(`${value} ${unit}`);
        }
    });
    return result.join(' ');
};

/**
 * Converts a total copper value into MUME gold/silver/copper units.
 * 1 gold = 20 silver = 240 copper
 * 1 silver = 12 copper
 */
export const formatCopperToCoins = (totalCopper: number) => {
    const gold = Math.floor(totalCopper / 240);
    const silver = Math.floor((totalCopper % 240) / 12);
    const copper = totalCopper % 12;
    return { gold, silver, copper };
};

/**
 * Parses a MUME price string into a total copper value.
 */
export const parsePriceToCopper = (priceStr: string): number => {
    if (!priceStr) return 0;
    const cleanPrice = priceStr.replace(/<[^>]+>/g, '').replace(/\x1b\[[0-9;]*m/g, '').trim();
    const parts = cleanPrice.toLowerCase().split(/ and |, /);
    let totalCopper = 0;
    parts.forEach(part => {
        const match = part.trim().match(/^(.*?)\s+(gold|silver|copper|lauren|celeb|busc|pennies?|coins?)$/);
        if (match) {
            const numPart = match[1].trim();
            const unit = match[2].trim();
            const value = parseEnglishNumber(numPart);
            if (unit.startsWith('gold') || unit.startsWith('lauren')) totalCopper += value * 240;
            else if (unit.startsWith('silver') || unit.startsWith('celeb')) totalCopper += value * 12;
            else totalCopper += value;
        }
    });
    return totalCopper;
};
/**
 * Formats a number to a compact string (e.g. 1500 -> 1.5k, 1200000 -> 1.2M)
 */
export const formatCompactNumber = (n: number | undefined | null): string => {
    if (n === undefined || n === null) return '0';
    if (n >= 1000000) {
        const val = n / 1000000;
        return val % 1 === 0 ? val.toFixed(0) + 'M' : val.toFixed(1) + 'M';
    }
    if (n >= 1000) {
        const val = n / 1000;
        return val % 1 === 0 ? val.toFixed(0) + 'k' : val.toFixed(1) + 'k';
    }
    return n.toString();
};
