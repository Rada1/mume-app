/** @file InlineGroupAction.tsx — Group command with an optional transfer argument. */
import React from 'react';
import type { CustomButton } from '../../../types';
import type { InlineCommandDisplayParts } from './inlineCommandDisplay';

// --- Render Section ---
interface InlineGroupActionProps {
    button: CustomButton;
    transferSelected: boolean;
    targetContext: string;
    onToggleTransfer: () => void;
    renderButton: (button: CustomButton, displayParts?: InlineCommandDisplayParts) => React.ReactNode;
}

export const InlineGroupAction: React.FC<InlineGroupActionProps> = ({
    button,
    transferSelected,
    targetContext,
    onToggleTransfer,
    renderButton
}) => (
    <div className="inline-group-action-control" role="group" aria-label={`Group ${targetContext}`}>
        {renderButton({
            ...button,
            command: transferSelected ? 'group transfer %n' : button.command
        }, { prefix: 'group', middle: (
            <button type="button" className="terminal-inspect-in-toggle" aria-pressed={transferSelected}
                title={transferSelected ? `Group ${targetContext} with transfer` : `Group ${targetContext}`}
                aria-label="Use transfer with group"
                onPointerDown={event => event.stopPropagation()}
                onClick={event => { event.stopPropagation(); onToggleTransfer(); }}>
                Transfer
            </button>
        ), suffix: targetContext })}
    </div>
);
