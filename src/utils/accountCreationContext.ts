/**
 * @file accountCreationContext.ts
 * @description Keeps a compact rolling transcript for mobile character creation.
 */

// --- Logic Section ---
const MAX_CONTEXT_LINES = 24;
const MAX_CONTEXT_CHARACTERS = 3200;

export const appendCreationContextLine = (context: string, rawLine: string): string => {
    const line = rawLine.replace(/\x1b\[[0-9;]*m/g, '').trim();
    if (!line || /^(?:\([\w\d]{1,3}\)|[\w\d]{1,3}\))\s+/.test(line)) return context;

    const lines = context ? context.split('\n') : [];
    if (lines[lines.length - 1] !== line) lines.push(line);

    while (lines.length > MAX_CONTEXT_LINES || lines.join('\n').length > MAX_CONTEXT_CHARACTERS) {
        lines.shift();
    }
    return lines.join('\n');
};

export const appendCreationContextAnsiLine = (
    context: string,
    nextContext: string,
    ansiLines: string[],
    rawLine: string
): string[] => {
    if (context === nextContext) return ansiLines;
    const previousLines = ansiLines.length > 0 ? ansiLines : context ? context.split('\n') : [];
    const nextLineCount = nextContext ? nextContext.split('\n').length : 0;
    return [...previousLines, rawLine].slice(-nextLineCount);
};
