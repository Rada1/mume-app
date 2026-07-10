/**
 * @file ShaperObjectCard.tsx
 * @description Collapsible card for placed objects, supporting container loading and wear positions.
 */

import { useEffect, useRef, useState } from 'react';
import type { DragEvent } from 'react';
import { ChevronDown, ChevronRight, X, Package } from 'lucide-react';
import type { ShaperItemRef, ShaperLibraryInstall, ShaperLibraryTargetType } from '../model/shaperTypes';
import { useShaperEntityFocus, useShaperEntityFocusSignal } from './shaperEntityFocus';

// All command-node ids within an object (itself plus its container contents).
const collectItemDescendantIds = (item: ShaperItemRef): Set<string> => {
    const ids = new Set<string>([item.id]);
    item.contents?.forEach(child => collectItemDescendantIds(child).forEach(id => ids.add(id)));
    return ids;
};
import { getEntityDragData, hasEntityKind } from './shaperEntityDrag';
import { ShaperEntityAddForm } from './ShaperEntityAddForm';
import { ShaperEntityLibraries } from './ShaperEntityLibraries';
import { ShaperEntityInfoButton } from './ShaperEntityInfoButton';

interface ShaperObjectCardProps {
    item: ShaperItemRef;
    onRemove: () => void;
    onUpdateComFields: (nodeId: string, patch: Record<string, any>) => void;
    onAddObjectPut: (containerId: string, vnum: string, name: string) => void;
    onUpdateComLimit: (nodeId: string, patch: any) => void;
    libraries: ShaperLibraryInstall[];
    onAddLibrary: (targetType: ShaperLibraryTargetType, targetId: string, name: string) => void;
    onRemoveLibrary: (id: string) => void;
    onSetLibraryParam: (id: string, key: string, value: string) => void;
    onRemoveLibraryParam: (id: string, key: string) => void;
    onToggleLibraryLoad: (id: string) => void;
    onUpdateLibraryNotes: (id: string, notes: string) => void;
}

const wearPositions = [
    'wield', 'shield', 'body', 'head', 'legs', 'hands', 'feet',
    'neck', 'finger', 'about', 'waist', 'wrist', 'arms', 'back',
    'dual-wield', 'held'
];

export const ShaperObjectCard: React.FC<ShaperObjectCardProps> = ({
    item,
    onRemove,
    onUpdateComFields,
    onAddObjectPut,
    onUpdateComLimit,
    libraries,
    onAddLibrary,
    onRemoveLibrary,
    onSetLibraryParam,
    onRemoveLibraryParam,
    onToggleLibraryLoad,
    onUpdateLibraryNotes
}) => {
    const [expanded, setExpanded] = useState(false);
    const [dropTarget, setDropTarget] = useState(false);
    const { ref: focusRef, focused } = useShaperEntityFocus(item.id);
    const focusSignal = useShaperEntityFocusSignal();

    const lastSignalRef = useRef<number | null>(null);

    useEffect(() => {
        if (focusSignal && focusSignal.nonce !== lastSignalRef.current) {
            lastSignalRef.current = focusSignal.nonce;
            if (collectItemDescendantIds(item).has(focusSignal.id)) {
                setExpanded(true);
            }
        }
    }, [focusSignal, item]);

    const allowDrop = (e: DragEvent) => {
        if (!hasEntityKind(e, 'object')) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
        setDropTarget(true);
    };

    const handleDrop = (e: DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDropTarget(false);
        const data = getEntityDragData(e);
        if (data && data.kind === 'object') {
            onAddObjectPut(item.id, data.vnum, data.name);
        }
    };

    const clearDrop = () => setDropTarget(false);

    const contents = item.contents || [];
    const isEquipped = item.resetType === 'equip';
    const hasContents = contents.length > 0;

    // Show expand/collapse only if container, equipped, or has children.
    const isCollapsible = isEquipped || hasContents || item.resetType === 'object' || item.resetType === 'hide';

    return (
        <div ref={focusRef} className={`shaper-entity-row object ${expanded ? 'expanded' : ''} ${focused ? 'focused' : ''}`}>
            <div className="shaper-entity-line">
                {isCollapsible ? (
                    <button
                        type="button"
                        className="shaper-entity-toggle"
                        onClick={() => setExpanded(!expanded)}
                        title="Toggle details"
                    >
                        {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        {item.vnum && <span className="shaper-entity-vnum">{item.vnum}</span>}
                        <span className="shaper-entity-name">{item.name || 'unnamed object'}</span>
                        {item.resetType && (
                            <span className={`shaper-entity-reset-badge ${item.resetType}`}>
                                {isEquipped ? `WEAR: ${item.resetDetail || 'wield'}` : item.resetType === 'hide' ? 'HIDE' : 'OBJ'}
                            </span>
                        )}
                        {hasContents && <span className="shaper-entity-count">{contents.length}</span>}
                    </button>
                ) : (
                    <div className="shaper-entity-toggle static">
                        {item.vnum && <span className="shaper-entity-vnum">{item.vnum}</span>}
                        <span className="shaper-entity-name">{item.name || 'unnamed object'}</span>
                        {item.resetType && (
                            <span className={`shaper-entity-reset-badge ${item.resetType}`}>
                                {item.resetType.toUpperCase()}
                            </span>
                        )}
                    </div>
                )}
                <ShaperEntityInfoButton kind="object" vnum={item.vnum} />
                <button
                    type="button"
                    className="shaper-entity-remove"
                    onClick={onRemove}
                    title="Remove object"
                >
                    <X size={13} />
                </button>
            </div>

            {expanded && isCollapsible && (
                <div className="shaper-entity-children font-sans">
                    {/* Limit / Chance Row */}
                    <div className="shaper-com-limits" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px', marginBottom: '8px', padding: '0 4px' }}>
                        <label className="shaper-field mb-0">
                            <span>World</span>
                            <input 
                                type="number" 
                                min={0} 
                                max={99} 
                                value={item.limit?.world ?? ''} 
                                onChange={e => {
                                    const val = e.target.value.trim() === '' ? null : Number(e.target.value);
                                    onUpdateComLimit(item.id, { world: val });
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
                                value={item.limit?.zone ?? ''} 
                                onChange={e => {
                                    const val = e.target.value.trim() === '' ? null : Number(e.target.value);
                                    onUpdateComLimit(item.id, { zone: val });
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
                                value={item.limit?.room ?? ''} 
                                onChange={e => {
                                    const val = e.target.value.trim() === '' ? null : Number(e.target.value);
                                    onUpdateComLimit(item.id, { room: val });
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
                                value={item.limit?.chancePercent ?? 100} 
                                onChange={e => {
                                    onUpdateComLimit(item.id, { chancePercent: Number(e.target.value) });
                                }} 
                                placeholder="100"
                            />
                        </label>
                    </div>

                    <ShaperEntityLibraries
                        targetType="object"
                        targetId={item.id}
                        libraries={libraries}
                        onAddLibrary={onAddLibrary}
                        onRemoveLibrary={onRemoveLibrary}
                        onSetParam={onSetLibraryParam}
                        onRemoveParam={onRemoveLibraryParam}
                        onToggleLoad={onToggleLibraryLoad}
                        onUpdateNotes={onUpdateLibraryNotes}
                    />

                    {/* Wear position setting if equipped */}
                    {isEquipped && (
                        <div className="shaper-mob-field-zone">
                            <label className="shaper-field mb-1">
                                <span>Equip Wear Slot</span>
                                <select
                                    value={item.resetDetail || 'wield'}
                                    onChange={e => onUpdateComFields(item.id, { position: e.target.value })}
                                    className="w-full text-xs"
                                >
                                    {wearPositions.map(pos => (
                                        <option key={pos} value={pos}>{pos.toUpperCase()}</option>
                                    ))}
                                </select>
                            </label>
                        </div>
                    )}

                    {/* Container contents zone */}
                    <div
                        className={`shaper-mob-field-zone ${dropTarget ? 'drop-active' : ''}`}
                        onDragOver={allowDrop}
                        onDragLeave={clearDrop}
                        onDrop={handleDrop}
                    >
                        <div className="shaper-mob-field-label">
                            <Package size={12} className="text-teal-400" />
                            <span>Container Contents (PUT)</span>
                        </div>

                        {contents.map(child => (
                            <ShaperObjectCard
                                key={child.id}
                                item={child}
                                onRemove={() => onRemove()} // Handled by parent deleteComNode
                                onUpdateComFields={onUpdateComFields}
                                onAddObjectPut={onAddObjectPut}
                                onUpdateComLimit={onUpdateComLimit}
                                libraries={[]}
                                onAddLibrary={onAddLibrary}
                                onRemoveLibrary={onRemoveLibrary}
                                onSetLibraryParam={onSetLibraryParam}
                                onRemoveLibraryParam={onRemoveLibraryParam}
                                onToggleLibraryLoad={onToggleLibraryLoad}
                                onUpdateLibraryNotes={onUpdateLibraryNotes}
                            />
                        ))}

                        <div className="shaper-mob-field-dropzone">
                            Drop object here to load inside container
                        </div>
                        <ShaperEntityAddForm
                            kind="object"
                            label="Put inside container"
                            onAdd={(v, n) => onAddObjectPut(item.id, v, n)}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};
