/**
 * @file ShaperRoomEntities.tsx
 * @description Per-room reset content: mobs in the room, objects loaded on each
 *              mob, and objects lying in the room. Lives in the room inspector.
 */

import { useState } from 'react';
import type { DragEvent } from 'react';
import { ChevronDown, ChevronRight, X } from 'lucide-react';
import type { ShaperItemRef, ShaperMobPlacement } from '../model/shaperTypes';
import { getEntityDragData, hasEntityKind } from './shaperEntityDrag';
import { ShaperEntityAddForm } from './ShaperEntityAddForm';
import './ShaperRoomEntities.css';

interface ShaperRoomEntitiesProps {
    mobs: ShaperMobPlacement[];
    objects: ShaperItemRef[];
    onAddMob: (vnum: string, name: string) => void;
    onRemoveMob: (mobId: string) => void;
    onAddObject: (vnum: string, name: string) => void;
    onRemoveObject: (objectId: string) => void;
    onAddMobObject: (mobId: string, vnum: string, name: string) => void;
    onRemoveMobObject: (mobId: string, itemId: string) => void;
}

// --- Component Section ---
export const ShaperRoomEntities: React.FC<ShaperRoomEntitiesProps> = ({
    mobs,
    objects,
    onAddMob,
    onRemoveMob,
    onAddObject,
    onRemoveObject,
    onAddMobObject,
    onRemoveMobObject
}) => {
    const [expandedMobId, setExpandedMobId] = useState<string | null>(null);
    // Which drop zone is currently hovered during a drag ('mobs' | 'objects' | mobId).
    const [dropTarget, setDropTarget] = useState<string | null>(null);

    // Allow a drop and highlight the zone only when the drag carries the kind it accepts.
    const allowDrop = (zone: string, accepts: 'mob' | 'object') => (e: DragEvent) => {
        if (!hasEntityKind(e, accepts)) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
        setDropTarget(zone);
    };

    const handleDrop = (accepts: 'mob' | 'object', onMatch: (vnum: string, name: string) => void) => (e: DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDropTarget(null);
        const data = getEntityDragData(e);
        if (data && data.kind === accepts) onMatch(data.vnum, data.name);
    };

    const clearDrop = () => setDropTarget(null);

    return (
        <div className="shaper-room-entities">
            <section
                className={`shaper-entity-section ${dropTarget === 'mobs' ? 'drop-active' : ''}`}
                onDragOver={allowDrop('mobs', 'mob')}
                onDragLeave={clearDrop}
                onDrop={handleDrop('mob', onAddMob)}
            >
                <div className="shaper-entity-heading">
                    <span>Mobs in Room</span>
                    <strong>{mobs.length}</strong>
                </div>

                {mobs.length === 0 && <p className="shaper-entity-empty">No mobs yet. Drag a mob here or use +.</p>}

                {mobs.map(mob => {
                    const expanded = expandedMobId === mob.id;
                    return (
                        <div
                            key={mob.id}
                            className={`shaper-entity-row mob ${expanded ? 'expanded' : ''} ${dropTarget === mob.id ? 'drop-active' : ''}`}
                            onDragOver={allowDrop(mob.id, 'object')}
                            onDragLeave={clearDrop}
                            onDrop={handleDrop('object', (v, n) => onAddMobObject(mob.id, v, n))}
                            title="Drop an object here to load it on this mob"
                        >
                            <div className="shaper-entity-line">
                                <button
                                    type="button"
                                    className="shaper-entity-toggle"
                                    onClick={() => setExpandedMobId(expanded ? null : mob.id)}
                                    title="Show loaded objects"
                                >
                                    {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                    {mob.vnum && <span className="shaper-entity-vnum">{mob.vnum}</span>}
                                    <span className="shaper-entity-name">{mob.name || 'unnamed mob'}</span>
                                    {mob.items.length > 0 && <span className="shaper-entity-count">{mob.items.length}</span>}
                                </button>
                                <button type="button" className="shaper-entity-remove" onClick={() => onRemoveMob(mob.id)} title="Remove mob">
                                    <X size={13} />
                                </button>
                            </div>

                            {expanded && (
                                <div className="shaper-entity-children">
                                    <div className="shaper-entity-subheading">Objects on this mob</div>
                                    {mob.items.length === 0 && <p className="shaper-entity-empty">Nothing loaded.</p>}
                                    {mob.items.map(item => (
                                        <div key={item.id} className="shaper-entity-line sub">
                                            {item.vnum && <span className="shaper-entity-vnum">{item.vnum}</span>}
                                            <span className="shaper-entity-name">{item.name || 'unnamed object'}</span>
                                            <button type="button" className="shaper-entity-remove" onClick={() => onRemoveMobObject(mob.id, item.id)} title="Remove object">
                                                <X size={13} />
                                            </button>
                                        </div>
                                    ))}
                                    <ShaperEntityAddForm kind="object" label="Add object to mob" onAdd={(v, n) => onAddMobObject(mob.id, v, n)} />
                                </div>
                            )}
                        </div>
                    );
                })}

                <ShaperEntityAddForm kind="mob" label="Add mob" onAdd={onAddMob} />
            </section>

            <section
                className={`shaper-entity-section ${dropTarget === 'objects' ? 'drop-active' : ''}`}
                onDragOver={allowDrop('objects', 'object')}
                onDragLeave={clearDrop}
                onDrop={handleDrop('object', onAddObject)}
            >
                <div className="shaper-entity-heading">
                    <span>Objects in Room</span>
                    <strong>{objects.length}</strong>
                </div>

                {objects.length === 0 && <p className="shaper-entity-empty">No objects yet. Drag an object here or use +.</p>}

                {objects.map(obj => (
                    <div key={obj.id} className="shaper-entity-line">
                        {obj.vnum && <span className="shaper-entity-vnum">{obj.vnum}</span>}
                        <span className="shaper-entity-name">{obj.name || 'unnamed object'}</span>
                        <button type="button" className="shaper-entity-remove" onClick={() => onRemoveObject(obj.id)} title="Remove object">
                            <X size={13} />
                        </button>
                    </div>
                ))}

                <ShaperEntityAddForm kind="object" label="Add object" onAdd={onAddObject} />
            </section>
        </div>
    );
};
