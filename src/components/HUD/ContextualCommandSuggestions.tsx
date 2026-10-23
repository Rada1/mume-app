/** @file ContextualCommandSuggestions.tsx — Renders state-aware commands in the desktop command panel. */

// --- Logic Section ---
import React, { FC } from 'react';
import type { SuggestedNowModel } from '../../hooks/useSuggestedNowActions';

interface ContextualCommandSuggestionsProps {
    model: SuggestedNowModel;
}

// --- Render Section ---
export const ContextualCommandSuggestions: FC<ContextualCommandSuggestionsProps> = ({ model }) => (
    <section className="suggested-now" aria-label="Suggested commands">
        <div className="suggested-now-heading">
            <span>Suggested now</span>
            <span className="suggested-now-situation">{model.situation}</span>
        </div>
        <div className="suggested-now-grid">
            {model.actions.map(action => (
                <button
                    type="button"
                    key={action.id}
                    className={`suggested-now-action${action.isDanger ? ' is-danger' : ''}`}
                    onClick={action.onActivate}
                    title={`${action.description} Command: ${action.command}`}
                >
                    <span className="suggested-now-action-title">
                        <strong>{action.label}</strong>
                        {action.target && <span className="suggested-now-target">{action.target}</span>}
                    </span>
                    <code>{action.command}</code>
                    <small>{action.description}</small>
                </button>
            ))}
        </div>
    </section>
);
