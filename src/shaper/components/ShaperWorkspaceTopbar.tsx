/**
 * @file ShaperWorkspaceTopbar.tsx
 * @description Header controls for the Shaper workspace shell.
 */

import { Undo2, X, Terminal, Pencil } from 'lucide-react';
import type { ShaperLiveImportStatus } from '../hooks/useShaperLiveImportRunner';
import type { ShaperWorkspaceDoc } from '../model/shaperTypes';

interface ShaperWorkspaceTopbarProps {
    activeDoc: ShaperWorkspaceDoc | null;
    issueCount: number;
    canUndo: boolean;
    onProjects: () => void;
    onUndo: () => void;
    onChangeZone: () => void;
    onRenameProject: () => void;
    onImportLiveRead: () => void;
    liveImportStatus: ShaperLiveImportStatus;
    showGameLog: boolean;
    onToggleGameLog: () => void;
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
    onRenameProject,
    onImportLiveRead,
    liveImportStatus,
    showGameLog,
    onToggleGameLog,
    onClose
}) => {
    return (
        <header className="shaper-topbar">
            <div>
                <span className="shaper-kicker">Builder Workspace</span>
                {activeDoc ? (
                    <h1 className="shaper-topbar-title">
                        <span className="shaper-topbar-name">{activeDoc.name}</span>
                        <button
                            type="button"
                            className="shaper-topbar-edit-icon"
                            onClick={onRenameProject}
                            title="Rename project"
                        >
                            <Pencil size={12} />
                        </button>
                        <span className="shaper-topbar-zone-info">
                            Zone {activeDoc.zoneNumber}
                            <button
                                type="button"
                                className="shaper-topbar-edit-icon"
                                style={{ marginLeft: '4px' }}
                                onClick={onChangeZone}
                                title="Change zone number"
                            >
                                <Pencil size={10} />
                            </button>
                        </span>
                    </h1>
                ) : (
                    <h1>Shaper Mode</h1>
                )}
            </div>
            <div className="shaper-topbar-status">
                {activeDoc && <button type="button" onClick={onProjects}>Projects</button>}
                {activeDoc && (
                    <button
                        type="button"
                        onClick={onUndo}
                        disabled={!canUndo}
                        className="shaper-topbar-icon-btn"
                        title="Undo (Ctrl+Z)"
                    >
                        <Undo2 size={18} />
                    </button>
                )}
                {activeDoc && <button type="button" onClick={onImportLiveRead} disabled={liveImportStatus.running}>Import Zone from MUME</button>}
                {activeDoc && liveImportStatus.running && <span>{liveImportStatus.completed}/{liveImportStatus.total || '?'}</span>}
                {activeDoc && liveImportStatus.error && <span>{liveImportStatus.error}</span>}
                {activeDoc && <span>{issueCount} issues</span>}
                {activeDoc && (
                    <button 
                        type="button" 
                        onClick={onToggleGameLog} 
                        className={`shaper-topbar-icon-btn ${showGameLog ? 'active' : ''}`} 
                        title="Toggle MUD Log"
                    >
                        <Terminal size={18} className={showGameLog ? 'text-amber-400' : ''} />
                    </button>
                )}
                <button type="button" onClick={onClose} className="shaper-topbar-icon-btn" title="Close Shaper">
                    <X size={18} />
                </button>
            </div>
        </header>
    );
};
