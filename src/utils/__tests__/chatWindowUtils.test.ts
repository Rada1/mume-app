/**
 * @file chatWindowUtils.test.ts
 * @description Tests chat window message filtering.
 */

import { describe, expect, it } from 'vitest';
import type { Message } from '../../types';
import { getChatMessageDetails, getChatWindowMessages, isChatMessage, parseOutgoingChatCommand } from '../chatWindowUtils';

// --- Test Data Section ---

const message = (id: string, overrides: Partial<Message>): Message => ({
    id,
    html: '',
    textRaw: '',
    type: 'game',
    timestamp: 1,
    ...overrides
});

// --- Tests Section ---

describe('chatWindowUtils', () => {
    it('accepts structured communication messages', () => {
        expect(isChatMessage(message('tell', { isComm: true }))).toBe(true);
        expect(isChatMessage(message('say', { type: 'comm' }))).toBe(true);
        expect(isChatMessage(message('reply', { replyCommand: 'narrate' }))).toBe(true);
    });

    it('rejects normal game, combat, prompt, and user command messages', () => {
        expect(isChatMessage(message('game', { type: 'game' }))).toBe(false);
        expect(isChatMessage(message('combat', { type: 'game', isCombat: true }))).toBe(false);
        expect(isChatMessage(message('prompt', { type: 'prompt' }))).toBe(false);
        expect(isChatMessage(message('user', { type: 'user', textRaw: 'kill guard' }))).toBe(false);
    });

    it('accepts outgoing communication commands', () => {
        expect(isChatMessage(message('sent-narrate', { type: 'user', textRaw: 'narrate hello there' }))).toBe(true);
        expect(isChatMessage(message('sent-tell', { type: 'user', textRaw: 'tell dana hello' }))).toBe(true);
        expect(parseOutgoingChatCommand('tell dana hello')).toEqual({
            channel: 'tell',
            sender: 'You',
            target: 'dana',
            text: 'hello',
            isOutgoing: true
        });
    });

    it('normalizes chat display details', () => {
        expect(getChatMessageDetails(message('incoming', {
            isComm: true,
            replyCommand: 'narrate',
            commSender: 'Dana',
            commText: 'tea?'
        }))).toMatchObject({
            channel: 'narrate',
            sender: 'Dana',
            text: 'tea?',
            isOutgoing: false
        });
    });

    it('rejects social messages from the chat window', () => {
        expect(isChatMessage(message('social-comm', { type: 'comm', isComm: true, isSocial: true }))).toBe(false);
        expect(isChatMessage(message('social-reply', { replyCommand: 'narrate', isSocial: true }))).toBe(false);
    });

    it('keeps only the latest 200 chat messages', () => {
        const messages = Array.from({ length: 205 }, (_, index) => (
            message(String(index), { isComm: true, timestamp: index })
        ));

        const filtered = getChatWindowMessages(messages);

        expect(filtered).toHaveLength(200);
        expect(filtered[0].id).toBe('5');
        expect(filtered[199].id).toBe('204');
    });
});
