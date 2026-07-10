/**
 * @file ShaperComTreePanel.tsx
 * @description Editable /com tree panel for selected Shaper room resets.
 */

import { useMemo, useRef, useState } from 'react';
import type { DragEvent } from 'react';
import { ArrowDown, ArrowUp, ChevronDown, ChevronRight, Plus, Trash2 } from 'lucide-react';
import { listShaperComTree } from '../model/shaperComCommands';
import { shaperComDisplayName } from '../model/shaperComDisplay';
import { buildShaperComRelations } from '../model/shaperComRelations';
import { buildShaperComPreview } from '../model/shaperComPreview';
import type { ShaperCommandLimit, ShaperCommandNode, ShaperCommandType, ShaperRoomDraft } from '../model/shaperTypes';
import { ShaperComNodeFields } from './ShaperComNodeFields';
import { ShaperContextHelpButton } from './ShaperContextHelpButton';
import { ShaperEntityIdentityFields } from './ShaperEntityIdentityFields';
import './ShaperComTreePanel.css';

interface ShaperComTreePanelProps {
    room: ShaperRoomDraft;
    commandNodes: Record<string, ShaperCommandNode>;
    onAddNode: (roomId: string, type: ShaperCommandType, parentId: string | null, vnum: string) => void;
    onDeleteNode: (nodeId: string) => void;
    onMoveNode: (nodeId: string, delta: -1 | 1) => void;
    onReparentNode: (nodeId: string, parentId: string | null) => void;
    onUpdateLimit: (nodeId: string, patch: Partial<ShaperCommandLimit>) => void;
    onUpdateFields: (nodeId: string, patch: Partial<ShaperCommandNode['fields']>) => void;
    onUpdateNode: (nodeId: string, patch: Pick<Partial<ShaperCommandNode>, 'type' | 'parentId'> & {
        fields?: Partial<ShaperCommandNode['fields']>;
    }) => void;
}

const commandTypes: ShaperCommandType[] = [
    'mobile', 'follow', 'object', 'hide', 'give', 'equip', 'put', 'find',
    'door', 'container', 'repeat', 'eqclass', 'exec', 'liquid', 'money', 'months'
];
const noVnumTypes: ShaperCommandType[] = ['door', 'container', 'repeat', 'eqclass', 'exec', 'liquid', 'money', 'months'];
const mobTypes: ShaperCommandType[] = ['mobile', 'follow'];
const objectTypes: ShaperCommandType[] = ['object', 'hide', 'give', 'equip', 'put', 'find'];

// --- Component Section ---
export const ShaperComTreePanel: React.FC<ShaperComTreePanelProps> = ({ room, commandNodes, onAddNode, onDeleteNode, onMoveNode, onReparentNode, onUpdateLimit, onUpdateFields, onUpdateNode }) => {
    const [type, setType] = useState<ShaperCommandType>('mobile');
    const [vnum, setVnum] = useState('');
    const [parentId, setParentId] = useState('');
    const [expandedNodeIds, setExpandedNodeIds] = useState<Set<string>>(new Set());
    const [hoveredRelationId, setHoveredRelationId] = useState<string | null>(null);
    const [focusedNodeId, setFocusedNodeId] = useState<string | null>(null);
    const rowRefs = useRef<Record<string, HTMLDivElement | null>>({});
    const nodes = useMemo(() => listShaperComTree(commandNodes, room.id), [commandNodes, room.id]);
    const relations = useMemo(() => buildShaperComRelations(nodes), [nodes]);
    const relationBySource = useMemo(() => new Map(relations.map(relation => [relation.sourceId, relation])), [relations]);
    const previewNodes = useMemo(() => buildShaperComPreview(room), [room]);
    const needsVnum = !noVnumTypes.includes(type);
    const submit = () => {
        if (needsVnum && !vnum.trim()) return;
        onAddNode(room.id, type, parentId || null, vnum);
        setVnum('');
    };
    const dragId = (event: DragEvent, nodeId: string) => event.dataTransfer.setData('application/x-shaper-com-node', nodeId);
    const dropOn = (event: DragEvent, parent: string | null) => {
        event.preventDefault();
        const nodeId = event.dataTransfer.getData('application/x-shaper-com-node');
        if (nodeId) onReparentNode(nodeId, parent);
    };
    const readNumber = (value: string): number | null => value.trim() === '' ? null : Number(value);
    const isDescendantOf = (candidateId: string, parentId: string): boolean => {
        let cursor = commandNodes[candidateId];
        while (cursor?.parentId) {
            if (cursor.parentId === parentId) return true;
            cursor = commandNodes[cursor.parentId];
        }
        return false;
    };
    const parentOptionsFor = (node: ShaperCommandNode) => nodes.filter(item => item.id !== node.id && !isDescendantOf(item.id, node.id));
    const parentLabelFor = (node: ShaperCommandNode): string => node.type === 'follow' ? 'Follows' : 'Parent';
    const stopControlDrag = (event: React.PointerEvent) => event.stopPropagation();
    const toggleExpanded = (nodeId: string) =>
        setExpandedNodeIds(current => {
            const next = new Set(current);
            if (next.has(nodeId)) next.delete(nodeId);
            else next.add(nodeId);
            return next;
        });
    const relationKey = (sourceId: string, targetId: string | null): string => `${sourceId}:${targetId ?? 'missing'}`;
    const activeRelation = relations.find(relation => relationKey(relation.sourceId, relation.targetId) === hoveredRelationId);
    const focusRelationTarget = (targetId: string | null) => {
        if (!targetId) return;
        rowRefs.current[targetId]?.scrollIntoView({ block: 'center', behavior: 'smooth' });
        setFocusedNodeId(targetId); window.setTimeout(() => setFocusedNodeId(null), 1600);
    };

    return (
        <section className="shaper-com-panel">
            <div className="shaper-com-heading">
                <span>/com Trees</span>
                <ShaperContextHelpButton topic="com" label="/com help" />
                <strong>{room.roomNumber}</strong>
            </div>

            <form className="shaper-com-add" onSubmit={event => { event.preventDefault(); submit(); }}>
                <select value={type} onChange={event => setType(event.target.value as ShaperCommandType)}>
                    {commandTypes.map(item => <option key={item} value={item}>{item}</option>)}
                </select>
                <ShaperContextHelpButton topic={`com-${type}`} label="Type help" />
                <input
                    value={vnum}
                    onChange={event => setVnum(event.target.value)}
                    placeholder={needsVnum ? 'vnum' : 'configured below'}
                    disabled={!needsVnum}
                />
                <select value={parentId} onChange={event => setParentId(event.target.value)}>
                    <option value="">top level</option>
                    {nodes.map(node => <option key={node.id} value={node.id}>{node.command}</option>)}
                </select>
                <button type="submit" title="Add /com node"><Plus size={14} /></button>
            </form>

            {nodes.length === 0 ? (
                <>
                    <p className="shaper-com-empty">No editable /com nodes yet.</p>
                    {previewNodes.length > 0 && (
                        <div className="shaper-com-tree">
                            {previewNodes.map(node => (
                                <div key={node.id} className="shaper-com-node preview" style={{ marginLeft: node.depth * 18 }}>
                                    <div><strong>{node.label}</strong><code>{node.command}</code></div>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            ) : (
                <>
                    <div className="shaper-com-tree-root" onDragOver={event => event.preventDefault()} onDrop={event => dropOn(event, null)}>
                        Drop here for top-level /com commands
                    </div>
                    <div className="shaper-com-tree">
                        {nodes.map((node, index) => {
                            const isExpanded = expandedNodeIds.has(node.id);
                            const branchClass = node.depth === 0 ? 'root-node' : 'child-node';
                            const previousNode = nodes[index - 1];
                            const startsBranch = node.depth === 0 && index > 0 && previousNode?.depth !== 0;
                            const relation = relationBySource.get(node.id);
                            const relationId = relation ? relationKey(relation.sourceId, relation.targetId) : null;
                            const relatedToActive = activeRelation?.sourceId === node.id || activeRelation?.targetId === node.id || focusedNodeId === node.id;
                            const displayName = shaperComDisplayName(node);
                            const identityKind = mobTypes.includes(node.type) ? 'mob' : objectTypes.includes(node.type) ? 'object' : null;

                            return (
                            <div
                                ref={element => { rowRefs.current[node.id] = element; }}
                                key={node.id}
                                draggable
                                className={`shaper-com-node ${branchClass} ${startsBranch ? 'starts-branch' : ''} ${relatedToActive ? 'relation-active' : ''}`}
                                style={{ marginLeft: node.depth * 28 }}
                                onDragStart={event => dragId(event, node.id)}
                                onDragOver={event => event.preventDefault()}
                                onDrop={event => { event.stopPropagation(); dropOn(event, node.id); }}
                                onMouseEnter={() => relationId && setHoveredRelationId(relationId)}
                                onMouseLeave={() => relationId && setHoveredRelationId(null)}
                            >
                                <div className="shaper-com-node-body">
                                    <div className="shaper-com-node-summary">
                                        <button
                                            type="button"
                                            className="shaper-com-expand"
                                            onClick={() => toggleExpanded(node.id)}
                                            onPointerDown={stopControlDrag}
                                            title={isExpanded ? 'Hide details' : 'Edit details'}
                                        >
                                            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                        </button>
                                        <span className="shaper-com-number-pill">#{index + 1}</span>
                                        <span className="shaper-com-type-pill">{node.type}</span>
                                        <span className="shaper-com-vnum-pill">{String(node.fields.vnum ?? 'no vnum')}</span>
                                        <span className={`shaper-com-name ${displayName ? '' : 'missing'}`} title={displayName}>{displayName || 'name not captured'}</span>
                                        {relation && (
                                            <button
                                                type="button"
                                                className={`shaper-com-relation-chip ${relation.targetId ? '' : 'missing'}`}
                                                onMouseEnter={() => setHoveredRelationId(relationId)}
                                                onMouseLeave={() => setHoveredRelationId(null)}
                                                onPointerDown={stopControlDrag}
                                                onClick={event => { event.stopPropagation(); focusRelationTarget(relation.targetId); }}
                                                title={relation.targetId ? `Show ${relation.targetLabel}` : `${relation.targetText} is not in this tree`}
                                            >
                                                {relation.targetLabel}
                                            </button>
                                        )}
                                        <code>{node.command}</code>
                                    </div>
                                    {isExpanded && (
                                        <div className="shaper-com-node-details">
                                    <div className="shaper-com-node-editor">
                                        <label>Type
                                            <select
                                                value={node.type}
                                                onChange={event => onUpdateNode(node.id, { type: event.target.value as ShaperCommandType })}
                                                onPointerDown={stopControlDrag}
                                            >
                                                {commandTypes.map(item => <option key={item} value={item}>{item}</option>)}
                                            </select>
                                        </label>
                                        <ShaperContextHelpButton topic={`com-${node.type}`} label="Help" />
                                        {identityKind ? (
                                            <ShaperEntityIdentityFields
                                                kind={identityKind}
                                                vnum={String(node.fields.vnum ?? '')}
                                                name={String(node.fields.name ?? '')}
                                                onChange={patch => onUpdateNode(node.id, { fields: patch })}
                                                onPointerDown={stopControlDrag}
                                            />
                                        ) : (
                                            <label>Vnum<input value={String(node.fields.vnum ?? '')} onChange={event => onUpdateNode(node.id, { fields: { vnum: event.target.value } })} disabled={noVnumTypes.includes(node.type)} onPointerDown={stopControlDrag} /></label>
                                        )}
                                        <label>{parentLabelFor(node)}
                                            <select
                                                value={node.parentId ?? ''}
                                                onChange={event => onUpdateNode(node.id, { parentId: event.target.value || null })}
                                                onPointerDown={stopControlDrag}
                                            >
                                                <option value="">{node.type === 'follow' ? 'no parent / use master mob' : 'top level'}</option>
                                                {parentOptionsFor(node).map(item => <option key={item.id} value={item.id}>{item.command}</option>)}
                                            </select>
                                        </label>
                                    </div>
                                    <div className="shaper-com-limits">
                                        <label>World<input type="number" min={0} max={99} value={node.limit?.world ?? ''} onChange={event => onUpdateLimit(node.id, { world: readNumber(event.target.value) })} /></label>
                                        <label>Zone<input type="number" min={0} max={99} value={node.limit?.zone ?? ''} onChange={event => onUpdateLimit(node.id, { zone: readNumber(event.target.value) })} /></label>
                                        <label>Room<input type="number" min={0} max={99} value={node.limit?.room ?? ''} onChange={event => onUpdateLimit(node.id, { room: readNumber(event.target.value) })} /></label>
                                        <label>Chance<input type="number" min={1} max={100} value={node.limit?.chancePercent ?? 100} onChange={event => onUpdateLimit(node.id, { chancePercent: Number(event.target.value) })} /></label>
                                    </div>
                                    <ShaperComNodeFields node={node} onUpdateFields={onUpdateFields} />
                                        </div>
                                    )}
                                </div>
                                <div className="shaper-com-actions">
                                    <button type="button" onClick={() => onMoveNode(node.id, -1)} title="Move up"><ArrowUp size={13} /></button>
                                    <button type="button" onClick={() => onMoveNode(node.id, 1)} title="Move down"><ArrowDown size={13} /></button>
                                    <button type="button" onClick={() => onDeleteNode(node.id)} title="Delete branch"><Trash2 size={13} /></button>
                                </div>
                            </div>
                            );
                        })}
                    </div>
                </>
            )}
        </section>
    );
};
