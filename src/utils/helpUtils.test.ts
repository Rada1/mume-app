import { describe, it, expect } from 'vitest';
import { parseHelpContent } from './helpUtils';

describe('parseHelpContent', () => {
    it('handles empty or blank input', () => {
        expect(parseHelpContent('')).toEqual({ contentHtml: '', keywords: [] });
        expect(parseHelpContent('   ')).toEqual({ contentHtml: '', keywords: [] });
    });

    it('extracts "See also:" keywords correctly', () => {
        const raw = 'Help on SPELLS\nSpells are magical abilities.\nSee also: CAST, MAGIC, MANA.';
        const result = parseHelpContent(raw);
        expect(result.keywords).toEqual(['CAST', 'MAGIC', 'MANA']);
        expect(result.contentHtml).toContain('Help on');
    });

    it('converts uppercase words to clickable help topic spans', () => {
        const raw = 'You can use FLEE or CAST to survive.';
        const result = parseHelpContent(raw);
        expect(result.contentHtml).toContain('help-topic-btn');
        expect(result.contentHtml).toContain('data-cmd=');
        expect(result.contentHtml).toContain('FLEE');
        expect(result.contentHtml).toContain('CAST');
    });
});
