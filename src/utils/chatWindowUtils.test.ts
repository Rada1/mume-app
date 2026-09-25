/**
 * @file chatWindowUtils.test.ts
 * @description Verifies communication echoes and readable terminal transcript headings.
 */

import { describe, expect, it } from 'vitest';
import { getChatTranscriptPhrase, getWhoPlayerNames, parseOutgoingChatCommand, getChatChannelColor, getChatMessageDetails } from './chatWindowUtils';

// --- Logic Section ---

describe('chat transcript', () => {
    it('recognizes prompted outgoing tells and preserves their recipient', () => {
        const details = parseOutgoingChatCommand('P8>tell Sauron I am heading east');
        expect(details).toMatchObject({ channel: 'tell', target: 'Sauron', text: 'I am heading east', isOutgoing: true });
        expect(getChatTranscriptPhrase(details!)).toBe('You tell Sauron:');
    });

    it('labels received and outgoing communication in game language', () => {
        expect(getChatTranscriptPhrase({ channel: 'tell', sender: 'Sauron', text: 'Wait.', isOutgoing: false })).toBe('Sauron tells you:');
        expect(getChatTranscriptPhrase({ channel: 'say', sender: 'You', text: 'Hello.', isOutgoing: true })).toBe('You say:');
        expect(getChatTranscriptPhrase({ channel: 'group', sender: 'Thalion', text: 'Ready.', isOutgoing: false })).toBe('Thalion tells the group:');
    });

    it('assigns correct ANSI colors to communication channels', () => {
        expect(getChatChannelColor('tell')).toContain('green');
        expect(getChatChannelColor('say')).toContain('cyan');
        expect(getChatChannelColor('yell')).toContain('magenta');
        expect(getChatChannelColor('shout')).toContain('magenta');
        expect(getChatChannelColor('whisper')).toContain('magenta');
        expect(getChatChannelColor('narrate')).toContain('yellow');
        expect(getChatChannelColor('pray')).toContain('yellow');
        expect(getChatChannelColor('sing')).toContain('magenta');
        expect(getChatChannelColor('group')).toContain('cyan');
    });

    it('extracts color in getChatMessageDetails from commColor or falls back to channel', () => {
        const tellMsg: any = {
            id: 'm1',
            type: 'comm',
            isComm: true,
            replyCommand: 'tell',
            commSender: 'Sauron',
            commText: 'I think you are confused, nobody is called hi',
            commColor: 'var(--ansi-bright-green, #44ff70)'
        };
        const details = getChatMessageDetails(tellMsg);
        expect(details?.color).toBe('var(--ansi-bright-green, #44ff70)');

        const sayMsg: any = {
            id: 'm2',
            type: 'comm',
            isComm: true,
            replyCommand: 'say',
            commSender: 'Elrond',
            commText: 'Welcome'
        };
        const sayDetails = getChatMessageDetails(sayMsg);
        expect(sayDetails?.color).toContain('cyan');
    });
});
