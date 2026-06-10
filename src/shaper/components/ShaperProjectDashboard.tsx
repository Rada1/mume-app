/**
 * @file ShaperProjectDashboard.tsx
 * @description Project picker and creator for Shaper concept workspaces.
 */

import { useState } from 'react';
import type { ShaperProjectSummary } from '../model/shaperTypes';
import './ShaperProjects.css';

interface ShaperProjectDashboardProps {
    projects: ShaperProjectSummary[];
    onCreateProject: (name: string, zoneNumber: number) => void;
    onOpenProject: (projectId: string) => void;
    onDeleteProject: (projectId: string) => void;
    onRenameProject: (projectId: string, name: string) => void;
}

// --- Component Section ---
export const ShaperProjectDashboard: React.FC<ShaperProjectDashboardProps> = ({
    projects,
    onCreateProject,
    onOpenProject,
    onDeleteProject,
    onRenameProject
}) => {
    const [name, setName] = useState('New Concept Zone');
    const [zoneNumber, setZoneNumber] = useState('300');

    const submit = (event: React.FormEvent) => {
        event.preventDefault();
        const parsedZone = Number(zoneNumber);
        if (!name.trim() || !Number.isFinite(parsedZone)) return;
        onCreateProject(name.trim(), parsedZone);
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
            </section>

            <section className="shaper-project-list">
                <h2>Existing projects</h2>
                {projects.length === 0 ? (
                    <p>No shaping projects yet.</p>
                ) : projects.map(project => (
                    <div key={project.id} className="shaper-project-card">
                        <button type="button" className="shaper-project-open" onClick={() => onOpenProject(project.id)}>
                            <strong>{project.name}</strong>
                            <span>Zone {project.zoneNumber}</span>
                            <small>Updated {new Date(project.updatedAt).toLocaleString()}</small>
                        </button>
                        <button type="button" className="shaper-project-rename" onClick={() => renameProject(project)}>
                            Rename
                        </button>
                        <button type="button" className="shaper-project-delete" onClick={() => deleteProject(project)}>
                            Delete
                        </button>
                    </div>
                ))}
            </section>
        </main>
    );
};
