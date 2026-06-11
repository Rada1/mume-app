/**
 * @file ShaperWorkspace.tsx
 * @description Main privileged Shaper workspace shell and tab routing.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { useShaperPresence } from '../collaboration/shaperPresence';
import { readShareCodeFromHash, useShaperSharedProjects } from '../collaboration/shaperSharedProjects';
import { useShaperWorkspace } from '../hooks/useShaperWorkspace';
import { useShaperDeployQueue } from '../hooks/useShaperDeployQueue';
import { buildSelectedRoomDeployPreview } from '../model/shaperDeployPreview';
import { ShaperBottomPanel } from './ShaperBottomPanel';
import { ShaperCanvas } from './ShaperCanvas';
import { ShaperInspector } from './ShaperInspector';
import { ShaperLeftPanel } from './ShaperLeftPanel';
import { ShaperProjectDashboard } from './ShaperProjectDashboard';
import { ShaperMobilesPanel } from './ShaperMobilesPanel';
import { ShaperObjectsPanel } from './ShaperObjectsPanel';
import { ShaperConnectionInspector } from './ShaperConnectionInspector';
import { ShaperComTreePanel } from './ShaperComTreePanel';
import { ShaperLibraryPanel } from './ShaperLibraryPanel';
import './ShaperDatabasePanels.css';
import './ShaperWorkspace.css';

interface ShaperWorkspaceProps {
    onClose: () => void;
    onSendCommand?: (command: string) => void;
    isConnected?: boolean;
    isEditorOpen?: boolean;
    onSaveEditor?: (text: string) => void;
}

// --- Component Section ---
export const ShaperWorkspace: React.FC<ShaperWorkspaceProps> = ({
    onClose,
    onSendCommand,
    isConnected = false,
    isEditorOpen = false,
    onSaveEditor
}) => {
    const workspace = useShaperWorkspace();
    const activeDoc = workspace.doc;
    const { peers } = useShaperPresence(activeDoc?.id ?? null);
    const { pullProject } = useShaperSharedProjects(workspace.openProject);
    const [activeTab, setActiveTab] = useState<'grid' | 'com' | 'mobiles' | 'objects' | 'libraries'>('grid');

    // Auto-open a project once when the page is loaded with a share link in the URL hash.
    const hashHandledRef = useRef(false);
    useEffect(() => {
        if (hashHandledRef.current) return;
        const code = readShareCodeFromHash();
        if (!code) return;
        hashHandledRef.current = true;
        pullProject(code, () =>
            window.alert('Could not load the shared project from the link. The relay may be offline or the project was unshared.'));
    }, [pullProject]);
    const deployPreview = activeDoc && workspace.selectedRoom
        ? buildSelectedRoomDeployPreview(workspace.selectedRoom, activeDoc.rooms, activeDoc.exits, activeDoc.commandNodes, activeDoc.libraries)
        : { commands: [], warnings: [] };
    const deploy = useShaperDeployQueue({ send: onSendCommand, isConnected, isEditorOpen, saveEditor: onSaveEditor });
    const blockingErrors = useMemo(
        () => workspace.issues.filter(issue => issue.severity === 'error').length,
        [workspace.issues]
    );

    return (
        <div className="shaper-workspace" role="dialog" aria-label="Shaper workspace">
            <header className="shaper-topbar">
                <div>
                    <span className="shaper-kicker">Builder Workspace</span>
                    <h1>Shaper Mode</h1>
                </div>
                <div className="shaper-topbar-status">
                    {activeDoc && <button type="button" onClick={workspace.closeProject}>Projects</button>}
                    {activeDoc && <span>Zone {activeDoc.zoneNumber}</span>}
                    {activeDoc && <span>{workspace.issues.length} issues</span>}
                    <button type="button" onClick={onClose} title="Close Shaper">
                        <X size={18} />
                    </button>
                </div>
            </header>

            {!activeDoc || !workspace.selectedRoom ? (
                <ShaperProjectDashboard
                    projects={workspace.projects}
                    onCreateProject={workspace.createProject}
                    onOpenProject={workspace.openProject}
                    onPullProject={pullProject}
                    onShareProject={workspace.shareProject}
                    onUnshareProject={workspace.unshareProject}
                    onDeleteProject={workspace.deleteProject}
                    onRenameProject={workspace.renameProject}
                />
            ) : (
                <>
                    <div className="shaper-main">
                        <ShaperLeftPanel
                            doc={activeDoc}
                            issueCount={workspace.issues.length}
                            activeTab={activeTab}
                            peers={peers}
                            onSelectTab={setActiveTab}
                        />
                        <main className="shaper-center">
                            {activeTab === 'grid' && (
                                <ShaperCanvas
                                    rooms={activeDoc.rooms}
                                    exits={activeDoc.exits}
                                    commandNodes={activeDoc.commandNodes}
                                    selectedRoomId={activeDoc.selectedRoomId}
                                    selectedRoomIds={workspace.selectedRoomIds}
                                    selectedConnection={workspace.selectedConnection}
                                    selectedConnectionIds={workspace.selectedConnectionIds}
                                    onSelectConnection={workspace.setSelectedConnection}
                                    onToggleSelectConnection={workspace.onToggleSelectConnection}
                                    layers={workspace.layers}
                                    viewZ={workspace.viewZ}
                                    onAddExtraRoom={workspace.addExtraRoom}
                                    onCycleExit={workspace.cycleExit}
                                    onConnectExits={workspace.connectExits}
                                    onConnectDirectedExit={workspace.connectDirectedExit}
                                    onToggleExitDoor={workspace.toggleExitDoor}
                                    onSelectRoom={workspace.selectRoom}
                                    onToggleSelect={workspace.toggleSelectRoom}
                                    onSetViewZ={workspace.setViewZ}
                                    onAddRoomAt={workspace.addRoomAt}
                                    onMoveRoom={workspace.moveRoom}
                                    onMoveRooms={workspace.moveRooms}
                                    onRemoveRoom={workspace.removeRoom}
                                    onRemoveRooms={workspace.removeRooms}
                                />
                            )}
                            {activeTab === 'com' && (
                                <ShaperComTreePanel
                                    room={workspace.selectedRoom}
                                    commandNodes={activeDoc.commandNodes}
                                    onAddNode={workspace.addComNode}
                                    onDeleteNode={workspace.deleteComNode}
                                    onMoveNode={workspace.moveComNode}
                                    onReparentNode={workspace.reparentComNode}
                                    onUpdateLimit={workspace.updateComLimit}
                                    onUpdateFields={workspace.updateComFields}
                                    onUpdateNode={workspace.updateComNode}
                                />
                            )}
                            {activeTab === 'mobiles' && (
                                <ShaperMobilesPanel
                                    onAddToRoom={workspace.addMob}
                                    roomLabel={workspace.selectedRoom?.roomNumber}
                                />
                            )}
                            {activeTab === 'objects' && (
                                <ShaperObjectsPanel
                                    onAddToRoom={workspace.addObject}
                                    roomLabel={workspace.selectedRoom?.roomNumber}
                                />
                            )}
                            {activeTab === 'libraries' && (
                                <ShaperLibraryPanel
                                    libraries={activeDoc.libraries}
                                    selectedRoom={workspace.selectedRoom}
                                    onAddLibrary={workspace.addLibrary}
                                    onRemoveLibrary={workspace.removeLibrary}
                                    onSetParam={workspace.setLibraryParam}
                                    onRemoveParam={workspace.removeLibraryParam}
                                    onToggleLoad={workspace.toggleLibraryLoad}
                                    onUpdateNotes={workspace.updateLibraryNotes}
                                />
                            )}
                        </main>
                        {workspace.selectedConnection ? (
                            <ShaperConnectionInspector
                                connection={workspace.selectedConnection}
                                rooms={activeDoc.rooms}
                                exits={activeDoc.exits}
                                selectionCount={workspace.selectedConnectionIds.size}
                                onUpdateExit={workspace.updateExit}
                                onDeleteConnection={() => {
                                    const ids = workspace.selectedConnectionIds.size > 0 
                                        ? [...workspace.selectedConnectionIds] 
                                        : workspace.selectedConnection 
                                            ? [`${workspace.selectedConnection.aId}:${workspace.selectedConnection.dirAB}`] 
                                            : [];
                                    workspace.removeExits(ids);
                                    workspace.setSelectedConnection(null);
                                }}
                                onClose={() => workspace.setSelectedConnection(null)}
                            />
                        ) : (
                            <ShaperInspector
                                room={workspace.selectedRoom}
                                commandNodes={activeDoc.commandNodes}
                                issues={workspace.selectedIssues}
                                selectionCount={workspace.selectedRoomIds.size}
                                onUpdateRoom={workspace.updateRoom}
                                onAddAnnotation={workspace.addAnnotation}
                                onRemoveAnnotation={workspace.removeAnnotation}
                                onAddMob={workspace.addMob}
                                onRemoveMob={workspace.removeMob}
                                onAddObject={workspace.addObject}
                                onRemoveObject={workspace.removeObject}
                                onAddMobObject={workspace.addMobObject}
                                onRemoveMobObject={workspace.removeMobObject}
                            />
                        )}
                    </div>

                    <ShaperBottomPanel
                        issues={workspace.issues}
                        deployCommands={deployPreview.commands}
                        deployWarnings={deployPreview.warnings}
                        deploySteps={deploy.steps}
                        deployAudit={deploy.audit}
                        isDeploying={deploy.isDeploying}
                        isConnected={isConnected}
                        blockingErrors={blockingErrors}
                        onStartDeploy={() => deploy.start(deployPreview.commands)}
                        onAbortDeploy={deploy.abort}
                        onClearDeploy={deploy.reset}
                        onMarkVerified={deploy.markVerified}
                        onMarkFailed={deploy.markFailed}
                    />
                </>
            )}
        </div>
    );
};
