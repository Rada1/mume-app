/**
 * @file roomEntityStatus.ts
 * @description Rejoins a wrapped room character status to its preceding line.
 */

import type { Message, Token } from '../types';
import { getInlineCategoryAxes } from './inlineCategoryAxes';

// --- Logic Section ---

const isCharacterToken = (token: Token): boolean => token.type === 'entity' &&
    getInlineCategoryAxes(token.metadata?.category).isCharacter;

export const foldRoomEntityStatus = (messages: Message[]): Message[] => {
    const folded: Message[] = [];

    for (const message of messages) {
        const status = message.textOnly?.trim().match(/^\(?glowing\)?\.?$/i);
        const previous = folded[folded.length - 1];
        const characterIndex = previous?.tokens?.findIndex(isCharacterToken) ?? -1;
        const isRoomCharacterLine = previous && !previous.isComm && !previous.isCombat &&
            /\b(?:is|are)\s+(?:standing|sitting|resting|sleeping|lying)\s+here\./i.test(previous.textOnly || '') &&
            characterIndex >= 0;

        if (!status || !isRoomCharacterLine || !previous.tokens) {
            folded.push(message);
            continue;
        }

        const statusToken = message.tokens?.find(token => /glowing/i.test(token.content));
        const marker: Token = statusToken?.type === 'ansi'
            ? { type: 'ansi', content: ' (glowing)', style: statusToken.style }
            : { type: 'text', content: ' (glowing)' };
        const tokens = [...previous.tokens, marker];
        folded[folded.length - 1] = {
            ...previous,
            tokens,
            textOnly: `${previous.textOnly || ''} (glowing)`
        };
    }

    return folded;
};
