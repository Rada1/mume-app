/** @file DetailsPanelToggle.tsx — Header control for the saved Details panel preference. */
import React from 'react';
import { FileText } from 'lucide-react';
import { useClientPanelStackStore } from '../../stores/useClientPanelStackStore';

// --- Render Section ---
export const DetailsPanelToggle = () => {
    const enabled = useClientPanelStackStore(state => state.detailsEnabled);
    const setEnabled = useClientPanelStackStore(state => state.setDetailsEnabled);
    return <button type="button" className={`menu-toggle-btn${enabled ? ' active' : ''}`}
        aria-label="Toggle Details panel" aria-pressed={enabled} title="Toggle Details panel"
        onClick={() => setEnabled(!enabled)}
        style={{ width: 32, height: 32, padding: 0, justifyContent: 'center' }}>
        <FileText size={17} />
    </button>;
};
