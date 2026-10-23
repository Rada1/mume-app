/** @file CommandShopOutputPanel.tsx — Captured shop replies in the shared left-side output position. */
import React from 'react';
import { createPortal } from 'react-dom';
import type { CommandShopProps } from '../../types';
import { escapeHtml, sanitizeMumeHtml } from '../../utils/securityUtils';

// --- Render Section ---
export const CommandShopOutputPanel: React.FC<CommandShopProps> = ({ shop }) => {
    if (!shop.outputVisible || typeof document === 'undefined') return null;
    return createPortal(<aside className="popover-inspection-panel command-shop-output-panel" aria-label="Shop output">
        <header className="popover-inspection-panel-heading"><span>{shop.outputTitle}</span>
            <button type="button" onClick={() => shop.setOutputOpen(false)} aria-label="Close shop output">×</button>
        </header>
        <div className="command-shop-output-lines" aria-live="polite">
            {shop.pendingCommand ? <p>Waiting for shop response…</p> : shop.outputLines.length
                ? shop.outputLines.map((line, index) => <div key={`${line.id}:${index}`} dangerouslySetInnerHTML={{ __html: sanitizeMumeHtml(line.html || escapeHtml(line.text)) }} />)
                : <p>No shop information returned.</p>}
        </div>
    </aside>, document.body);
};
