/**
 * @file mailParser.test.ts
 * @description Tests for mailbox list and detail parsing.
 */

import { describe, expect, it } from 'vitest';
import { DrawerLine } from '../../types';
import { parseMailList, parseMailRead } from '../mailParser';

const line = (text: string): DrawerLine => ({
    id: text,
    text,
    rawText: text,
    html: text,
    tokens: [],
    isHeader: false,
    isItem: false
});

describe('mailParser', () => {
    it('parses inbox rows with read markers', () => {
        const messages = parseMailList([
            line('Mailbox:'),
            line('  14: "Meet at Bree" (Bilbo) - 12 Foreyule 2941'),
            line('+ 15: "Pipeweed" (Frodo) - 13 Foreyule 2941')
        ], 'inbox');

        expect(messages).toEqual([
            { id: 14, subject: 'Meet at Bree', author: 'Bilbo', date: '12 Foreyule 2941', isRead: false, folder: 'inbox' },
            { id: 15, subject: 'Pipeweed', author: 'Frodo', date: '13 Foreyule 2941', isRead: true, folder: 'inbox' }
        ]);
    });

    it('parses a message detail body', () => {
        const message = parseMailRead([
            line('Mail 14 in your mailbox:'),
            line('From: Bilbo'),
            line('To: Ellessar'),
            line('Subject: Meet at Bree'),
            line('Date: 12 Foreyule 2941'),
            line('---'),
            line('Bring a good cloak.'),
            line('The roads are cold.')
        ], 'inbox');

        expect(message).toMatchObject({
            id: 14,
            subject: 'Meet at Bree',
            author: 'Bilbo',
            recipients: 'Ellessar',
            body: 'Bring a good cloak.\nThe roads are cold.'
        });
    });

    it('parses XML-stripped mail list rows with read markers after the number', () => {
        const messages = parseMailList([
            line('Mail - 1 message'),
            line('1+: @Ellessar (Ellessar)')
        ], 'inbox');

        expect(messages).toEqual([
            { id: 1, subject: '@Ellessar', author: 'Ellessar', date: '', isRead: true, folder: 'inbox' }
        ]);
    });

    it('parses XML-stripped mail detail headers with Written on date lines', () => {
        const message = parseMailRead([
            line('Mail 1 : @Ellessar (Ellessar)'),
            line('Written on Tue Jun  9 15:49:32 2026'),
            line('testing this mail feature'),
            line(''),
            line('test')
        ], 'inbox');

        expect(message).toMatchObject({
            id: 1,
            subject: '@Ellessar',
            author: 'Ellessar',
            date: 'Tue Jun  9 15:49:32 2026',
            body: 'testing this mail feature\n\ntest'
        });
    });
});
