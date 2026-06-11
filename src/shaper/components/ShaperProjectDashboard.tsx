/**
 * @file ShaperProjectDashboard.tsx
 * @description Project picker, creator, and link-based sharing for Shaper concept workspaces.
 */

import { useState } from 'react';
import { buildShaperShareLink, parseShaperShareCode } from '../collaboration/shaperSharedProjects';
import { isShaperSyncConfigured } from '../model/shaperProjectSync';
import type { ShaperProjectSummary } from '../model/shaperTypes';
import './ShaperProjects.css';

interface ShaperProjectDashboardProps {
    projects: ShaperProjectSummary[];
    onCreateProject: (name: string, zoneNumber: number) => void;
    onOpenProject: (projectId: string) => void;
    onPullProject: (projectId: string, onFail?: () => void) => void;
    onShareProject: (projectId: string) => void;
    onUnshareProject: (projectId: string) => void;
    onDeleteProject: (projectId: string) => void;
    onRenameProject: (projectId: string, name: string) => void;
}

// --- Component Section ---
export const ShaperProjectDashboard: React.FC<ShaperProjectDashboardProps> = ({
    projects,
    onCreateProject,
    onOpenProject,
    onPullProject,
    onShareProject,
    onUnshareProject,
    onDeleteProject,
    onRenameProject
}) => {
    const [name, setName] = useState('New Concept Zone');
    const [zoneNumber, setZoneNumber] = useState('300');
    const [linkInput, setLinkInput] = useState('');
    const syncConfigured = isShaperSyncConfigured();

    const submit = (event: React.FormEvent) => {
        event.preventDefault();
        const parsedZone = Number(zoneNumber);
        if (!name.trim() || !Number.isFinite(parsedZone)) return;
        onCreateProject(name.trim(), parsedZone);
    };

    const openSharedLink = (event: React.FormEvent) => {
        event.preventDefault();
        const projectId = parseShaperShareCode(linkInput);
        if (!projectId) {
            window.alert('That does not look like a valid project link or code.');
            return;
        }
        if (!syncConfigured) {
            window.alert('No sync relay is configured (VITE_SHAPER_SYNC_URL), so shared projects cannot be loaded.');
            return;
        }
        onPullProject(projectId, () =>
            window.alert('Could not load that project. The link may be wrong, the project was unshared, or the relay is offline.'));
        setLinkInput('');
    };

    const shareProject = (project: ShaperProjectSummary) => {
        if (!syncConfigured) {
            window.alert('No sync relay is configured (VITE_SHAPER_SYNC_URL), so sharing will not reach other devices.');
            return;
        }
        onShareProject(project.id);
    };

    const copyLink = async (project: ShaperProjectSummary) => {
        const link = buildShaperShareLink(project.id);
        try {
            await navigator.clipboard.writeText(link);
            window.alert('Share link copied to clipboard.');
        } catch {
            window.prompt('Copy this share link:', link);
        }
    };

    const deleteProject = (project: ShaperProjectSummary) => {
        const confirmed = window.confirm(`Delete shaping project "${project.name}"? This cannot be undone.`);
        if (confirmed) onDeleteProject(project.id);
    };

    const renameProject = (project: ShaperProjectSummary) => {
        const newName = window.prompt(`Rename project "${project.name}" to:`, project.name);
        if (newName && newName.trim() && newName.trim() !== project.name) {
            onRenameProject(project.id, newName.trim());
        }
    };

    return (
        <main className="shaper-project-dashboard">
            <section className="shaper-project-create">
                <span className="shaper-kicker">Project Dashboard</span>
                <h2>Create shaping project</h2>
                <form onSubmit={submit}>
                    <label className="shaper-field">
                        <span>Project name</span>
                        <input value={name} onChange={event => setName(event.target.value)} />
                    </label>
                    <label className="shaper-field">
                        <span>Zone number</span>
                        <input value={zoneNumber} onChange={event => setZoneNumber(event.target.value)} />
                    </label>
                    <button type="submit">Create Project</button>
                </form>

                <h2 className="shaper-open-shared-heading">Open shared project</h2>
                {!syncConfigured && (
                    <p className="shaper-sync-warning">
                        No sync relay configured. Set <code>VITE_SHAPER_SYNC_URL</code> and run the relay
                        to share projects across devices.
                    </p>
                )}
                <form onSubmit={openSharedLink}>
                    <label className="shaper-field">
                        <span>Paste a project link or code</span>
                        <input
                            value={linkInput}
                            placeholder="https://…#shaper-project=…"
                            onChange={event => setLinkInput(event.target.value)}
                        />
                    </label>
                    <button type="submit">Open Link</button>
                </form>
            </section>

            <section className="shaper-project-list">
                <h2>Your projects</h2>
                {projects.length === 0 ? (
                    <p>No shaping projects yet.</p>
                ) : projects.map(project => (
                    <div key={project.id} className="shaper-project-card">
                        <button type="button" className="shaper-project-open" onClick={() => onOpenProject(project.id)}>
                            <strong>
                                {project.name}
                                {project.shared && <span className="shaper-project-shared-tag">Shared</span>}
                            </strong>
                            <span>Zone {project.zoneNumber}</span>
                            <small>Updated {new Date(project.updatedAt).toLocaleString()}</small>
                        </button>
                        <div className="shaper-project-actions">
                            {project.shared ? (
                                <>
                                    <button type="button" onClick={() => copyLink(project)}>Copy link</button>
                                    <button type="button" onClick={() => onUnshareProject(project.id)}>Unshare</button>
                                </>
                            ) : (
                                <button type="button" onClick={() => shareProject(project)}>Share</button>
                            )}
                            <button type="button" className="shaper-project-rename" onClick={() => renameProject(project)}>
                                Rename
                            </button>
                            <button type="button" className="shaper-project-delete" onClick={() => deleteProject(project)}>
                                Delete
                            </button>
                        </div>
                    </div>
                ))}
            </section>
        </main>
    );
};
