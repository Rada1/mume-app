import React from 'react';
import { PopoverState } from '../../types';
import { extractNoun } from '../../utils/gameUtils';

interface RecipientSelectProps {
    popoverState: PopoverState;
    roomPlayers: string[];
    executeCommand: (cmd: string, silent?: boolean, isSystem?: boolean, isHistorical?: boolean) => void;
    setPopoverState: (val: PopoverState | null) => void;
}


export const RecipientSelectPopover: React.FC<RecipientSelectProps> = ({
    popoverState, roomPlayers, executeCommand, setPopoverState
}) => (
    <>
        <div className="popover-header" style={{ padding: '8px 12px', fontSize: '0.7rem', opacity: 0.5 }}>SELECT RECIPIENT</div>
        <div className="popover-scroll" style={{ maxHeight: '200px', overflowY: 'auto', minWidth: '150px' }}>
            {[...new Set(roomPlayers)].length === 0 && <div className="popover-empty">No one here.</div>}
            {[...new Set(roomPlayers)].map(name => (
                <div
                    key={name}
                    className="popover-item"
                    data-menu-item="true"
                    onPointerDown={(e) => e.preventDefault()}
                    onClick={() => {
                        executeCommand(`${popoverState.context} ${extractNoun(name)}`);
                        setPopoverState(null);
                    }}
                >
                    {name}
                </div>
            ))}
        </div>
        <div className="popover-item" style={{ borderTop: '1px solid var(--border-color, rgba(255,255,255,0.1))', color: 'var(--ansi-red, #ff5555)', textAlign: 'center' }} onClick={() => setPopoverState(null)}>Cancel</div>
    </>
);
