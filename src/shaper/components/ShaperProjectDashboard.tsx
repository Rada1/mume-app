/**
 * @file ShaperProjectDashboard.tsx
 * @description Project picker, creator, and link-based sharing for Shaper concept workspaces.
 */

import { useRef, useState } from 'react';
import { Pencil } from 'lucide-react';
import type { ShaperProjectSummary } from '../model/shaperTypes';
import './ShaperProjects.css';

interface ShaperProjectDashboardProps {
    projects: ShaperProjectSummary[];
    onCreateProject: (name: string, zoneNumber: number) => void;
    onOpenProject: (projectId: string) => void;
    onDeleteProject: (projectId: string) => void;
    onRenameProject: (projectId: string, name: string) => void;
    onChangeProjectZone: (projectId: string, zoneNumber: number) => void;
    onExportProject: (projectId: string) => void;
    onImportProject: (file: File) => Promise<void>;
}

// --- Component Section ---
export const ShaperProjectDashboard: React.FC<ShaperProjectDashboardProps> = ({
    projects,
    onCreateProject,
    onOpenProject,
    onDeleteProject,
    onRenameProject,
    onChangeProjectZone,
    onExportProject,
    onImportProject
}) => {
    const [name, setName] = useState('New Concept Zone');
    const [zoneNumber, setZoneNumber] = useState('300');
    const fileInputRef = useRef<HTMLInputElement | null>(null);

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

    const changeProjectZone = (project: ShaperProjectSummary) => {
        const value = window.prompt(`Change zone number for "${project.name}" to:`, String(project.zoneNumber));
        if (!value) return;
        const parsedZone = Number(value);
        if (!Number.isInteger(parsedZone) || parsedZone < 0) {
            window.alert('Zone number must be a non-negative whole number.');
            return;
        }
        if (parsedZone !== project.zoneNumber) onChangeProjectZone(project.id, parsedZone);
    };

    const importProject = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (!file) return;
        try {
            await onImportProject(file);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Could not import that project file.';
            window.alert(message);
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

                <h2 className="shaper-import-heading">Import project file</h2>
                <input
                    ref={fileInputRef}
                    className="shaper-file-input"
                    type="file"
                    accept=".json,.shaper.json,application/json"
                    onChange={importProject}
                />
                <button type="button" onClick={() => fileInputRef.current?.click()}>
                    Import Project
                </button>
            </section>

            <section className="shaper-project-list">
                <h2>Your projects</h2>
                {projects.length === 0 ? (
                    <p>No shaping projects yet.</p>
                ) : projects.map(project => (
                    <div key={project.id} className="shaper-project-card">
                        <div className="shaper-project-open" onClick={() => onOpenProject(project.id)}>
                            <strong>
                                {project.name}
                                <button
                                    type="button"
                                    className="shaper-edit-icon-btn"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        renameProject(project);
                                    }}
                                    title="Rename project"
                                >
                                    <Pencil size={12} />
                                </button>
                            </strong>
                            <span className="shaper-project-zone-info">
                                Zone {project.zoneNumber}
                                <button
                                    type="button"
                                    className="shaper-edit-icon-btn"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        changeProjectZone(project);
                                    }}
                                    title="Change zone number"
                                >
                                    <Pencil size={10} />
                                </button>
                            </span>
                            <small>Updated {new Date(project.updatedAt).toLocaleString()}</small>
                        </div>
                        <div className="shaper-project-actions">
                            <button type="button" onClick={() => onExportProject(project.id)}>
                                Export
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
