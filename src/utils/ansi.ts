import Convert from 'ansi-to-html';

const converter = new Convert({
    fg: 'var(--text-primary)',
    bg: 'transparent',
    newline: false,
    escapeXML: true,
    stream: true,
    colors: {
        0: 'var(--ansi-black)',
        1: 'var(--ansi-red)',
        2: 'var(--ansi-green)',
        3: 'var(--ansi-yellow)',
        4: 'var(--ansi-blue)',
        5: 'var(--ansi-magenta)',
        6: 'var(--ansi-cyan)',
        7: 'var(--ansi-white)',
        8: 'var(--ansi-bright-black)',
        9: 'var(--ansi-bright-red)',
        10: 'var(--ansi-bright-green)',
        11: 'var(--ansi-bright-yellow)',
        12: 'var(--ansi-bright-blue)',
        13: 'var(--ansi-bright-magenta)',
        14: 'var(--ansi-bright-cyan)',
        15: 'var(--ansi-bright-white)'
    }
});

// A simple Map-based cache to avoid re-parsing identical ANSI strings (like prompts or common attacks)
const cache = new Map<string, string>();
const MAX_CACHE_SIZE = 1000;

export const ansiConvert = {
    toHtml: (text: string): string => {
        if (!text) return '';

        let result = cache.get(text);
        if (result !== undefined) {
            return result;
        }

        result = converter.toHtml(text);

        if (cache.size >= MAX_CACHE_SIZE) {
            // Evict the oldest entry (Map iterates in insertion order)
            const firstKey = cache.keys().next().value;
            if (firstKey !== undefined) cache.delete(firstKey);
        }
        cache.set(text, result);

        return result;
    },
    // Expose the raw converter for anything else that might need it
    raw: converter
};
