/** @file CommandPracticeOutputPanel.tsx — Training replies in the left output panel. */
import React from 'react';
import { createPortal } from 'react-dom';
import type { CommandPracticeProps } from '../../types';
import { escapeHtml, sanitizeMumeHtml } from '../../utils/securityUtils';

// --- Render Section ---
export const CommandPracticeOutputPanel: React.FC<CommandPracticeProps> = ({ practice }) => {
    if (!practice.outputVisible) return null;
    return createPortal(<aside className="popover-inspection-panel command-practice-output-panel" aria-label="Practice response">
        <header className="popover-inspection-panel-heading"><span>Practice · {practice.report.skillName}</span>
            <button type="button" onClick={() => practice.setOutputOpen(false)} aria-label="Close practice response">×</button></header>
        {practice.report.skillName && <section className="command-practice-response" aria-live="polite">
            <h3>Practice · {practice.report.skillName}</h3>
            {practice.report.pendingCommand ? <p>Waiting for training response…</p> : practice.report.lines.length
                ? practice.report.lines.map((line, index) => <div key={`${line.id}:${index}`} dangerouslySetInnerHTML={{ __html: sanitizeMumeHtml(line.html || escapeHtml(line.text)) }} />)
                : <p>No training response returned.</p>}
        </section>}
    </aside>, document.body);
};
