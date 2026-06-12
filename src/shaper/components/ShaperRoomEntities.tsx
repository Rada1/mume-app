/**
 * @file ShaperRoomEntities.tsx
 * @description Card-based reset inspector for mobs and objects. Supports drag-and-drop auto-categorization.
 */

import { useState } from 'react';
import type { DragEvent } from 'react';
import { Shield, Users, HelpCircle, EyeOff, Layout } from 'lucide-react';
import type { ShaperItemRef, ShaperMobPlacement } from '../model/shaperTypes';
import { getEntityDragData, hasEntityKind } from './shaperEntityDrag';
import { ShaperEntityAddForm } from './ShaperEntityAddForm';
import { ShaperMobCard } from './ShaperMobCard';
import { ShaperObjectCard } from './ShaperObjectCard';
import { ShaperEntityFocusProvider, type ShaperEntityFocusSignal } from './shaperEntityFocus';
import './ShaperRoomEntities.css';

interface ShaperRoomEntitiesProps {
    mobs: ShaperMobPlacement[];
    objects: ShaperItemRef[];
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
    onUpdateComLimit: (nodeId: string, patch: any) => void;
    focusEntity?: ShaperEntityFocusSignal | null;
}

export const ShaperRoomEntities: React.FC<ShaperRoomEntitiesProps> = ({
    mobs,
    objects,
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
    onUpdateComLimit,
    focusEntity
}) => {
    const [dropTarget, setDropTarget] = useState<string | null>(null);

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

    const floorObjects = objects.filter(obj => obj.resetType === 'object');
    const hiddenObjects = objects.filter(obj => obj.resetType === 'hide');

    return (
        <ShaperEntityFocusProvider value={focusEntity ?? null}>
        <div className="shaper-room-entities">
            {/* Mobs List */}
            <section
                className={`shaper-entity-section ${dropTarget === 'mobs' ? 'drop-active' : ''}`}
                onDragOver={allowDrop('mobs', 'mob')}
                onDragLeave={clearDrop}
                onDrop={handleDrop('mob', onAddMob)}
            >
                <div className="shaper-entity-heading">
                    <div className="flex items-center gap-1.5">
                        <Users size={12} className="text-purple-400" />
                        <span>Mobs in Room</span>
                    </div>
                    <strong>{mobs.length}</strong>
                </div>

                <div className="grid gap-2">
                    {mobs.map(mob => (
                        <ShaperMobCard
                            key={mob.id}
                            mob={mob}
                            depth={0}
                            onRemoveMob={onRemoveMob}
                            onAddMobObject={onAddMobObject}
                            onRemoveMobObject={onRemoveMobObject}
                            onAddFollower={onAddFollower}
                            onUpdateComFields={onUpdateComFields}
                            onAddObjectPut={onAddObjectPut}
                            onUpdateComLimit={onUpdateComLimit}
                        />
                    ))}
                </div>

                <div className="shaper-mob-field-dropzone border-purple-500/20 text-purple-400/60 mt-1">
                    Drag mob template here to reset in room
                </div>
                <ShaperEntityAddForm kind="mob" label="Add mob reset" onAdd={onAddMob} />
            </section>

            {/* Objects on Floor List */}
            <section
                className={`shaper-entity-section ${dropTarget === 'ground' ? 'drop-active' : ''}`}
                onDragOver={allowDrop('ground', 'object')}
                onDragLeave={clearDrop}
                onDrop={handleDrop('object', onAddObject)}
            >
                <div className="shaper-entity-heading">
                    <div className="flex items-center gap-1.5">
                        <Layout size={12} className="text-teal-400" />
                        <span>Lying on Ground</span>
                    </div>
                    <strong>{floorObjects.length}</strong>
                </div>

                <div className="grid gap-1.5">
                    {floorObjects.map(obj => (
                        <ShaperObjectCard
                            key={obj.id}
                            item={obj}
                            onRemove={() => onRemoveObject(obj.id)}
                            onUpdateComFields={onUpdateComFields}
                            onAddObjectPut={onAddObjectPut}
                            onUpdateComLimit={onUpdateComLimit}
                        />
                    ))}
                </div>

                <div className="shaper-mob-field-dropzone border-teal-500/20 text-teal-400/60 mt-1">
                    Drag object template here to place on ground
                </div>
                <ShaperEntityAddForm kind="object" label="Add floor object" onAdd={onAddObject} />
            </section>

            {/* Hidden Objects List */}
            <section
                className={`shaper-entity-section ${dropTarget === 'hidden' ? 'drop-active' : ''}`}
                onDragOver={allowDrop('hidden', 'object')}
                onDragLeave={clearDrop}
                onDrop={handleDrop('object', onAddHiddenObject)}
            >
                <div className="shaper-entity-heading">
                    <div className="flex items-center gap-1.5">
                        <EyeOff size={12} className="text-rose-400" />
                        <span>Hidden in Room</span>
                    </div>
                    <strong>{hiddenObjects.length}</strong>
                </div>

                <div className="grid gap-1.5">
                    {hiddenObjects.map(obj => (
                        <ShaperObjectCard
                            key={obj.id}
                            item={obj}
                            onRemove={() => onRemoveObject(obj.id)}
                            onUpdateComFields={onUpdateComFields}
                            onAddObjectPut={onAddObjectPut}
                            onUpdateComLimit={onUpdateComLimit}
                        />
                    ))}
                </div>

                <div className="shaper-mob-field-dropzone border-rose-500/20 text-rose-400/60 mt-1">
                    Drag object template here to hide in room
                </div>
                <ShaperEntityAddForm kind="object" label="Add hidden object" onAdd={onAddHiddenObject} />
            </section>
        </div>
        </ShaperEntityFocusProvider>
    );
};
