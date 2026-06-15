/**
 * @file shaperLiveTranscript.ts
 * @description Splits copied MUME live-read transcripts into command blocks.
 */

export interface ShaperLiveTranscriptBlock {
    command: string;
    output: string;
}

const commandPatterns = [
    /^\/stat\s+zone\s+\d+\b/i,
    /^\/zone\s+\d+\s+list\b/i,
    /^\/info\s+(?:z|zone)\s+\d+\s+\S+/i,
    /^\/at\s+\S+\s+\/stat\s+room(?:\s+full)?\b/i,
    /^\/com\s+room\s+\S+\s+list\b/i,
    /^\/at\s+\S+\s+\/com\s+list\b/i,
    /^\/com\s+list\b/i,
    /^\/at\s+\S+\s+\/lib\s+list(?:\s+-com(?:mands)?)?\b/i,
    /^\/lib\s+room\s+\S+\s+list(?:\s+-com(?:mands)?)?\b/i,
    /^\/lib\s+(?:r|room)\s+(?:h|here)\s+list(?:\s+-com(?:mands)?)?\b/i
];

// --- Normalize Section ---
export const stripShaperTranscriptAnsi = (text: string): string =>
    text
        .replace(/\x1b\[[0-9;]*m/g, '')
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n');

const lineCommand = (line: string): string | null => {
    const clean = stripShaperTranscriptAnsi(line)
        .replace(/^.*?>\s*(\/(?:stat|zone|info|at|lib|com)\b.*)$/i, '$1')
        .replace(/^\[(\/(?:stat|zone|info|at|lib|com)\b.*)\]$/i, '$1')
        .trim();
    return commandPatterns.some(pattern => pattern.test(clean)) ? clean : null;
};

// --- Split Section ---
export const parseShaperLiveTranscript = (text: string): ShaperLiveTranscriptBlock[] => {
    const blocks: ShaperLiveTranscriptBlock[] = [];
    let current: { command: string; lines: string[] } | null = null;

    stripShaperTranscriptAnsi(text).split('\n').forEach(line => {
        const command = lineCommand(line);
        if (command) {
            const duplicateInnerComEcho = current?.lines.length === 0 &&
                /^\/at\s+\S+\s+\/com\s+list\b/i.test(current.command) &&
                /^\/com\s+list\b/i.test(command);
            const duplicateInnerLibEcho = current?.lines.length === 0 &&
                /^\/lib\s+room\s+\S+\s+list\b/i.test(current.command) &&
                /^\/lib\s+(?:r|room)\s+(?:h|here)\s+list\b/i.test(command);
            if (duplicateInnerComEcho || duplicateInnerLibEcho) return;
            if (current) {
                blocks.push({ command: current.command, output: current.lines.join('\n').trim() });
            }
            current = { command, lines: [] };
            return;
        }
        current?.lines.push(line);
    });

    if (current) {
        blocks.push({ command: current.command, output: current.lines.join('\n').trim() });
    }
    return blocks;
};
