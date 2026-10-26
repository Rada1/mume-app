/** @file InlineLookAction.tsx — Look command with an optional container preposition. */
import React from 'react';

// --- Render Section ---
export const InlineLookAction = ({
    targetContext,
    lookInSelected,
    onToggleLookIn,
    onLook
}: {
    targetContext: string;
    lookInSelected: boolean;
    onToggleLookIn: () => void;
    onLook: (lookIn: boolean) => void;
}) => {
    const [isOpen, setIsOpen] = React.useState(false);
    const menuId = `look-argument-${targetContext.replace(/[^a-zA-Z0-9_-]/g, '-')}`;

    const selectArgument = (event: React.MouseEvent, selected: boolean) => {
        event.stopPropagation();
        if (selected !== lookInSelected) onToggleLookIn();
        setIsOpen(false);
    };

    return (
        <div className="inline-look-action-control" role="group" aria-label={`Look at ${targetContext}`}>
            <div className="terminal-inspect-row has-inline-command-sequence has-inline-command-middle">
                <button type="button" className="inline-look-action-part inline-inspect-verb" title={`look${lookInSelected ? ' in' : ''} ${targetContext}`}
                    onPointerDown={event => event.stopPropagation()}
                    onClick={event => { event.stopPropagation(); onLook(lookInSelected); }}>
                    look
                </button>
                <span className="inline-command-middle inline-optional-argument-control">
                    <button type="button" className="inline-optional-argument-select inline-look-modifier-select"
                        aria-label="Optional look argument" aria-haspopup="listbox" aria-expanded={isOpen}
                        aria-controls={menuId} title={lookInSelected ? 'Optional argument: in' : 'Choose an optional argument'}
                        onPointerDown={event => event.stopPropagation()}
                        onClick={event => { event.stopPropagation(); setIsOpen(open => !open); }}>
                        {lookInSelected ? 'in' : ''}
                    </button>
                    <span className="inline-optional-argument-chevron" aria-hidden="true" />
                </span>
            </div>
            {isOpen && <div className="inline-container-get-contents inline-look-modifier-menu" id={menuId}
                role="listbox" aria-label="Optional look argument">
                {[false, true].map(selected => (
                    <button type="button" role="option" aria-selected={lookInSelected === selected}
                        className="inline-container-get-item" key={String(selected)}
                        aria-label={selected ? 'Use the in argument' : 'Leave the argument blank'}
                        onPointerDown={event => event.stopPropagation()}
                        onClick={event => selectArgument(event, selected)}>
                        <span>{selected ? 'in' : ''}</span>
                        <span />
                    </button>
                ))}
            </div>}
        </div>
    );
};
