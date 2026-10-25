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
}) => (
    <div className="inline-look-action-control" role="group" aria-label={`Look at ${targetContext}`}>
        <button type="button" className="terminal-inspect-row" title={`look${lookInSelected ? ' in' : ''} ${targetContext}`}
            onPointerDown={event => event.stopPropagation()}
            onClick={event => { event.stopPropagation(); onLook(lookInSelected); }}>
            <span>look</span>
            <span>{targetContext}</span>
        </button>
        <button type="button" className="terminal-inspect-in-toggle" aria-pressed={lookInSelected}
            title={lookInSelected ? `Look inside ${targetContext}` : `Look at ${targetContext}`}
            onPointerDown={event => event.stopPropagation()}
            onClick={event => { event.stopPropagation(); onToggleLookIn(); }}>
            In
        </button>
    </div>
);
