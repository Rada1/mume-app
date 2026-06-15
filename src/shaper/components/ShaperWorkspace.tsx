/**
 * @file ShaperWorkspace.tsx
 * @description Main privileged Shaper workspace shell and tab routing.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useShaperPresence } from '../collaboration/shaperPresence';
import { readShareCodeFromHash, useShaperSharedProjects } from '../collaboration/shaperSharedProjects';
import { useShaperWorkspace } from '../hooks/useShaperWorkspace';
import { useShaperDeployQueue } from '../hooks/useShaperDeployQueue';
import { useShaperKeyboardUndo } from '../hooks/useShaperKeyboardUndo';
import { buildSelectedRoomDeployPreview, buildZoneDeployPreview } from '../model/shaperDeployPreview';
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
import { ShaperWorkspaceTopbar } from './ShaperWorkspaceTopbar';
import type { ShaperEntityFocusSignal } from './shaperEntityFocus';
import { useRoomStore } from '../../stores/useRoomStore';
import { ShaperGameLogPanel } from './ShaperGameLogPanel';
import { useGame } from '../../context/GameContext';
import { useShaperEntityStore } from '../model/useShaperEntityStore';
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
    const { executeCommand } = useGame();
    const workspace = useShaperWorkspace({ sendCommand: executeCommand });
    const activeDoc = workspace.doc;
    const { peers } = useShaperPresence(activeDoc?.id ?? null);
    const { pullProject } = useShaperSharedProjects(workspace.openProject);
    const [activeTab, setActiveTab] = useState<'grid' | 'com' | 'mobiles' | 'objects' | 'libraries'>('grid');
    const [showComOverlay, setShowComOverlay] = useState(false);
    const [focusEntity, setFocusEntity] = useState<ShaperEntityFocusSignal | null>(null);

    useEffect(() => {
        useShaperEntityStore.getState().setExecuteCommand(executeCommand);
    }, [executeCommand]);

    const handleSelectEntity = (roomId: string, entityId: string) => {
        workspace.selectRoom(roomId);
        setFocusEntity({ id: entityId, nonce: Date.now() });
    };

    const playerRoomNum = useRoomStore(s => s.roomNum);
    const playerMapId = useRoomStore(s => s.mapId);

    const [showGameLog, setShowGameLog] = useState<boolean>(() => {
        const saved = localStorage.getItem('shaper-show-gamelog');
        return saved === 'true';
    });

    const [gameLogWidth, setGameLogWidth] = useState<number>(() => {
        const saved = localStorage.getItem('shaper-gamelog-width');
        return saved ? parseInt(saved, 10) : 400;
    });

    const [isResizingGameLog, setIsResizingGameLog] = useState(false);

    const [inspectorWidth, setInspectorWidth] = useState<number>(() => {
        const saved = localStorage.getItem('shaper-inspector-width');
        return saved ? parseInt(saved, 10) : 340;
    });
    const [isResizing, setIsResizing] = useState(false);

    const handleMouseDown = (e: React.MouseEvent) => {
        e.preventDefault();
        setIsResizing(true);
    };

    const handleGameLogMouseDown = (e: React.MouseEvent) => {
        e.preventDefault();
        setIsResizingGameLog(true);
    };

    useEffect(() => {
        if (!isResizing) return;

        const handleMouseMove = (e: MouseEvent) => {
            const minWidth = 250;
            const rightEdge = window.innerWidth - (showGameLog ? gameLogWidth + 6 : 0);
            const maxWidth = rightEdge - 550; // 260px left panel + 290px center min
            const newWidth = rightEdge - e.clientX;
            const finalWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));
            setInspectorWidth(finalWidth);
            localStorage.setItem('shaper-inspector-width', String(finalWidth));
        };

        const handleMouseUp = () => {
            setIsResizing(false);
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isResizing, showGameLog, gameLogWidth]);

    useEffect(() => {
        if (!isResizingGameLog) return;

        const handleMouseMove = (e: MouseEvent) => {
            const minWidth = 250;
            const maxWidth = window.innerWidth - 650;
            const newWidth = window.innerWidth - e.clientX;
            const finalWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));
            setGameLogWidth(finalWidth);
            localStorage.setItem('shaper-gamelog-width', String(finalWidth));
        };

        const handleMouseUp = () => {
            setIsResizingGameLog(false);
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isResizingGameLog]);

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
    const zoneDeployPreview = activeDoc
        ? buildZoneDeployPreview(activeDoc.rooms, activeDoc.exits, activeDoc.commandNodes, activeDoc.libraries)
        : { commands: [], warnings: [] };
    const deploy = useShaperDeployQueue({ send: onSendCommand, isConnected, isEditorOpen, saveEditor: onSaveEditor });
    useShaperKeyboardUndo(!!activeDoc && workspace.canUndo, workspace.undo);
    const blockingErrors = useMemo(
        () => workspace.issues.filter(issue => issue.severity === 'error').length,
        [workspace.issues]
    );
    // A single-room push should only require that room to be error-free, not the
    // whole zone. The zone push still requires every room clean (blockingErrors).
    const selectedRoomId = workspace.selectedRoom?.id;
    const roomBlockingErrors = useMemo(
        () => workspace.issues.filter(issue => issue.severity === 'error' && issue.roomId === selectedRoomId).length,
        [workspace.issues, selectedRoomId]
    );
    const changeActiveZone = () => {
        if (!activeDoc) return;
        const value = window.prompt(`Change zone number for "${activeDoc.name}" to:`, String(activeDoc.zoneNumber));
        if (!value) return;
        const parsedZone = Number(value);
        if (!Number.isInteger(parsedZone) || parsedZone < 0) window.alert('Zone number must be a non-negative whole number.');
        else if (parsedZone !== activeDoc.zoneNumber) workspace.changeProjectZone(activeDoc.id, parsedZone);
    };
    return (
        <div className="shaper-workspace" role="dialog" aria-label="Shaper workspace">
            <ShaperWorkspaceTopbar
                activeDoc={activeDoc}
                issueCount={workspace.issues.length}
                canUndo={workspace.canUndo}
                onProjects={workspace.closeProject}
                onUndo={workspace.undo}
                onChangeZone={changeActiveZone}
                onImportLiveRead={workspace.startLiveImport}
                liveImportStatus={workspace.liveImportStatus}
                showGameLog={showGameLog}
                onToggleGameLog={() => {
                    const next = !showGameLog;
                    setShowGameLog(next);
                    localStorage.setItem('shaper-show-gamelog', String(next));
                }}
                onClose={onClose}
            />
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
                    onChangeProjectZone={workspace.changeProjectZone}
                    onExportProject={workspace.exportProject}
                    onImportProject={workspace.importProject}
                />
            ) : (
                <>
                    <div 
                        className="shaper-main" 
                        style={{ 
                            gridTemplateColumns: `260px 1fr auto ${inspectorWidth}px${showGameLog ? ` auto ${gameLogWidth}px` : ''}` 
                        }}
                    >
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
                                    libraries={activeDoc.libraries}
                                    selectedRoomId={activeDoc.selectedRoomId}
                                    selectedRoomIds={workspace.selectedRoomIds}
                                    selectedConnection={workspace.selectedConnection}
                                    selectedConnectionIds={workspace.selectedConnectionIds}
                                    onSelectConnection={workspace.setSelectedConnection}
                                    onToggleSelectConnection={workspace.onToggleSelectConnection}
                                    layers={workspace.layers}
                                    viewZ={workspace.viewZ}
                                    onAddExtraRoom={workspace.addExtraRoom}
                                    onConnectDirectedExit={workspace.connectDirectedExit}
                                    onToggleExitDoor={workspace.toggleExitDoor}
                                    onSelectRoom={workspace.selectRoom}
                                    onToggleSelect={workspace.toggleSelectRoom}
                                    onSelectEntity={handleSelectEntity}
                                    onSetViewZ={workspace.setViewZ}
                                    onAddRoomAt={workspace.addRoomAt}
                                    onMoveRoom={workspace.moveRoom}
                                    onMoveRooms={workspace.moveRooms}
                                    onRemoveRoom={workspace.removeRoom}
                                    onRemoveRooms={workspace.removeRooms}
                                    showComOverlay={showComOverlay}
                                    onToggleComOverlay={() => setShowComOverlay(!showComOverlay)}
                                    playerRoomNum={playerRoomNum}
                                    playerMapId={playerMapId}
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
                        <div 
                            className={`shaper-inspector-resize-handle ${isResizing ? 'resizing' : ''}`}
                            onMouseDown={handleMouseDown}
                        />
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
                                        : [`${workspace.selectedConnection?.aId}:${workspace.selectedConnection?.dirAB}`];
                                    workspace.removeExits(ids);
                                    workspace.setSelectedConnection(null);
                                }}
                                onClose={() => workspace.setSelectedConnection(null)}
                            />
                        ) : (
                            <ShaperInspector
                                room={workspace.selectedRoom}
                                exits={activeDoc.exits}
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
                                onAddFollower={workspace.addFollower}
                                onAddObjectPut={workspace.addObjectPut}
                                onAddHiddenObject={workspace.addHiddenObject}
                                onUpdateComFields={workspace.updateComFields}
                                onAddComNode={workspace.addComNode}
                                onDeleteComNode={workspace.deleteComNode}
                                libraries={activeDoc.libraries}
                                onAddLibrary={workspace.addLibrary}
                                onRemoveLibrary={workspace.removeLibrary}
                                onSetLibraryParam={workspace.setLibraryParam}
                                onRemoveLibraryParam={workspace.removeLibraryParam}
                                onToggleLibraryLoad={workspace.toggleLibraryLoad}
                                onUpdateLibraryNotes={workspace.updateLibraryNotes}
                                onUpdateComLimit={workspace.updateComLimit}
                                onReimportRoom={() => workspace.startRoomLiveImport(workspace.selectedRoom!.roomNumber)}
                                isImporting={workspace.liveImportStatus.running}
                                isConnected={isConnected}
                                focusEntity={focusEntity}
                            />
                        )}
                        {showGameLog && (
                            <>
                                <div 
                                    className={`shaper-inspector-resize-handle ${isResizingGameLog ? 'resizing' : ''}`}
                                    onMouseDown={handleGameLogMouseDown}
                                />
                                <div style={{ width: `${gameLogWidth}px`, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                                    <ShaperGameLogPanel onClose={() => {
                                        setShowGameLog(false);
                                        localStorage.setItem('shaper-show-gamelog', 'false');
                                    }} />
                                </div>
                            </>
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
                        roomBlockingErrors={roomBlockingErrors}
                        selectedRoomId={selectedRoomId}
                        rooms={activeDoc.rooms}
                        onSelectRoom={workspace.selectRoom}
                        onStartDeploy={() => deploy.start(deployPreview.commands)}
                        zoneDeployCommands={zoneDeployPreview.commands}
                        onStartZoneDeploy={() => deploy.start(zoneDeployPreview.commands)}
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
