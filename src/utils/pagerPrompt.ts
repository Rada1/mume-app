/** @file pagerPrompt.ts — Recognizes MUME viewer prompts without matching ordinary prose. */

// --- Logic Section: Prompt Detection ---
export const isPagerPrompt = (line: string): boolean => {
    const clean = line.replace(/\x1b\[[0-9;]*m/g, '').trim();
    return /^\*{3}\s*(?:Return:\s*continue\b|\[Hit Return\b)/i.test(clean);
};
