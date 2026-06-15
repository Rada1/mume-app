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
import { useShaperKeyboardUndo } from '../hooks/useShaperKeyboardUndo';
import { buildMultiRoomDeployPreview, buildSelectedRoomDeployPreview, buildZoneDeployPreview } from '../model/shaperDeployPreview';
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
import { ShaperZoneInfoPanel } from './ShaperZoneInfoPanel';
import { ShaperHelpPanel } from './ShaperHelpPanel';
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
    
    const [openPanels, setOpenPanels] = useState<Record<string, boolean>>(() => {
        const saved = localStorage.getItem('shaper-open-panels');
        return saved ? JSON.parse(saved) : { grid: true };
    });

    const togglePanel = (panel: string) => {
        setOpenPanels(prev => {
            const next = { ...prev, [panel]: !prev[panel] };
            localStorage.setItem('shaper-open-panels', JSON.stringify(next));
            return next;
        });
    };

    const [comWidth, setComWidth] = useState<number>(() => {
        const saved = localStorage.getItem('shaper-panel-width-com');
        return saved ? parseInt(saved, 10) : 360;
    });
    const [mobilesWidth, setMobilesWidth] = useState<number>(() => {
        const saved = localStorage.getItem('shaper-panel-width-mobiles');
        return saved ? parseInt(saved, 10) : 300;
    });
    const [objectsWidth, setObjectsWidth] = useState<number>(() => {
        const saved = localStorage.getItem('shaper-panel-width-objects');
        return saved ? parseInt(saved, 10) : 300;
    });
    const [libsWidth, setLibsWidth] = useState<number>(() => {
        const saved = localStorage.getItem('shaper-panel-width-libs');
        return saved ? parseInt(saved, 10) : 320;
    });
    const [zoneInfoWidth, setZoneInfoWidth] = useState<number>(() => {
        const saved = localStorage.getItem('shaper-panel-width-zoneInfo');
        return saved ? parseInt(saved, 10) : 400;
    });
    const [helpWidth, setHelpWidth] = useState<number>(() => {
        const saved = localStorage.getItem('shaper-panel-width-help');
        return saved ? parseInt(saved, 10) : 400;
    });

    const [resizingPanel, setResizingPanel] = useState<string | null>(null);
    const resizeRef = useRef<{ panel: string; startWidth: number; startX: number } | null>(null);

    const handlePanelResizeMouseDown = (e: React.MouseEvent, panelName: string, currentWidth: number) => {
        e.preventDefault();
        resizeRef.current = { panel: panelName, startWidth: currentWidth, startX: e.clientX };
        setResizingPanel(panelName);
    };

    useEffect(() => {
        if (!resizingPanel) return;

        const handleMouseMove = (e: MouseEvent) => {
            if (!resizeRef.current) return;
            const { panel, startWidth, startX } = resizeRef.current;
            const delta = e.clientX - startX;
            const newWidth = Math.max(150, startWidth - delta);
            if (panel === 'com') {
                setComWidth(newWidth);
                localStorage.setItem('shaper-panel-width-com', String(newWidth));
            } else if (panel === 'mobiles') {
                setMobilesWidth(newWidth);
                localStorage.setItem('shaper-panel-width-mobiles', String(newWidth));
            } else if (panel === 'objects') {
                setObjectsWidth(newWidth);
                localStorage.setItem('shaper-panel-width-objects', String(newWidth));
            } else if (panel === 'libraries') {
                setLibsWidth(newWidth);
                localStorage.setItem('shaper-panel-width-libs', String(newWidth));
            } else if (panel === 'info') {
                setZoneInfoWidth(newWidth);
                localStorage.setItem('shaper-panel-width-zoneInfo', String(newWidth));
            } else if (panel === 'help') {
                setHelpWidth(newWidth);
                localStorage.setItem('shaper-panel-width-help', String(newWidth));
            }
        };

        const handleMouseUp = () => {
            setResizingPanel(null);
            resizeRef.current = null;
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [resizingPanel]);

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
    // 2+ rooms selected → "Send Room to MUME" pushes every selected room.
    const isMultiRoomDeploy = workspace.selectedRoomIds.size > 1;
    const deployPreview = activeDoc
        ? (isMultiRoomDeploy
            ? buildMultiRoomDeployPreview(workspace.selectedRoomIds, activeDoc.rooms, activeDoc.exits, activeDoc.commandNodes, activeDoc.libraries)
            : workspace.selectedRoom
                ? buildSelectedRoomDeployPreview(workspace.selectedRoom, activeDoc.rooms, activeDoc.exits, activeDoc.commandNodes, activeDoc.libraries)
                : { commands: [], warnings: [] })
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
    // A room push should only require the pushed room(s) to be error-free, not
    // the whole zone. The zone push still requires every room clean
    // (blockingErrors). For a multi-select push, count errors across all
    // selected rooms.
    const selectedRoomId = workspace.selectedRoom?.id;
    const roomBlockingErrors = useMemo(() => {
        const deployRoomIds = isMultiRoomDeploy
            ? workspace.selectedRoomIds
            : new Set(selectedRoomId ? [selectedRoomId] : []);
        return workspace.issues.filter(issue =>
            issue.severity === 'error' && !!issue.roomId && deployRoomIds.has(issue.roomId)).length;
    }, [workspace.issues, workspace.selectedRoomIds, selectedRoomId, isMultiRoomDeploy]);
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
                            openPanels={openPanels}
                            peers={peers}
                            onTogglePanel={togglePanel}
                        />
                        <main className="shaper-center">
                            {(() => {
                                const openKeys = Object.entries(openPanels)
                                    .filter(([, open]) => open)
                                    .map(([key]) => key);

                                const flexPanel = openKeys.includes('grid') ? 'grid' : openKeys[0] || null;

                                if (openKeys.length === 0) {
                                    return (
                                        <div className="shaper-center-placeholder">
                                            <p>Select a tool from the left panel to open it.</p>
                                        </div>
                                    );
                                }

                                return openKeys.map((panelKey, index) => {
                                    const isFlex = panelKey === flexPanel;
                                    const panelWidth = panelKey === 'com' ? comWidth : panelKey === 'mobiles' ? mobilesWidth : panelKey === 'objects' ? objectsWidth : panelKey === 'libraries' ? libsWidth : panelKey === 'info' ? zoneInfoWidth : helpWidth;

                                    const wrapperStyle: React.CSSProperties = isFlex
                                        ? { flex: '1 1 0%', minWidth: '300px', display: 'flex', flexDirection: 'row', height: '100%' }
                                        : { width: `${panelWidth}px`, flexShrink: 0, display: 'flex', flexDirection: 'row', height: '100%' };

                                    const paneStyle: React.CSSProperties = { flex: '1 1 0%', minWidth: 0, height: '100%', borderRight: 'none' };

                                    const renderResizer = index > 0;

                                    return (
                                        <div key={panelKey} style={wrapperStyle}>
                                            {renderResizer && (
                                                <div 
                                                    className="shaper-panel-resize-handle"
                                                    onMouseDown={(e) => handlePanelResizeMouseDown(e, panelKey, panelWidth)}
                                                />
                                            )}
                                            <div className="shaper-workspace-pane" style={paneStyle}>
                                                {panelKey === 'grid' && (
                                                    <>
                                                        <div className="shaper-pane-header">
                                                            <h3>Concept Grid</h3>
                                                            <button type="button" className="shaper-pane-close" onClick={() => togglePanel('grid')}>
                                                                <X size={14} />
                                                            </button>
                                                        </div>
                                                        <div className="shaper-pane-content" style={{ padding: 0 }}>
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
                                                        </div>
                                                    </>
                                                )}
                                                {panelKey === 'com' && (
                                                    <>
                                                        <div className="shaper-pane-header">
                                                            <h3>/com Trees</h3>
                                                            <button type="button" className="shaper-pane-close" onClick={() => togglePanel('com')}>
                                                                <X size={14} />
                                                            </button>
                                                        </div>
                                                        <div className="shaper-pane-content">
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
                                                        </div>
                                                    </>
                                                )}
                                                {panelKey === 'mobiles' && (
                                                    <>
                                                        <div className="shaper-pane-header">
                                                            <h3>Mobiles</h3>
                                                            <button type="button" className="shaper-pane-close" onClick={() => togglePanel('mobiles')}>
                                                                <X size={14} />
                                                            </button>
                                                        </div>
                                                        <div className="shaper-pane-content">
                                                            <ShaperMobilesPanel
                                                                onAddToRoom={workspace.addMob}
                                                                roomLabel={workspace.selectedRoom?.roomNumber}
                                                            />
                                                        </div>
                                                    </>
                                                )}
                                                {panelKey === 'objects' && (
                                                    <>
                                                        <div className="shaper-pane-header">
                                                            <h3>Objects</h3>
                                                            <button type="button" className="shaper-pane-close" onClick={() => togglePanel('objects')}>
                                                                <X size={14} />
                                                            </button>
                                                        </div>
                                                        <div className="shaper-pane-content">
                                                            <ShaperObjectsPanel
                                                                onAddToRoom={workspace.addObject}
                                                                roomLabel={workspace.selectedRoom?.roomNumber}
                                                            />
                                                        </div>
                                                    </>
                                                )}
                                                {panelKey === 'libraries' && (
                                                    <>
                                                        <div className="shaper-pane-header">
                                                            <h3>Libs</h3>
                                                            <button type="button" className="shaper-pane-close" onClick={() => togglePanel('libraries')}>
                                                                <X size={14} />
                                                            </button>
                                                        </div>
                                                        <div className="shaper-pane-content">
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
                                                        </div>
                                                    </>
                                                )}
                                                {panelKey === 'info' && (
                                                    <>
                                                        <div className="shaper-pane-header">
                                                            <h3>Keywords</h3>
                                                            <button type="button" className="shaper-pane-close" onClick={() => togglePanel('info')}>
                                                                <X size={14} />
                                                            </button>
                                                        </div>
                                                        <div className="shaper-pane-content">
                                                            <ShaperZoneInfoPanel
                                                                doc={activeDoc}
                                                                viewZ={workspace.viewZ}
                                                                onAddKeyword={workspace.addZoneKeyword}
                                                                onUpdateKeyword={workspace.updateZoneKeyword}
                                                                onDeleteKeyword={workspace.deleteZoneKeyword}
                                                                onRefreshKeyword={workspace.startKeywordLiveImport}
                                                                onDiscoverKeywords={workspace.startKeywordListLiveImport}
                                                                importableKeywords={workspace.liveImportKeywordOptions}
                                                                onImportAsciiMap={(text) => workspace.importAsciiMap(text, workspace.viewZ)}
                                                                onDeployKeyword={(keyword, body) => {
                                                                    if (!activeDoc) return;
                                                                    const commands = [
                                                                        `/info zone ${activeDoc.zoneNumber} ${keyword} edit`,
                                                                        ...body.split(/\r?\n/).map(line => `  ${line}`),
                                                                        '  [save editor]'
                                                                    ];
                                                                    deploy.start(commands);
                                                                }}
                                                                isImporting={workspace.liveImportStatus.running}
                                                                isConnected={isConnected}
                                                            />
                                                        </div>
                                                    </>
                                                )}
                                                {panelKey === 'help' && (
                                                    <>
                                                        <div className="shaper-pane-header">
                                                            <h3>Guides & Help</h3>
                                                            <button type="button" className="shaper-pane-close" onClick={() => togglePanel('help')}>
                                                                <X size={14} />
                                                            </button>
                                                        </div>
                                                        <div className="shaper-pane-content" style={{ padding: 0 }}>
                                                            <ShaperHelpPanel />
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    );
                                });
                            })()}
                        </main>
                        <div 
                            className={`shaper-inspector-resize-handle ${isResizing ? 'resizing' : ''}`}
                            onMouseDown={handleMouseDown}
                        />
                        {workspace.selectedConnection ? (
                            <ShaperConnectionInspector
                                doc={activeDoc}
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
                                doc={activeDoc}
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
                        deployRoomCount={isMultiRoomDeploy ? workspace.selectedRoomIds.size : 1}
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
