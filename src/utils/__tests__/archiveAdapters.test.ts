/**
 * @file archiveAdapters.test.ts
 * @description Tests for shared board/mail archive adapter fallbacks.
 */

import { describe, expect, it } from 'vitest';
import { DrawerLine } from '../../types';
import { ArchiveDetail } from '../../stores/useArchiveStore';
import { parseArchiveRead } from '../archiveAdapters';

const line = (text: string): DrawerLine => ({
    id: text,
    text,
    rawText: text,
    html: text,
    tokens: [],
    isHeader: false,
    isItem: false
});

describe('archiveAdapters', () => {
    it('uses the selected board row as metadata when read output is body-only', () => {
        const fallback: ArchiveDetail = {
            id: 37141,
            source: 'board',
            view: 'board',
            subject: 'detailed combat systems',
            author: 'Anolad',
            date: '',
            body: ''
        };

        const detail = parseArchiveRead([
            line('>> (An ancient bug allowed them to burn without alcohol.)'),
            line("Let's think about this. So magic still works, we return to that later.")
        ], 'board', fallback);

        expect(detail).toEqual({
            ...fallback,
            body: ">> (An ancient bug allowed them to burn without alcohol.)\nLet's think about this. So magic still works, we return to that later."
        });
    });

    it('uses the selected book title while turning captured output into reader body', () => {
        const fallback: ArchiveDetail = {
            id: 1,
            source: 'book',
            view: 'book',
            subject: 'red book',
            author: '',
            date: '',
            body: ''
        };

        const detail = parseArchiveRead([
            line('There and Back Again'),
            line(''),
            line('In a hole in the ground there lived a hobbit.')
        ], 'book', fallback);

        expect(detail).toEqual({
            ...fallback,
            body: 'There and Back Again\n\nIn a hole in the ground there lived a hobbit.'
        });
    });
});
