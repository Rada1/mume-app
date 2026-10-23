/** @file SentCommandText.tsx — Renders alias meaning or the built-in abbreviation for a sent command. */

import React from 'react';
import type { SentCommandTextProps } from '../../types';
import { useSentCommandDisplay } from '../../hooks/useSentCommandDisplay';
import { decodeCommandEntities } from '../../utils/commandTextUtils';
import { getCommandTextColor } from '../../utils/swipeCommandColors';
import { TokenRenderer } from './TokenRenderer';

// --- Render Section ---
export const SentCommandText: React.FC<SentCommandTextProps> = ({ message }) => {
    const display = useSentCommandDisplay({ message });
    const commandColor = getCommandTextColor(display.alias || display.raw);
    const commandContent = display.alias
        ? <span title={`Alias: ${display.raw}`}>{display.alias}</span>
        : display.remainder
            ? <>
                {display.token}<span className="user-command-expansion">({display.remainder})</span>{decodeCommandEntities(display.suffix)}
            </>
            : <TokenRenderer tokens={message.tokens} fallbackHtml={decodeCommandEntities(display.raw)} splitFirstWord />;

    return <span className="sent-command-display" style={{ color: commandColor }}>{commandContent}</span>;
};
