import React from 'react';
import { PopoverState, GmcpOccupant } from '../../types';
import { sanitizeGameTarget } from '../../utils/gameUtils';

interface RecipientSelectProps {
    popoverState: PopoverState;
    roomPlayers: (string | GmcpOccupant)[];
    roomNpcs?: (string | GmcpOccupant)[];
    executeCommand: (cmd: string, silent?: boolean, isSystem?: boolean, isHistorical?: boolean) => void;
    setPopoverState: (val: PopoverState | null) => void;
    themeColor?: string;
}


export const RecipientSelectPopover: React.FC<RecipientSelectProps> = ({
    popoverState, roomPlayers, roomNpcs, executeCommand, setPopoverState, themeColor
}) => {
    const recipients = [...(roomPlayers || []), ...(roomNpcs || [])].map(r => {
        if (typeof r === 'string') return r;
        return r.name || r.shortdesc || r.short || r.keyword;
    }).filter(Boolean) as string[];

    const uniqueRecipients = [...new Set(recipients)];

    return (
        <>
            <div className="popover-header" style={{ padding: '8px 12px', fontSize: '0.7rem', opacity: 0.5 }}>SELECT RECIPIENT</div>
            <div className="popover-scroll" style={{ maxHeight: '200px', overflowY: 'auto', minWidth: '150px' }}>
                {uniqueRecipients.length === 0 && <div className="popover-empty">No one here.</div>}
                {uniqueRecipients.map(name => (
                    <div
                        key={name}
                        className="popover-item"
                        data-menu-item="true"
                        onPointerDown={(e) => e.preventDefault()}
                        style={{
                            borderLeft: `3px solid ${themeColor || 'var(--accent)'}`,
                            justifyContent: 'space-between'
                        }}
                        onClick={() => {
                            const targetNoun = sanitizeGameTarget(name);
                            // setId usually contains the full command like "give sword"
                            let baseCmd = popoverState.setId || '';
                            if (baseCmd.includes('%n')) {
                                baseCmd = baseCmd.replace('%n', popoverState.context || '');
                            }
                            executeCommand(`${baseCmd} ${targetNoun}`);
                            setPopoverState(null);
                        }}
                    >
                        {name}
                    </div>
                ))}
            </div>
            <div className="popover-item" style={{ 
                borderTop: '1px solid var(--border-color, rgba(255,255,255,0.1))', 
                color: 'var(--ansi-red, #ff5555)', 
                textAlign: 'center',
                borderLeft: '3px solid transparent'
            }} onClick={() => setPopoverState(null)}>Cancel</div>
        </>
    );
};
