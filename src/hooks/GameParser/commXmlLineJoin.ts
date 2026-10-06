/**
 * @file commXmlLineJoin.ts
 * @description Preserves word boundaries when an XML communication spans input lines.
 */

// --- Logic Section ---

const stripSgr = (value: string): string => value.replace(/\x1b\[[0-9;]*m/g, '');

export const joinCommXmlLines = (previous: string, next: string): string => {
    if (!previous || !next) return previous + next;

    const previousText = stripSgr(previous);
    const nextText = stripSgr(next);
    if (/\s$/.test(previousText) || /^\s/.test(nextText)) return previous + next;

    // A trailing hyphen can mark a word split; punctuation at the start of the
    // next fragment belongs to the preceding word/sentence.
    if (/[\-\u2010\u2011]$/.test(previousText) || /^[,.;:!?)}\]'"’”]/.test(nextText)) {
        return previous + next;
    }

    return `${previous} ${next}`;
};
