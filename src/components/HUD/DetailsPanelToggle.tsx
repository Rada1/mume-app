/** @file DetailsPanelToggle.tsx — Header control for the saved Details panel preference. */
import React from 'react';
import { FileText } from 'lucide-react';
import { useClientPanelStackStore } from '../../stores/useClientPanelStackStore';

// --- Render Section ---
export const DetailsPanelToggle: React.FC<{ onToggle?: () => void }> = ({ onToggle }) => {
    const enabled = useClientPanelStackStore(state => state.detailsEnabled);
    const toggleEnabled = useClientPanelStackStore(state => state.toggleDetailsEnabled);
    return <button type="button" className={`menu-toggle-btn${enabled ? ' active' : ''}`}
        aria-label="Toggle Details panel" aria-pressed={enabled} title="Toggle Details panel"
        onClick={() => { toggleEnabled(); onToggle?.(); }}
        style={{ width: 32, height: 32, padding: 0, justifyContent: 'center' }}>
        <FileText size={17} />
    </button>;
};
