/** @file inlineKeywordMatching.test.ts — Literal matching semantics and bounded compilation reuse. */
import { afterEach, expect, it, vi } from 'vitest';

// --- Matcher Regression Section ---
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.resetModules(); });
const observeCompilation = () => {
    const NativeRegExp = RegExp;
    const compile = vi.fn(function (pattern: string | RegExp, flags?: string) { return new NativeRegExp(pattern, flags); });
    vi.stubGlobal('RegExp', compile);
    return compile;
};
it('preserves boundaries, case, literal punctuation and hyphen/space matching', async () => {
    const {matchesKeyword} = await import('./inlineKeywordMatching');
    expect(matchesKeyword('a steel-shafted mattock', 'steel-shafted')).toBe(true);
    expect(matchesKeyword('A STEEL SHAFTED MATTOCK', 'steel-shafted')).toBe(true);
    expect(matchesKeyword('a steelshafted mattock', 'steel-shafted')).toBe(false);
    expect(matchesKeyword('a penknife', 'knife')).toBe(false);
    expect(matchesKeyword('a knife.', 'knife')).toBe(true);
    expect(matchesKeyword('a+b (special)', 'a+b')).toBe(true);
    expect(matchesKeyword('axb', 'a+b')).toBe(false);
    expect(matchesKeyword('a (special) sword', '(special)')).toBe(true);
});
it('compiles a keyword once across repeated names and keyword casing', async () => {
    const {matchesKeyword} = await import('./inlineKeywordMatching');
    const compile = observeCompilation();
    for (let index = 0; index < 50; index++) {
        expect(matchesKeyword('a leather backpack', index % 2 ? 'backpack' : 'BACKPACK')).toBe(true);
    }
    expect(compile).toHaveBeenCalledTimes(1);
});
it('evicts old compiled matchers so arbitrary custom keywords cannot grow the cache indefinitely', async () => {
    const {matchesKeyword} = await import('./inlineKeywordMatching');
    const compile = observeCompilation();
    matchesKeyword('test', 'first-keyword');
    for (let index = 0; index < 1024; index++) matchesKeyword('test', `keyword-${index}`);
    matchesKeyword('test', 'first-keyword');
    expect(compile.mock.calls.filter(([pattern]) => String(pattern).includes('first[-\\s]keyword'))).toHaveLength(2);
});
