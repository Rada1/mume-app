/**
 * @file ShaperInspector.tsx
 * @description Edits the selected Shaper room draft.
 */

import { listShaperComRoomEntities } from '../model/shaperComCommands';
import type { ShaperAnnotation, ShaperCommandNode, ShaperRoomDraft, ShaperRoomFlag, ShaperSector, ShaperValidationIssue } from '../model/shaperTypes';
import { ShaperAnnotations } from './ShaperAnnotations';
import { ShaperRoomEntities } from './ShaperRoomEntities';

interface ShaperInspectorProps {
    room: ShaperRoomDraft;
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
    onAddMobObject: (mobId: string, vnum: string, name: string) => void;
    onRemoveMobObject: (mobId: string, itemId: string) => void;
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
    onRemoveMobObject
}) => {
    const multi = selectionCount > 1;
    const roomEntities = listShaperComRoomEntities(commandNodes, room.id);
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

            <label className="shaper-field">
                <span>Name</span>
                <input value={room.name} onChange={event => onUpdateRoom({ name: event.target.value })} />
            </label>

            <label className="shaper-field">
                <span>Preposition</span>
                <input value={room.preposition} onChange={event => onUpdateRoom({ preposition: event.target.value })} />
            </label>

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
                <span>Flags</span>
                <div className="shaper-flag-grid">
                    {flags.map(flag => (
                        <label key={flag} className="shaper-flag">
                            <input type="checkbox" checked={room.flags.includes(flag)} onChange={() => toggleFlag(flag)} />
                            <span>{flag}</span>
                        </label>
                    ))}
                </div>
            </div>

            <label className="shaper-field">
                <span>Notes</span>
                <textarea value={room.notes} onChange={event => onUpdateRoom({ notes: event.target.value })} rows={4} />
            </label>

            <ShaperAnnotations annotations={room.annotations} onAdd={onAddAnnotation} onRemove={onRemoveAnnotation} />

            <ShaperRoomEntities
                mobs={roomEntities.mobs}
                objects={roomEntities.objects}
                onAddMob={onAddMob}
                onRemoveMob={onRemoveMob}
                onAddObject={onAddObject}
                onRemoveObject={onRemoveObject}
                onAddMobObject={onAddMobObject}
                onRemoveMobObject={onRemoveMobObject}
            />

            <div className="shaper-room-issues">
                <span>Selected Room Issues</span>
                {issues.length === 0 ? <p>No issues for this room.</p> : issues.map(issue => (
                    <p key={issue.id} className={`shaper-issue ${issue.severity}`}>{issue.message}</p>
                ))}
            </div>
        </aside>
    );
};
