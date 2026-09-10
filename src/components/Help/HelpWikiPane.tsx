/**
 * @file HelpWikiPane.tsx
 * @description Embedded MUME Wiki pane used by the unified help panel.
 */

import React, { useState } from 'react';
import { ExternalLink, RefreshCw } from 'lucide-react';

const MUME_WIKI_URL = 'https://docs.mume.org/wiki/';

// --- Component Section ---

export const HelpWikiPane: React.FC = () => {
    const [isLoading, setIsLoading] = useState(true);
    const [reloadKey, setReloadKey] = useState(0);

    const reloadWiki = () => {
        setIsLoading(true);
        setReloadKey(key => key + 1);
    };

    return (
        <section className="help-wiki-pane" aria-label="MUME Wiki">
            <div className="help-wiki-pane-header">
                <div>
                    <span className="help-wiki-pane-title">MUME Wiki</span>
                    <span className="help-wiki-pane-url">docs.mume.org/wiki</span>
                </div>
                <div className="help-wiki-pane-actions">
                    <button type="button" onClick={reloadWiki} title="Reload wiki" aria-label="Reload wiki">
                        <RefreshCw size={14} />
                    </button>
                    <button
                        type="button"
                        onClick={() => window.open(MUME_WIKI_URL, '_blank', 'noopener,noreferrer')}
                        title="Open wiki in browser"
                        aria-label="Open wiki in browser"
                    >
                        <ExternalLink size={14} />
                    </button>
                </div>
            </div>
            <div className="help-wiki-pane-frame-wrap">
                {isLoading && <div className="help-wiki-pane-loading">Loading MUME Wiki…</div>}
                <iframe
                    key={reloadKey}
                    title="MUME Wiki"
                    src={MUME_WIKI_URL}
                    className="help-wiki-pane-frame"
                    sandbox="allow-forms allow-popups allow-same-origin allow-scripts"
                    referrerPolicy="no-referrer"
                    onLoad={() => setIsLoading(false)}
                />
            </div>
        </section>
    );
};

export default HelpWikiPane;
