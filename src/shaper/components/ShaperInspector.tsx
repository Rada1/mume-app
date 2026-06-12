/**
 * @file ShaperInspector.tsx
 * @description Edits the selected Shaper room draft.
 */

import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { listShaperComRoomEntities } from '../model/shaperComCommands';
import { hasShaperExitDoor } from '../model/shaperExitFlags';
import type { ShaperAnnotation, ShaperCommandNode, ShaperRoomDraft, ShaperRoomFlag, ShaperSector, ShaperValidationIssue, ShaperExitDraft, ShaperLibraryInstall } from '../model/shaperTypes';
import { SHAPER_LIBRARY_CATALOG } from '../model/shaperLibraryCatalog';
import { ShaperAnnotations } from './ShaperAnnotations';
import { ShaperRoomEntities } from './ShaperRoomEntities';
import { ShaperDoorCard } from './ShaperDoorCard';
import type { ShaperEntityFocusSignal } from './shaperEntityFocus';

interface ShaperInspectorProps {
    room: ShaperRoomDraft;
    exits: Record<string, ShaperExitDraft>;
    commandNodes: Record<string, ShaperCommandNode>;
    issues: ShaperValidationIssue[];
    selectionCount: number;
    onUpdateRoom: (patch: Partial<ShaperRoomDraft>) => void;
    onAddAnnotation: (annotation: ShaperAnnotation) => void;
    onRemoveAnnotation: (annotationId: string) => void;
    onAddMob: (vnum: string, name: string) => void;
    onRemoveMob: (mobId: string) => void;
    onAddObject: (vnum: string, name: string) => void;
    onRemoveObject: (objectId: string) => void;
    onAddMobObject: (mobId: string, vnum: string, name: string, type: 'give' | 'equip', position?: string) => void;
    onRemoveMobObject: (mobId: string, itemId: string) => void;
    onAddFollower: (mobId: string, vnum: string, name: string) => void;
    onAddObjectPut: (containerId: string, vnum: string, name: string) => void;
    onAddHiddenObject: (vnum: string, name: string) => void;
    onUpdateComFields: (nodeId: string, patch: Record<string, any>) => void;
    onAddComNode: (roomId: string, type: any, parentId: string | null, vnum: string) => void;
    onDeleteComNode: (nodeId: string) => void;
    libraries: Record<string, ShaperLibraryInstall>;
    onAddLibrary: (targetType: any, targetId: string, name: string) => void;
    onRemoveLibrary: (id: string) => void;
    onUpdateComLimit: (nodeId: string, patch: any) => void;
    focusEntity?: ShaperEntityFocusSignal | null;
}

const sectors: ShaperSector[] = [
    'building', 'city', 'field', 'forest', 'hills', 'mountain', 'shallows',
    'water', 'road', 'rapids', 'underwater', 'brush', 'tunnel', 'cavern'
];
const flags: ShaperRoomFlag[] = [
    'dark', 'death', 'no_mob', 'indoors', 'no_ride', 'no_freeze', 'open_root',
    'no_magic', 'isolated', 'private', 'random_exits', 'map_toggle',
    'hide_map_id', 'security', 'peaceful', 'build', 'water', 'no_shout',
    'silent', 'sunlit', 'trail'
];

// --- Component Section ---
export const ShaperInspector: React.FC<ShaperInspectorProps> = ({
    room,
    exits,
    commandNodes,
    issues,
    selectionCount,
    onUpdateRoom,
    onAddAnnotation,
    onRemoveAnnotation,
    onAddMob,
    onRemoveMob,
    onAddObject,
    onRemoveObject,
    onAddMobObject,
    onRemoveMobObject,
    onAddFollower,
    onAddObjectPut,
    onAddHiddenObject,
    onUpdateComFields,
    onAddComNode,
    onDeleteComNode,
    libraries,
    onAddLibrary,
    onRemoveLibrary,
    onUpdateComLimit,
    focusEntity
}) => {
    const [flagsCollapsed, setFlagsCollapsed] = useState(false);
    const [libsCollapsed, setLibsCollapsed] = useState(true);
    const multi = selectionCount > 1;
    const roomEntities = listShaperComRoomEntities(commandNodes, room.id);
    const doors = Object.values(exits).filter(
        exit => exit.fromRoomId === room.id && hasShaperExitDoor(exit)
    );
    const roomInstalls = Object.values(libraries).filter(
        install => install.targetType === 'room' && install.targetId === room.id
    );

    const toggleLibrary = (libName: string) => {
        const existing = roomInstalls.find(install => install.name === libName);
        if (existing) {
            onRemoveLibrary(existing.id);
        } else {
            onAddLibrary('room', room.id, libName);
        }
    };
    const toggleFlag = (flag: ShaperRoomFlag) => {
        const nextFlags = room.flags.includes(flag)
            ? room.flags.filter(item => item !== flag)
            : [...room.flags, flag];
        onUpdateRoom({ flags: nextFlags });
    };

    return (
        <aside className="shaper-inspector">
            <div className="shaper-panel-heading">
                <span>Room Inspector</span>
                <strong>{room.roomNumber}</strong>
                <small>{room.kind === 'extra' ? 'Extra room' : 'Grid room'} / Layer {room.z}</small>
            </div>

            {room.inactive && (
                <div style={{ marginBottom: '14px', display: 'grid', gap: '8px' }}>
                    <div className="shaper-multi-banner" style={{ backgroundColor: 'rgba(148, 163, 184, 0.12)', borderColor: 'rgba(148, 163, 184, 0.4)', color: '#aab7c4', fontSize: '12px' }}>
                        This static 10x10 room is inactive (deleted).
                    </div>
                    <button
                        type="button"
                        onClick={() => onUpdateRoom({ inactive: false })}
                        style={{
                            backgroundColor: '#3b82f6',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '6px',
                            padding: '8px 12px',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            fontSize: '12px'
                        }}
                    >
                        Reactivate Room
                    </button>
                </div>
            )}

            {multi && (
                <div className="shaper-multi-banner">
                    Editing {selectionCount} selected rooms. Sector, flags, and other fields apply to all.
                </div>
            )}

            <div style={{ display: 'flex', gap: '10px', marginBottom: '4px' }}>
                <label className="shaper-field" style={{ width: '80px', flexShrink: 0, marginBottom: 0 }}>
                    <span>Prep</span>
                    <input 
                        value={room.preposition} 
                        onChange={event => onUpdateRoom({ preposition: event.target.value })} 
                        placeholder="in" 
                    />
                </label>
                <label className="shaper-field" style={{ flex: 1, marginBottom: 0 }}>
                    <span>Name</span>
                    <input 
                        value={room.name} 
                        onChange={event => onUpdateRoom({ name: event.target.value })} 
                        placeholder="Draft room" 
                    />
                </label>
            </div>

            <div className="shaper-helper">You are {room.preposition || '...'} {room.name || '...'}</div>

            <label className="shaper-field">
                <span>Description</span>
                <textarea
                    value={room.description}
                    onChange={event => onUpdateRoom({ description: event.target.value })}
                    rows={8}
                />
            </label>

            <label className="shaper-field">
                <span>Sector</span>
                <select value={room.sector} onChange={event => onUpdateRoom({ sector: event.target.value as ShaperSector | '' })}>
                    <option value="">Unset</option>
                    {sectors.map(sector => <option key={sector} value={sector}>{sector}</option>)}
                </select>
            </label>

            <div className="shaper-field">
                <div 
                    className="shaper-field-toggle-header" 
                    onClick={() => setFlagsCollapsed(!flagsCollapsed)}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', userSelect: 'none' }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
                        <span>Flags</span>
                        {flagsCollapsed && room.flags.length > 0 && (
                            <div className="shaper-inspector-chips">
                                {room.flags.map(f => (
                                    <span key={f} className="shaper-inspector-chip" title={f.toUpperCase()}>
                                        {f}
                                    </span>
                                ))}
                            </div>
                        )}
                        {flagsCollapsed && room.flags.length === 0 && (
                            <span style={{ fontSize: '11px', color: '#6b7785', fontWeight: 'normal' }}>
                                (none)
                            </span>
                        )}
                    </div>
                    <button type="button" style={{ background: 'none', border: 'none', color: '#aab7c4', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 0 }}>
                        {flagsCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                    </button>
                </div>
                {!flagsCollapsed && (
                    <div className="shaper-flag-grid">
                        {flags.map(flag => (
                            <label key={flag} className="shaper-flag">
                                <input type="checkbox" checked={room.flags.includes(flag)} onChange={() => toggleFlag(flag)} />
                                <span>{flag}</span>
                            </label>
                        ))}
                    </div>
                )}
            </div>

            <div className="shaper-field">
                <div 
                    className="shaper-field-toggle-header" 
                    onClick={() => setLibsCollapsed(!libsCollapsed)}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', userSelect: 'none' }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
                        <span>Room Libraries</span>
                        {libsCollapsed && roomInstalls.length > 0 && (
                            <div className="shaper-inspector-chips">
                                {roomInstalls.map(i => (
                                    <span key={i.id} className="shaper-inspector-chip" title={i.name.toUpperCase()}>
                                        {i.name}
                                    </span>
                                ))}
                            </div>
                        )}
                        {libsCollapsed && roomInstalls.length === 0 && (
                            <span style={{ fontSize: '11px', color: '#6b7785', fontWeight: 'normal' }}>
                                (none)
                            </span>
                        )}
                    </div>
                    <button type="button" style={{ background: 'none', border: 'none', color: '#aab7c4', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 0 }}>
                        {libsCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                    </button>
                </div>
                {!libsCollapsed && (
                    <div className="shaper-flag-grid" style={{ maxHeight: '180px', overflowY: 'auto', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '4px', padding: '6px', background: 'rgba(0,0,0,0.1)' }}>
                        {SHAPER_LIBRARY_CATALOG.room.map(entry => {
                            const isInstalled = roomInstalls.some(i => i.name === entry.name);
                            return (
                                <label key={entry.name} className="shaper-flag" title={entry.description}>
                                    <input 
                                        type="checkbox" 
                                        checked={isInstalled} 
                                        onChange={() => toggleLibrary(entry.name)} 
                                    />
                                    <span>{entry.name}</span>
                                </label>
                            );
                        })}
                    </div>
                )}
            </div>

            {doors.length > 0 && (
                <div className="shaper-field">
                    <span>Doors</span>
                    <div style={{ display: 'grid', gap: '8px', marginTop: '4px' }}>
                        {doors.map(door => {
                            const doorCom = Object.values(commandNodes).find(
                                node => node.roomId === room.id && node.type === 'door' && node.fields.direction === door.direction
                            );
                            return (
                                <ShaperDoorCard
                                    key={door.id}
                                    door={door}
                                    doorCom={doorCom}
                                    onAddComNode={onAddComNode}
                                    onUpdateComFields={onUpdateComFields}
                                    onDeleteComNode={onDeleteComNode}
                                />
                            );
                        })}
                    </div>
                </div>
            )}

            <ShaperRoomEntities
                mobs={roomEntities.mobs}
                objects={roomEntities.objects}
                onAddMob={onAddMob}
                onRemoveMob={onRemoveMob}
                onAddObject={onAddObject}
                onRemoveObject={onRemoveObject}
                onAddMobObject={onAddMobObject}
                onRemoveMobObject={onRemoveMobObject}
                onAddFollower={onAddFollower}
                onAddObjectPut={onAddObjectPut}
                onAddHiddenObject={onAddHiddenObject}
                onUpdateComFields={onUpdateComFields}
                onUpdateComLimit={onUpdateComLimit}
                focusEntity={focusEntity}
            />

            <label className="shaper-field">
                <span>Notes</span>
                <textarea value={room.notes} onChange={event => onUpdateRoom({ notes: event.target.value })} rows={4} />
            </label>

            <ShaperAnnotations annotations={room.annotations} onAdd={onAddAnnotation} onRemove={onRemoveAnnotation} />

            <div className="shaper-room-issues">
                <span>Selected Room Issues</span>
                {issues.length === 0 ? <p>No issues for this room.</p> : issues.map(issue => (
                    <p key={issue.id} className={`shaper-issue ${issue.severity}`}>{issue.message}</p>
                ))}
            </div>
        </aside>
    );
};
