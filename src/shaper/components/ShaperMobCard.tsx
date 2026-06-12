/**
 * @file ShaperMobCard.tsx
 * @description Collapsible card for placed mobs, exposing Equip, Inventory, and Follower zones.
 */

import { useEffect, useRef, useState } from 'react';
import type { DragEvent } from 'react';
import { ChevronDown, ChevronRight, X, Shield, Briefcase, Users } from 'lucide-react';
import type { ShaperItemRef, ShaperMobPlacement } from '../model/shaperTypes';
import { useShaperEntityFocus, useShaperEntityFocusSignal } from './shaperEntityFocus';

// All command-node ids beneath a mob (its items + their contents, plus followers).
const collectMobDescendantIds = (mob: ShaperMobPlacement): Set<string> => {
    const ids = new Set<string>([mob.id]);
    const addItem = (item: ShaperItemRef) => {
        ids.add(item.id);
        item.contents?.forEach(addItem);
    };
    mob.items.forEach(addItem);
    mob.followers?.forEach(follower => collectMobDescendantIds(follower).forEach(id => ids.add(id)));
    return ids;
};
import { getEntityDragData, hasEntityKind } from './shaperEntityDrag';
import { ShaperObjectCard } from './ShaperObjectCard';
import { ShaperEntityAddForm } from './ShaperEntityAddForm';

interface ShaperMobCardProps {
    mob: ShaperMobPlacement;
    depth: number;
    onRemoveMob: (mobId: string) => void;
    onAddMobObject: (mobId: string, vnum: string, name: string, type: 'give' | 'equip', position?: string) => void;
    onRemoveMobObject: (mobId: string, itemId: string) => void;
    onAddFollower: (mobId: string, vnum: string, name: string) => void;
    onUpdateComFields: (nodeId: string, patch: Record<string, any>) => void;
    onAddObjectPut: (containerId: string, vnum: string, name: string) => void;
    onUpdateComLimit: (nodeId: string, patch: any) => void;
}

export const ShaperMobCard: React.FC<ShaperMobCardProps> = ({
    mob,
    depth,
    onRemoveMob,
    onAddMobObject,
    onRemoveMobObject,
    onAddFollower,
    onUpdateComFields,
    onAddObjectPut,
    onUpdateComLimit
}) => {
    const [expanded, setExpanded] = useState(false);
    const [dropTarget, setDropTarget] = useState<string | null>(null);
    const { ref: focusRef, focused } = useShaperEntityFocus(mob.id);
    const focusSignal = useShaperEntityFocusSignal();

    // Expand when this mob, or one of its nested items/followers, is focused.
    useEffect(() => {
        if (focusSignal && collectMobDescendantIds(mob).has(focusSignal.id)) setExpanded(true);
    }, [focusSignal, mob]);

    const allowDrop = (zoneKey: string, accepts: 'mob' | 'object') => (e: DragEvent) => {
        if (!hasEntityKind(e, accepts)) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
        setDropTarget(zoneKey);
    };

    const handleDrop = (accepts: 'mob' | 'object', onMatch: (vnum: string, name: string) => void) => (e: DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDropTarget(null);
        const data = getEntityDragData(e);
        if (data && data.kind === accepts) onMatch(data.vnum, data.name);
    };

    const clearDrop = () => setDropTarget(null);

    const equippedItems = mob.items.filter(item => item.resetType === 'equip');
    const carriedItems = mob.items.filter(item => item.resetType === 'give');
    const followers = mob.followers || [];

    const totalCount = equippedItems.length + carriedItems.length + followers.length;

    return (
        <div
            ref={focusRef}
            className={`shaper-entity-row mob ${expanded ? 'expanded' : ''} ${focused ? 'focused' : ''}`}
            style={{ marginLeft: depth > 0 ? `${depth * 10}px` : undefined }}
        >
            <div className="shaper-entity-line">
                <button
                    type="button"
                    className="shaper-entity-toggle"
                    onClick={() => setExpanded(!expanded)}
                    title="Toggle details"
                >
                    {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    {mob.vnum && <span className="shaper-entity-vnum">{mob.vnum}</span>}
                    <span className="shaper-entity-name">{mob.name || 'unnamed mob'}</span>
                    {mob.resetType && (
                        <span className={`shaper-entity-reset-badge ${mob.resetType}`}>
                            {mob.resetType === 'follow' ? 'FOLLOW' : 'MOB'}
                        </span>
                    )}
                    {totalCount > 0 && <span className="shaper-entity-count">{totalCount}</span>}
                </button>
                <button
                    type="button"
                    className="shaper-entity-remove"
                    onClick={() => onRemoveMob(mob.id)}
                    title="Remove mob"
                >
                    <X size={13} />
                </button>
            </div>

            {expanded && (
                <div className="shaper-entity-children font-sans">
                    {/* Limit / Chance Row */}
                    <div className="shaper-com-limits" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px', marginBottom: '8px', padding: '0 4px' }}>
                        <label className="shaper-field mb-0">
                            <span>World</span>
                            <input 
                                type="number" 
                                min={0} 
                                max={99} 
                                value={mob.limit?.world ?? ''} 
                                onChange={e => {
                                    const val = e.target.value.trim() === '' ? null : Number(e.target.value);
                                    onUpdateComLimit(mob.id, { world: val });
                                }} 
                                placeholder="none"
                            />
                        </label>
                        <label className="shaper-field mb-0">
                            <span>Zone</span>
                            <input 
                                type="number" 
                                min={0} 
                                max={99} 
                                value={mob.limit?.zone ?? ''} 
                                onChange={e => {
                                    const val = e.target.value.trim() === '' ? null : Number(e.target.value);
                                    onUpdateComLimit(mob.id, { zone: val });
                                }} 
                                placeholder="none"
                            />
                        </label>
                        <label className="shaper-field mb-0">
                            <span>Room</span>
                            <input 
                                type="number" 
                                min={0} 
                                max={99} 
                                value={mob.limit?.room ?? ''} 
                                onChange={e => {
                                    const val = e.target.value.trim() === '' ? null : Number(e.target.value);
                                    onUpdateComLimit(mob.id, { room: val });
                                }} 
                                placeholder="none"
                            />
                        </label>
                        <label className="shaper-field mb-0">
                            <span>Chance %</span>
                            <input 
                                type="number" 
                                min={1} 
                                max={100} 
                                value={mob.limit?.chancePercent ?? 100} 
                                onChange={e => {
                                    onUpdateComLimit(mob.id, { chancePercent: Number(e.target.value) });
                                }} 
                                placeholder="100"
                            />
                        </label>
                    </div>

                    {/* Worn Equipment Field */}
                    <div
                        className={`shaper-mob-field-zone ${dropTarget === 'equip' ? 'drop-active' : ''}`}
                        onDragOver={allowDrop('equip', 'object')}
                        onDragLeave={clearDrop}
                        onDrop={handleDrop('object', (v, n) => onAddMobObject(mob.id, v, n, 'equip'))}
                    >
                        <div className="shaper-mob-field-label">
                            <Shield size={12} className="text-pink-400" />
                            <span>Equipped Equipment</span>
                        </div>

                        {equippedItems.map(item => (
                            <ShaperObjectCard
                                key={item.id}
                                item={item}
                                onRemove={() => onRemoveMobObject(mob.id, item.id)}
                                onUpdateComFields={onUpdateComFields}
                                onAddObjectPut={onAddObjectPut}
                                onUpdateComLimit={onUpdateComLimit}
                            />
                        ))}

                        <div className="shaper-mob-field-dropzone">
                            Drop object here to equip (WEAR)
                        </div>
                        <ShaperEntityAddForm
                            kind="object"
                            label="Equip item"
                            onAdd={(v, n) => onAddMobObject(mob.id, v, n, 'equip')}
                        />
                    </div>

                    {/* Carried Inventory Field */}
                    <div
                        className={`shaper-mob-field-zone ${dropTarget === 'give' ? 'drop-active' : ''}`}
                        onDragOver={allowDrop('give', 'object')}
                        onDragLeave={clearDrop}
                        onDrop={handleDrop('object', (v, n) => onAddMobObject(mob.id, v, n, 'give'))}
                    >
                        <div className="shaper-mob-field-label">
                            <Briefcase size={12} className="text-blue-400" />
                            <span>Inventory (GIVE)</span>
                        </div>

                        {carriedItems.map(item => (
                            <ShaperObjectCard
                                key={item.id}
                                item={item}
                                onRemove={() => onRemoveMobObject(mob.id, item.id)}
                                onUpdateComFields={onUpdateComFields}
                                onAddObjectPut={onAddObjectPut}
                                onUpdateComLimit={onUpdateComLimit}
                            />
                        ))}

                        <div className="shaper-mob-field-dropzone">
                            Drop object here to carry (GIVE)
                        </div>
                        <ShaperEntityAddForm
                            kind="object"
                            label="Give item"
                            onAdd={(v, n) => onAddMobObject(mob.id, v, n, 'give')}
                        />
                    </div>

                    {/* Followers Field */}
                    <div
                        className={`shaper-mob-field-zone ${dropTarget === 'follow' ? 'drop-active' : ''}`}
                        onDragOver={allowDrop('follow', 'mob')}
                        onDragLeave={clearDrop}
                        onDrop={handleDrop('mob', (v, n) => onAddFollower(mob.id, v, n))}
                    >
                        <div className="shaper-mob-field-label">
                            <Users size={12} className="text-orange-400" />
                            <span>Followers / Mounts</span>
                        </div>

                        {followers.map(follower => (
                            <ShaperMobCard
                                key={follower.id}
                                mob={follower}
                                depth={depth + 1}
                                onRemoveMob={onRemoveMob}
                                onAddMobObject={onAddMobObject}
                                onRemoveMobObject={onRemoveMobObject}
                                onAddFollower={onAddFollower}
                                onUpdateComFields={onUpdateComFields}
                                onAddObjectPut={onAddObjectPut}
                                onUpdateComLimit={onUpdateComLimit}
                            />
                        ))}

                        <div className="shaper-mob-field-dropzone">
                            Drop mob here to follow (FOLLOW)
                        </div>
                        <ShaperEntityAddForm
                            kind="mob"
                            label="Add follower mob"
                            onAdd={(v, n) => onAddFollower(mob.id, v, n)}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};
