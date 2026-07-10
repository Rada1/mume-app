/**
 * @file ShaperComTreePanel.tsx
 * @description Editable /com tree panel for selected Shaper room resets.
 */

import { useState } from 'react';
import type { DragEvent } from 'react';
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import { listShaperComTree } from '../model/shaperComCommands';
import { buildShaperComPreview } from '../model/shaperComPreview';
import type { ShaperCommandLimit, ShaperCommandNode, ShaperCommandType, ShaperRoomDraft } from '../model/shaperTypes';
import { ShaperComNodeFields } from './ShaperComNodeFields';
import { ShaperContextHelpButton } from './ShaperContextHelpButton';
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

// --- Component Section ---
export const ShaperComTreePanel: React.FC<ShaperComTreePanelProps> = ({ room, commandNodes, onAddNode, onDeleteNode, onMoveNode, onReparentNode, onUpdateLimit, onUpdateFields, onUpdateNode }) => {
    const [type, setType] = useState<ShaperCommandType>('mobile');
    const [vnum, setVnum] = useState('');
    const [parentId, setParentId] = useState('');
    const nodes = listShaperComTree(commandNodes, room.id);
    const previewNodes = buildShaperComPreview(room);
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
    const parentOptionsFor = (node: ShaperCommandNode) =>
        nodes.filter(item => item.id !== node.id && !isDescendantOf(item.id, node.id));
    const parentLabelFor = (node: ShaperCommandNode): string =>
        node.type === 'follow' ? 'Follows' : 'Parent';
    const stopControlDrag = (event: React.PointerEvent) => event.stopPropagation();

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
                        {nodes.map(node => (
                            <div
                                key={node.id}
                                draggable
                                className="shaper-com-node"
                                style={{ marginLeft: node.depth * 18 }}
                                onDragStart={event => dragId(event, node.id)}
                                onDragOver={event => event.preventDefault()}
                                onDrop={event => { event.stopPropagation(); dropOn(event, node.id); }}
                            >
                                <div>
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
                                        <label>Vnum
                                            <input
                                                value={String(node.fields.vnum ?? '')}
                                                onChange={event => onUpdateNode(node.id, { fields: { vnum: event.target.value } })}
                                                disabled={noVnumTypes.includes(node.type)}
                                                onPointerDown={stopControlDrag}
                                            />
                                        </label>
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
                                    <code>{node.command}</code>
                                    <div className="shaper-com-limits">
                                        <label>World<input type="number" min={0} max={99} value={node.limit?.world ?? ''} onChange={event => onUpdateLimit(node.id, { world: readNumber(event.target.value) })} /></label>
                                        <label>Zone<input type="number" min={0} max={99} value={node.limit?.zone ?? ''} onChange={event => onUpdateLimit(node.id, { zone: readNumber(event.target.value) })} /></label>
                                        <label>Room<input type="number" min={0} max={99} value={node.limit?.room ?? ''} onChange={event => onUpdateLimit(node.id, { room: readNumber(event.target.value) })} /></label>
                                        <label>Chance<input type="number" min={1} max={100} value={node.limit?.chancePercent ?? 100} onChange={event => onUpdateLimit(node.id, { chancePercent: Number(event.target.value) })} /></label>
                                    </div>
                                    <ShaperComNodeFields node={node} onUpdateFields={onUpdateFields} />
                                </div>
                                <div className="shaper-com-actions">
                                    <button type="button" onClick={() => onMoveNode(node.id, -1)} title="Move up"><ArrowUp size={13} /></button>
                                    <button type="button" onClick={() => onMoveNode(node.id, 1)} title="Move down"><ArrowDown size={13} /></button>
                                    <button type="button" onClick={() => onDeleteNode(node.id)} title="Delete branch"><Trash2 size={13} /></button>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}
        </section>
    );
};
