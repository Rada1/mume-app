/**
 * @file shaperZoneInfoDiscovery.ts
 * @description Parses `/info zone <zone> list` output into zone-info keywords.
 */

const ignoredLinePatterns = [
    /^keyword\b/i,
    /^zone\b/i,
    /^info\b/i,
    /^available\b/i,
    /^[-=\s]+$/
];

// --- Parser Section ---
export const parseShaperZoneInfoKeywords = (output: string): string[] => {
    const seen = new Set<string>();
    output.split('\n').forEach(line => {
        const clean = line.trim();
        if (!clean || ignoredLinePatterns.some(pattern => pattern.test(clean))) return;
        const hasDescriptionSeparator = /(?:\s[-–—]\s|:)/.test(clean);
        const candidates = !hasDescriptionSeparator && /^[a-z0-9_\-\s]+$/i.test(clean)
            ? clean.match(/[a-z][a-z0-9_-]*/gi) ?? []
            : clean.match(/^[\s\-*]*(?:\d+[.)]\s*)?([a-z][a-z0-9_-]*)/i)?.slice(1) ?? [];
        candidates.forEach(candidate => {
            const keyword = candidate.toLowerCase();
            if (keyword === 'list' || keyword === 'read' || keyword === 'zone' || keyword === 'keywords') return;
            seen.add(keyword);
        });
    });
    return [...seen].sort((a, b) => a.localeCompare(b));
};
