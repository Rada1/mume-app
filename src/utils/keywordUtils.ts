/**
 * @file keywordUtils.ts
 * @description Unified utility for MUME keyword extraction, sanitization, and overrides.
 */

import { GameEntity } from '../types';

/**
 * Extracts the MUME interaction keyword from an item's display name.
 * Only the core noun (not adjectives or material prefixes) is a valid keyword.
 */
export const extractMumeKeyword = (label: string): string => {
    // Strip ANSI, tags, parentheses, and brackets
    let name = label.replace(/\x1b\[[0-9;]*m/g, '')
                    .replace(/<[^>]*>/g, '')
                    .replace(/\([^)]*\)/g, '')
                    .replace(/\[[^\]]*\]/g, '')
                    .trim().toLowerCase();

    // quantifiers that indicate the true noun is after "of"
    const isOfQuantifier = /\b(pair|pairs|set|piece|bundle|pile|handful|bit|slice|loaf|lump|chunk|portion)\b/i;
    // words to filter out when isolating the keyword
    const skipWords = /^(of|a|an|the|some|several|many|various|pair|pairs|set|piece|bundle|pile|handful|bit|slice|loaf|lump|chunk|portion)$/i;

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

/**
 * Sanitizes a target string for game commands.
 */
export const sanitizeGameTarget = (target: string | null | undefined): string | null => {
    if (target === null || target === undefined) return null;
    let clean = target.trim();
    
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
    
    // Strip leading articles and quantifiers
    clean = clean.replace(/^(a|an|the|some)\s+(pair|pairs|set|piece|bundle|pile|handful|bit|slice|loaf|lump|chunk|portion)\s+of\s+/i, '');
    clean = clean.replace(/^(pair|pairs|set|piece|bundle|pile|handful|bit|slice|loaf|lump|chunk|portion)\s+of\s+/i, '');
    clean = clean.replace(/^(a|an|the|some)\s+/i, '');

    return clean.replace(/\s+/g, ' ');
};

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
