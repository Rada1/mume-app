/**
 * @file HelpGuides.tsx
 * @description Embedded MUME wiki panel for in-client help and guides.
 */

import React, { useState } from 'react';
import { ExternalLink, RefreshCw } from 'lucide-react';

// --- Constants ---

const MUME_WIKI_URL = 'https://docs.mume.org/wiki/';

// --- Component ---

const HelpGuides: React.FC = () => {
    const [isLoading, setIsLoading] = useState(true);
    const [reloadKey, setReloadKey] = useState(0);

    const reloadWiki = () => {
        setIsLoading(true);
        setReloadKey(key => key + 1);
    };

    const openWiki = () => {
        window.open(MUME_WIKI_URL, '_blank', 'noopener,noreferrer');
    };

    return (
        <div className="help-guides-container">
            <div className="help-widget-header">
                <div>
                    <h2>MUME Wiki</h2>
                    <span>{MUME_WIKI_URL}</span>
                </div>
                <div className="help-widget-actions">
                    <button type="button" onClick={reloadWiki} title="Reload wiki">
                        <RefreshCw size={16} />
                    </button>
                    <button type="button" onClick={openWiki} title="Open wiki in browser">
                        <ExternalLink size={16} />
                    </button>
                </div>
            </div>

            <div className="help-widget-window">
                {isLoading && (
                    <div className="help-widget-loading">
                        Loading MUME Wiki...
                    </div>
                )}
                <iframe
                    key={reloadKey}
                    title="MUME Wiki"
                    src={MUME_WIKI_URL}
                    className="help-widget-frame"
                    sandbox="allow-forms allow-popups allow-same-origin allow-scripts"
                    referrerPolicy="no-referrer"
                    onLoad={() => setIsLoading(false)}
                />
            </div>
        </div>
    );
};

export default HelpGuides;
