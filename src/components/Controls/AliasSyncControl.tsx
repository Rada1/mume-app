/** @file AliasSyncControl.tsx — Explicit alias import control beside command suggestion settings. */

import React from 'react';
import { usePanelData } from '../../hooks/usePanelData';
import { useCommandAliasStore } from '../../stores/useCommandAliasStore';
import '../HUD/SkillsSyncPrompt.css';

// --- Render Section ---
export const AliasSyncControl: React.FC = () => {
    const { status, request, enabled } = usePanelData();
    const aliases = useCommandAliasStore(state => state.aliases);
    const error = useCommandAliasStore(state => state.error);
    const loading = status.aliases === 'loading';
    return <div className="skills-sync-prompt" aria-live="polite">
        <span>{error || (status.aliases === 'ready'
            ? `${aliases.length} aliases synced for command suggestions.`
            : 'Sync your character’s aliases to show their commands while typing.')}</span>
        <button type="button" disabled={!enabled || loading} onClick={() => request('aliases', true)}>
            {loading ? 'Syncing aliases…' : status.aliases === 'ready' ? 'Refresh aliases' : 'Sync aliases'}
        </button>
    </div>;
};
