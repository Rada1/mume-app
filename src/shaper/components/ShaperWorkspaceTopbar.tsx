/**
 * @file ShaperWorkspaceTopbar.tsx
 * @description Header controls for the Shaper workspace shell.
 */

import { Undo2, X } from 'lucide-react';
import type { ShaperLiveImportStatus } from '../hooks/useShaperLiveImportRunner';
import type { ShaperWorkspaceDoc } from '../model/shaperTypes';

interface ShaperWorkspaceTopbarProps {
    activeDoc: ShaperWorkspaceDoc | null;
    issueCount: number;
    canUndo: boolean;
    onProjects: () => void;
    onUndo: () => void;
    onChangeZone: () => void;
    onImportLiveRead: () => void;
    liveImportStatus: ShaperLiveImportStatus;
    onClose: () => void;
}

// --- Component Section ---
export const ShaperWorkspaceTopbar: React.FC<ShaperWorkspaceTopbarProps> = ({
    activeDoc,
    issueCount,
    canUndo,
    onProjects,
    onUndo,
    onChangeZone,
    onImportLiveRead,
    liveImportStatus,
    onClose
}) => {
    return (
        <header className="shaper-topbar">
            <div>
                <span className="shaper-kicker">Builder Workspace</span>
                <h1>Shaper Mode</h1>
            </div>
            <div className="shaper-topbar-status">
                {activeDoc && <button type="button" onClick={onProjects}>Projects</button>}
                {activeDoc && <button type="button" onClick={onUndo} disabled={!canUndo} title="Undo (Ctrl+Z)"><Undo2 size={16} /></button>}
                {activeDoc && <button type="button" onClick={onChangeZone}>Zone {activeDoc.zoneNumber}</button>}
                {activeDoc && <button type="button" onClick={onImportLiveRead} disabled={liveImportStatus.running}>Import Live Read</button>}
                {activeDoc && liveImportStatus.running && <span>{liveImportStatus.completed}/{liveImportStatus.total || '?'}</span>}
                {activeDoc && liveImportStatus.error && <span>{liveImportStatus.error}</span>}
                {activeDoc && <span>{issueCount} issues</span>}
                <button type="button" onClick={onClose} title="Close Shaper">
                    <X size={18} />
                </button>
            </div>
        </header>
    );
};
