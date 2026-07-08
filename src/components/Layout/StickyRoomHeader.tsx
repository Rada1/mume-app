/**
 * @file StickyRoomHeader.tsx
 * @description Renders the sticky newbie room header with the room's name and description.
 */

import React from 'react';
import { ansiConvert } from '../../utils/ansi';
import { sanitizeMumeHtml } from '../../utils/securityUtils';
import { TokenRenderer } from '../Messages/TokenRenderer';

// --- Logic Section ---

interface StickyRoomHeaderProps {
    isNewbieMode: boolean;
    roomName: string | null;
    roomDesc: string | null;
    currentTerrain: string;
    processMessageTokens?: (text: string) => any[];
    processMessageHtml: (html: string, type: string, flag: boolean, className: any) => string;
}

// --- Component Section ---

export const StickyRoomHeader: React.FC<StickyRoomHeaderProps> = ({
    isNewbieMode,
    roomName,
    roomDesc,
    currentTerrain,
    processMessageTokens,
    processMessageHtml
}) => {
    if (!isNewbieMode || !roomName) return null;

    return (
        <div className={`sticky-room-header terrain-${String(currentTerrain || 'field').toLowerCase()}`} key="newbie-room-header">
            <div className="room-info-text">
                <div className="message-content room-name">
                    {processMessageTokens ? (
                        <TokenRenderer 
                            tokens={processMessageTokens(`\x1b[1;32m${roomName}\x1b[0m`)} 
                            metadata={{ id: `room:${String(roomName).toLowerCase()}`, context: roomName, category: 'cat-room', cmd: 'cat-room', action: 'menu' }} 
                        />
                    ) : (
                        <span dangerouslySetInnerHTML={{ __html: sanitizeMumeHtml(processMessageHtml(ansiConvert.toHtml(`\x1b[1;32m${roomName}\x1b[0m`), 'roomname', true, 'room-name' as any)) }} />
                    )}
                </div>
                {roomDesc && (
                    <div className="message-content room-desc">
                        {processMessageTokens ? (
                            <TokenRenderer tokens={processMessageTokens(`\x1b[0m${roomDesc}`)} />
                        ) : (
                            <span dangerouslySetInnerHTML={{ __html: sanitizeMumeHtml(processMessageHtml(ansiConvert.toHtml(`\x1b[0m${roomDesc}`), 'roomdesc', false, 'room-desc' as any)) }} />
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default StickyRoomHeader;
