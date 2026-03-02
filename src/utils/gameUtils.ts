/**
 * Extracts a meaningful noun from a game item/player description.
 * Useful for drawer interactive buttons.
 */
export const extractNoun = (text: string): string => {
    let clean = text.replace(/<[^>]*>/g, '').replace(/\([^)]*\)/g, '').replace(/\[[^\]]*\]/g, '').trim();
    clean = clean.replace(/[.,:;!]+$/, '');
    const words = clean.split(/[\s,.-]+/).filter(w => w.length > 1 && !/^(a|an|the|of|in|on|at|to|some|several)$/i.test(w));
    return words.length > 0 ? words[words.length - 1].toLowerCase().replace(/[^\w]/g, '') : '';
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
