/** @file inlineKeywordMatching.ts — Bounded reuse of literal trait keyword matchers. */

// --- Keyword Matching Section ---
const matchers = new Map<string, RegExp>();
const MATCHER_LIMIT = 1024;

export const matchesKeyword = (lowerName: string, keyword: string): boolean => {
    const key = keyword.toLowerCase();
    let matcher = matchers.get(key);
    if (!matcher) {
        const pattern = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/-/g, '[-\\s]');
        matcher = new RegExp(`(^|[^a-z])${pattern}([^a-z]|$)`, 'i');
        if (matchers.size >= MATCHER_LIMIT) matchers.delete(matchers.keys().next().value!);
        matchers.set(key, matcher);
    }
    return matcher.test(lowerName);
};
