/** @file Displays the identifier and build time of the running client. */
// --- Logic Section ---

import React from 'react';

const ClientVersionInfo: React.FC = () => {
    const builtAt = new Date(import.meta.env.VITE_APP_BUILT_AT);
    const buildTime = Number.isNaN(builtAt.getTime()) ? 'Unknown' : builtAt.toLocaleString();

    return (
        <section
            aria-label="Client version"
            className="setting-group"
            style={{ border: '1px solid var(--border-modal)', background: 'var(--bg-panel)', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}
        >
            <div className="setting-label" style={{ color: 'var(--accent)', fontWeight: 'bold', margin: 0 }}>
                Client Version
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', marginTop: '8px', fontSize: '0.8rem' }}>
                <span>Build</span>
                <code>{import.meta.env.VITE_APP_BUILD_REVISION || 'unknown'}</code>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', marginTop: '4px', color: 'var(--text-dim)', fontSize: '0.75rem' }}>
                <span>Built</span>
                <time dateTime={import.meta.env.VITE_APP_BUILT_AT}>{buildTime}</time>
            </div>
        </section>
    );
};

export default ClientVersionInfo;
