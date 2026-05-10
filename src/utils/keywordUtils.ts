/**
 * @file keywordUtils.ts
 * @description Unified utility for MUME keyword extraction, sanitization, and overrides.
 */

import { GameEntity } from '../types';

/**
 * Hardcoded keyword exceptions for specific MUME items where heuristic parsing fails.
 * @description These are rare cases that should be revisited if GMCP provides keyword data.
 * To add a new exception, simply add a case here.
 */
const getHardcodedKeywordException = (name: string): string | null => {
    const clean = name.toLowerCase();
    
    // 1. Specific legendary or complex items
    if (clean.includes('belt of pearls and crystals')) return 'belt';
    if (clean.includes('belt of fell hide')) return 'belt';

    // 2. Keyword-dominant types: if these appear anywhere, they are the primary keyword
    if (clean.includes('sheath')) return 'sheath';
    if (clean.includes('scabbard')) return 'scabbard';
    if (clean.includes('harness')) return 'harness';

    return null;
};

/**
 * Extracts the MUME interaction keyword from an item's display name.
 * Only the core noun (not adjectives or material prefixes) is a valid keyword.
 */
export const extractMumeKeyword = (label: string): string => {
    // Check for hardcoded exceptions first
    const exception = getHardcodedKeywordException(label);
    if (exception) return exception;

    // Strip ANSI, tags, parentheses, and brackets
    let name = label.replace(/\x1b\[[0-9;]*m/g, '')
                    .replace(/<[^>]*>/g, '')
                    .replace(/\([^)]*\)/g, '')
                    .replace(/\[[^\]]*\]/g, '')
                    .trim().toLowerCase();

    // quantifiers that indicate the true noun is after "of"
    const isOfQuantifier = /\b(pair|pairs|set|piece|bundle|pile|handful|bit|slice|loaf|lump|chunk|portion)\b/i;
    // words to filter out when isolating the keyword
    const skipWords = /^(of|a|an|the|some|several|many|various|pair|pairs|set|piece|bundle|pile|handful|bit|slice|loaf|lump|chunk|portion|is|are|at|to|here|from|with|in|on|by)$/i;

    // Handle "X of Y" patterns
    const ofMatch = name.match(/^(.+?)\s+of\s+(.+)$/);
    if (ofMatch) {
        const before = ofMatch[1].trim();
        const after  = ofMatch[2].trim();
        
        // Compound quantifiers → keyword is what comes AFTER "of"
        const isQuantifier = isOfQuantifier.test(before);
        const source = isQuantifier ? after : before;
        const words = source.split(/\s+/).filter(w => !skipWords.test(w));
        return words[words.length - 1] || source.split(/\s+/).pop() || source;
    }

    // No "of" pattern: filter out quantifiers and the last word is the primary keyword
    const words = name.split(/\s+/).filter(w => !skipWords.test(w));
    return words[words.length - 1] || name.split(/\s+/).pop() || name;
};

/**
 * Extracts explicitly color-tagged keyword from MUME ANSI HTML.
 * MUME uses xterm 159 (rgb(175,255,255)) for item keywords.
 */
export const extractColorTaggedKeyword = (html: string | undefined): string | null => {
    if (!html) return null;
    const match = /(?:<span [^>]*style="[^"]*color:\s*rgb\(175,\s*255,\s*255\)[^"]*"[^>]*>)(.*?)(?:<\/span>)/i.exec(html) ||
                  html.match(/\x1b\[38;5;159m(.*?)\x1b\[0m/i);
    
    if (match && match[1]) {
        let decoded = match[1].replace(/&amp;/g, '&').replace(/&lt;/g, '<')
                              .replace(/&gt;/g, '>').replace(/&quot;/g, '"')
                              .replace(/&#39;/g, "'").replace(/<[^>]+>/g, '').trim();
        return extractMumeKeyword(decoded);
    }
    return null;
};

/**
 * Extracts a meaningful noun from a game item/player description.
 * Handles plural singularization common for MUME items.
 */
export const extractNoun = (text: string): string => {
    // Strip ANSI escape codes first
    let clean = text.replace(/\x1b\[[0-9;]*m/g, '');
    // Remove tags and brackets
    clean = clean.replace(/<[^>]*>/g, '').replace(/\([^)]*\)/g, '').replace(/\[[^\]]*\]/g, '').trim();
    clean = clean.replace(/[.,:;!]+$/, '').trim();
    
    // Logic: Use the smart MUME keyword extractor
    let noun = extractMumeKeyword(clean);
    
    // Words or suffixes that should NOT be singularized (plural-only in MUME)
    const exclusions = [
        'glass', 'dress', 'grass', 'moss', 'bias', 'status', 'compass', 'chaos', 'lens', 'atlas',
        'fungus', 'cactus', 'nexus', 'radius', 'corpus', 'viscous',
        'trousers', 'pants', 'breeches', 'leggings', 'hose', 'gloves', 'boots', 'shoes',
        'gauntlets', 'greaves', 'vambraces', 'pauldrons', 'bracers', 'sleeves'
    ];
    if (exclusions.some(ex => noun.endsWith(ex))) {
        return noun;
    }

    // Basic singularization for MUME interaction (flagons -> flagon, wolves -> wolf, etc.)
    if (noun.endsWith('ies')) return noun.slice(0, -3) + 'y';
    if (noun.endsWith('ves')) return noun.slice(0, -3) + 'f';
    if (noun.endsWith('s') && !noun.endsWith('ss')) return noun.slice(0, -1);
    
    return noun;
};

export const isItemNoun = (word: string): boolean => {
    const noun = extractNoun(word);
    return noun.length > 1 && noun === word.trim().toLowerCase();
};

/**
 * Sanitizes a target string for game commands.
 */
export const sanitizeGameTarget = (target: string | null | undefined): string | null => {
    if (target === null || target === undefined) return null;
    let clean = target.trim();

    const exception = getHardcodedKeywordException(clean);
    if (exception) return exception;

    // Inline GMCP character targets are already command-shaped, including
    // ordinal prefixes and enemy markers such as 2.*orc*.
    if (/^\d+\.[\w'*.-]+(?:-[\w'*.-]+)*$/.test(clean) || /^(?:\d+\.)?\*[^*]+\*$/.test(clean)) {
        return clean;
    }
    
    // Rule: any corpse object should eliminate all the -s and just use corpse as the target.
    if (clean.toLowerCase().startsWith('corpse-')) {
        return 'corpse';
    }

    // Rule: specific container simplifications for easier interaction (e.g. leather-backpack -> backpack)
    const containerTypes = ['backpack', 'bag', 'sack', 'pouch', 'satchel', 'quiver', 'chest', 'box', 'barrel', 'crate', 'keg', 'vial', 'flask', 'bottle', 'waterskin', 'skin', 'water-skin'];
    const parts = clean.toLowerCase().split('-');
    if (parts.length > 1 && containerTypes.includes(parts[parts.length - 1])) {
        const lastPart = parts[parts.length - 1];
        if (lastPart === 'waterskin' || lastPart === 'water-skin') return 'skin';
        return lastPart;
    }
    if (clean.toLowerCase() === 'waterskin' || clean.toLowerCase() === 'water-skin') return 'skin';

    // Aggressively strip punctuation from entities
    clean = clean.replace(/[.,:;!?"'()[\]{}<>*#~]/g, ' ').trim();
    
    // Rule: Strip "pair of", "set of", and leading articles globally
    // We use word boundaries to avoid partial matches (e.g. "another" containing "an")
    clean = clean.replace(/\b(pair|pairs|set|piece|bundle|pile|handful|bit|slice|loaf|lump|chunk|portion)\s+of\s+/gi, '');
    clean = clean.replace(/\b(a|an|the|some)\s+/gi, '');

    return clean.replace(/\s+/g, ' ').trim();
};

/**
 * Formats a target string with hyphens for MUME interaction.
 * Used for both NPCs and objects to ensure multi-word targets are parsed correctly.
 */
export const formatMumeTarget = (target: string | null | undefined): string | null => {
    const clean = sanitizeGameTarget(target);
    return clean ? clean.replace(/\s+/g, '-').toLowerCase() : null;
};

// Legacy alias for backward compatibility
export const formatNpcKeywordTarget = formatMumeTarget;

/**
 * Unified "Data-Driven" keyword resolver.
 * Priority: 
 * 1. Color tag (Official server highlight)
 * 2. Entity Noun (Registered data)
 * 3. User Override (Custom preferences)
 * 4. Smart Extract (Heuristic algorithm)
 */
export const getEffectiveKeyword = (
    displayName: string, 
    html?: string, 
    entity?: GameEntity, 
    overrides?: Record<string, string>
): string => {
    // 1. Try color tag (primary "data driven" source from server)
    let keyword = extractColorTaggedKeyword(html) || '';
    
    // 2. Try entity registered noun
    if (!keyword && entity?.noun) {
        keyword = entity.noun;
    }
    
    // 3. Try smart extraction from name
    if (!keyword) {
        keyword = extractNoun(displayName);
    }

    // 4. Apply User Overrides (by the base keyword context)
    if (overrides && overrides[keyword]) {
        keyword = overrides[keyword];
    } else if (overrides && overrides[displayName.toLowerCase()]) {
        // Also allow overriding by full display name
        keyword = overrides[displayName.toLowerCase()];
    }

    // 5. Final Sanitization (corpses, containers, etc.)
    const finalized = sanitizeGameTarget(keyword) || keyword;
    
    return finalized;
};
