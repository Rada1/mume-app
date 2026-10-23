/** @file SkillsSyncPrompt.tsx — Shared explicit skill loading control for desktop and mobile. */
import React from 'react';
import { RefreshCw } from 'lucide-react';
import { usePanelData } from '../../hooks/usePanelData';
import './SkillsSyncPrompt.css';

// --- Render Section ---
export const SkillsSyncPrompt: React.FC<{
    hideWhenReady?: boolean;
    presentation?: 'default' | 'command-header';
}> = ({ hideWhenReady = false, presentation = 'default' }) => {
    const { status, request, enabled } = usePanelData();
    const ready = status.skills === 'ready';
    const loading = status.skills === 'loading';
    const isCommandHeader = presentation === 'command-header';
    if (!enabled || (hideWhenReady && ready)) return null;
    return <div className={`skills-sync-prompt${ready ? ' is-synced' : ''}${isCommandHeader ? ' is-command-header' : ''}`} aria-live="polite" aria-busy={loading}>
        {!isCommandHeader && !ready && <span>Sync to show the skills and spells your character knows.</span>}
        <button type="button" disabled={loading} onClick={() => request('skills', ready)}
            aria-label={isCommandHeader ? loading ? 'Syncing abilities' : 'Sync abilities' : undefined}
            title={isCommandHeader ? loading ? 'Syncing abilities' : 'Sync abilities' : undefined}>
            {isCommandHeader ? <RefreshCw size={14} aria-hidden="true" /> : loading ? 'Syncing skills & spells…' : ready ? 'Refresh skills & spells' : 'Sync skills & spells'}
        </button>
    </div>;
};
