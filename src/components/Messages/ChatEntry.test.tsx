// @vitest-environment jsdom
/**
 * @file ChatEntry.test.tsx
 * @description Unit tests for ChatEntry spacing and separate sender/action rendering.
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ChatEntry } from './ChatEntry';
import type { Message } from '../../types';

vi.mock('../../context/GameContext', () => ({
    useTokenHighlight: () => ({ target: null, opponentId: null, opponentName: null }),
    useBaseGame: () => ({ inlineCategories: [], selectedObjectIds: new Set(), inCombat: false }),
    useUI: () => ({ popoverState: null })
}));

vi.mock('../../stores/useSettingsStore', () => ({
    useSettingsStore: (fn: any) => fn({
        playerColor: '#7da8e8',
        enemyColor: undefined,
        neutralColor: undefined,
        npcColor: undefined,
        objectColor: undefined,
        roomColor: undefined,
        theme: 'dark',
        isTextRevealEnabled: false
    })
}));

describe('ChatEntry', () => {
    it('preserves spaces in message body tokens instead of smooshing words together', () => {
        const message: Message = {
            id: 'tell-1',
            type: 'comm',
            textRaw: "Sauron tells you: 'I think you are confused, nobody is called hi'",
            textOnly: "Sauron tells you: 'I think you are confused, nobody is called hi'",
            timestamp: 1727142480000,
            isComm: true,
            replyCommand: 'tell',
            commSender: 'Sauron',
            commAction: 'tells you',
            commText: "'I think you are confused, nobody is called hi'",
            commColor: 'var(--ansi-bright-green, #44ff70)',
            commSenderTokens: [{
                type: 'entity',
                content: 'Sauron',
                entityId: 'sauron',
                metadata: { category: 'cat-player', kind: 'player', style: { color: 'var(--ansi-bright-green)' } }
            }],
            commTextTokens: [
                {
                    type: 'text',
                    content: "'I think you are confused, nobody is called hi'"
                }
            ]
        };

        const { container } = render(<ChatEntry message={message} />);

        const phrase = container.querySelector('.chat-window-phrase');
        expect(phrase?.textContent).toBe('Sauron tells you:');
        expect((phrase as HTMLElement)?.style.color).toBe('var(--ansi-bright-green, #44ff70)');
        expect(container.querySelector('.chat-window-action')?.textContent).toBe(' tells you:');
        const sender = container.querySelector('.chat-window-sender .inline-btn') as HTMLElement;
        expect(sender).toBeTruthy();
        expect(sender.style.getPropertyValue('--glow-color')).toBe('#7da8e8');

        const textContainer = container.querySelector('.chat-window-text');
        // Verify textContent has all spaces intact
        expect(textContainer?.textContent).toBe("'I think you are confused, nobody is called hi'");
        // Ensure words are NOT smooshed together
        expect(textContainer?.textContent).not.toBe("'Ithinkyouareconfused,nobodyiscalledhi'");
    });

    it('keeps different channel verbs separate from sender names', () => {
        const sayMessage: Message = {
            id: 'say-1',
            type: 'comm',
            textRaw: "A traveler says 'Hello there.'",
            textOnly: "A traveler says 'Hello there.'",
            timestamp: 1727142480000,
            isComm: true,
            replyCommand: 'say',
            commSender: 'A traveler',
            commAction: 'says',
            commText: "'Hello there.'"
        };

        const { container: sayContainer } = render(<ChatEntry message={sayMessage} />);
        const sayPhrase = sayContainer.querySelector('.chat-window-phrase') as HTMLElement;
        expect(sayPhrase.textContent).toBe('A traveler says:');
        expect(sayContainer.querySelector('.chat-window-action')?.textContent).toBe(' says:');
        expect(sayPhrase.style.color).toContain('cyan');

        const yellMessage: Message = {
            id: 'yell-1',
            type: 'comm',
            textRaw: "An orc yells 'Intruders!'",
            textOnly: "An orc yells 'Intruders!'",
            timestamp: 1727142480000,
            isComm: true,
            replyCommand: 'yell',
            commSender: 'An orc',
            commAction: 'yells',
            commText: "'Intruders!'"
        };

        const { container: yellContainer } = render(<ChatEntry message={yellMessage} />);
        const yellPhrase = yellContainer.querySelector('.chat-window-phrase') as HTMLElement;
        expect(yellPhrase.textContent).toBe('An orc yells:');
        expect(yellContainer.querySelector('.chat-window-action')?.textContent).toBe(' yells:');
        expect(yellPhrase.style.color).toContain('magenta');
    });
});
