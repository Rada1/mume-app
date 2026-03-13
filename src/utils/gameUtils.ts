/**
 * Extracts a meaningful noun from a game item/player description.
 * Useful for drawer interactive buttons.
 */
export const extractNoun = (text: string): string => {
    // Strip ANSI escape codes first
    let clean = text.replace(/\x1b\[[0-9;]*m/g, '');
    // Remove tags and brackets
    clean = clean.replace(/<[^>]*>/g, '').replace(/\([^)]*\)/g, '').replace(/\[[^\]]*\]/g, '').trim();
    clean = clean.replace(/[.,:;!]+$/, '');
    
    // Filter out articles and quantity words
    const filterRegex = /^(a|an|the|of|in|on|at|to|some|several|many|numerous|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty)$/i;
    const words = clean.split(/[\s,.-]+/).filter(w => w.length > 1 && !filterRegex.test(w));
    
    if (words.length === 0) return '';
    
    let noun = words[words.length - 1].toLowerCase().replace(/[.,:;!?"'()[\]{}<>*#~]/g, '');
    
    // Basic singularization for MUME interaction (flagons -> flagon, etc.)
    if (noun.endsWith('ies')) return noun.slice(0, -3) + 'y';
    if (noun.endsWith('ves')) return noun.slice(0, -3) + 'f'; // wolves -> wolf
    
    // Words ending in 's' that should NOT be singularized
    const exclusions = ['glass', 'dress', 'grass', 'moss', 'bias', 'trousers', 'status', 'compass', 'chaos', 'lens', 'atlas'];
    if (noun.endsWith('s') && !noun.endsWith('ss') && !exclusions.includes(noun)) {
        return noun.slice(0, -1);
    }
    
    return noun;
};

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

    const lower = clean.toLowerCase();
    
    // Find articles
    const articleMatch = clean.match(/^(A|An|The|Some)\b/i);
    const article = articleMatch ? articleMatch[0] : '';
    
    // Remove article for processing
    let rest = article ? clean.slice(article.length).trim() : clean;

    // Common descriptive prefixes to strip
    const adjs = ["huge", "awesome", "ugly", "strong", "pack", "tall", "short", "large", "small", "tiny", "fierce", "old", "young", "mean", "scary", "dirty", "clean", "bright", "dark", "heavy", "light", "metallic", "runic", "steel", "iron", "wooden", "leather", "black", "white", "red", "green", "blue", "yellow", "gray", "grey", "golden", "silver"];
    
    // Split into words, but look for the "core"
    // Usually, the first non-adjective or the thing before "in", "of", "with"
    const words = rest.split(/\s+/);
    let coreNoun = "";
    
    for (let i = 0; i < words.length; i++) {
        const word = words[i].toLowerCase();
        // If we hit a preposition or descriptive Clause, stop
        if (["in", "of", "with", "from", "at", "for", "on", "wearing", "carrying", "holding", "offering"].includes(word)) {
            break;
        }
        // If it's not a common adjective, maybe it's the noun?
        if (!adjs.includes(word) && !["and", "&"].includes(word)) {
            coreNoun = words[i];
            break;
        }
    }

    // Fallback: if we didn't find a core noun, use the last word before any preposition
    if (!coreNoun) {
        coreNoun = words[0];
    }

    if (article) {
        // Ensure "A dealer" vs "An orc"
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

    // Handle " of " - e.g. "Guard of Bree" -> "Guards of Bree"
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
    // Strip ANSI escape codes first
    const cleanRaw = text.replace(/\x1b\[[0-9;]*m/g, '').toLowerCase();
    
    // Check for MUME-specific status tags
    if (cleanRaw.includes('(containing)') || 
        cleanRaw.includes('(closed)') || 
        cleanRaw.includes('(open)') || 
        cleanRaw.includes('contains:') || 
        cleanRaw.trim().endsWith(':')) {
        return true;
    }

    // Keyword detection for common MUME containers that might be empty/open/not displaying tags
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

