/**
 * @file shaperComCommands.ts
 * @description Editable /com command tree helpers for Shaper rooms.
 */

import { createShaperRoomId } from './shaperDocument';
import { formatShaperComCommand } from './shaperComFormatters';
import type { ShaperCommandNode, ShaperCommandType, ShaperItemRef, ShaperMobPlacement, ShaperRoomId, ShaperWorkspaceDoc } from './shaperTypes';

export interface ShaperComTreeNode extends ShaperCommandNode {
    depth: number;
    command: string;
}

export interface ShaperComRoomEntities {
    mobs: ShaperMobPlacement[];
    objects: ShaperItemRef[];
}

const nodeField = (node: ShaperCommandNode, key: string, fallback = ''): string =>
    String(node.fields[key] ?? fallback);

// --- Tree Section ---
export const listShaperComTree = (
    nodes: Record<string, ShaperCommandNode>,
    roomId: ShaperRoomId
): ShaperComTreeNode[] => {
    const roomNodes = Object.values(nodes).filter(node => node.roomId === roomId);
    const childrenOf = (parentId: string | null) => roomNodes
        .filter(node => node.parentId === parentId)
        .sort((a, b) => a.order - b.order);
    const result: ShaperComTreeNode[] = [];
    // 1-based `/com list` line number each node will occupy once deployed in this
    // depth-first order. Because every node is appended as the last child of its
    // parent (whose earlier descendants are already emitted), its live line number
    // equals its emission position — so children can address their parent by index.
    const indexById = new Map<string, number>();
    const walk = (parentId: string | null, depth: number) => {
        childrenOf(parentId).forEach(node => {
            indexById.set(node.id, result.length + 1);
            const parentIndex = node.parentId ? indexById.get(node.parentId) : undefined;
            result.push({ ...node, depth, command: formatShaperComCommand(node, parentIndex) });
            walk(node.id, depth + 1);
        });
    };
    walk(null, 0);
    return result;
};

const nextOrder = (doc: ShaperWorkspaceDoc, roomId: ShaperRoomId, parentId: string | null): number =>
    Math.max(-1, ...Object.values(doc.commandNodes)
        .filter(node => node.roomId === roomId && node.parentId === parentId)
        .map(node => node.order)) + 1;

export const addShaperComNode = (
    doc: ShaperWorkspaceDoc,
    roomId: ShaperRoomId,
    type: ShaperCommandType,
    parentId: string | null,
    vnum: string,
    name = ''
): ShaperWorkspaceDoc => {
    const id = createShaperRoomId();
    const node: ShaperCommandNode = {
        id,
        roomId,
        parentId,
        order: nextOrder(doc, roomId, parentId),
        type,
        // MUME requires at least one of world/zone/room; default to a room cap of 1.
        limit: { world: null, zone: null, room: 1, chancePercent: 100, raw: formatShaperLimitRaw(null, null, 1, 100) },
        fields: { vnum: vnum.trim(), name: name.trim(), target: 'parent', container: 'parent', position: '' },
        notes: ''
    };
    return { ...doc, commandNodes: { ...doc.commandNodes, [id]: node } };
};

export const listShaperComRoomEntities = (
    nodes: Record<string, ShaperCommandNode>,
    roomId: ShaperRoomId
): ShaperComRoomEntities => {
    const roomNodes = Object.values(nodes).filter(node => node.roomId === roomId);
    const childNodes = (parentId: string) => roomNodes
        .filter(node => node.parentId === parentId)
        .sort((a, b) => a.order - b.order);

    const itemFromNode = (node: ShaperCommandNode): ShaperItemRef => ({
        id: node.id,
        vnum: nodeField(node, 'vnum'),
        name: nodeField(node, 'name', nodeField(node, 'vnum', 'unnamed object')),
        resetType: node.type,
        resetDetail: node.type === 'equip' ? nodeField(node, 'position') : undefined,
        contents: childNodes(node.id)
            .filter(child => child.type === 'put')
            .map(itemFromNode),
        limit: node.limit
    });

    const mobFromNode = (node: ShaperCommandNode): ShaperMobPlacement => ({
        id: node.id,
        vnum: nodeField(node, 'vnum'),
        name: nodeField(node, 'name', nodeField(node, 'vnum', 'unnamed mob')),
        resetType: node.type,
        resetDetail: node.type === 'follow' ? (nodeField(node, 'ridden') ? 'ridden' : 'follower') : undefined,
        items: childNodes(node.id)
            .filter(child => child.type === 'give' || child.type === 'equip')
            .map(itemFromNode),
        followers: childNodes(node.id)
            .filter(child => child.type === 'follow')
            .map(mobFromNode),
        limit: node.limit
    });

    const mobs = roomNodes
        .filter(node => !node.parentId && (node.type === 'mobile' || node.type === 'follow'))
        .sort((a, b) => a.order - b.order)
        .map(mobFromNode);

    const objects = roomNodes
        .filter(node => !node.parentId && (node.type === 'object' || node.type === 'hide'))
        .sort((a, b) => a.order - b.order)
        .map(itemFromNode);

    return { mobs, objects };
};

export const formatShaperLimitRaw = (
    world: number | null,
    zone: number | null,
    room: number | null,
    chancePercent: number
): string => {
    const chance = chancePercent >= 100 ? 0 : Math.max(1, Math.min(99, chancePercent));
    const parts = [world ?? 0, zone ?? 0, room ?? 0, chance].map(value => String(value).padStart(2, '0'));
    const raw = parts.join('').replace(/^0+/, '');
    return raw || '0';
};

export const updateShaperComLimit = (
    doc: ShaperWorkspaceDoc,
    nodeId: string,
    patch: Partial<NonNullable<ShaperCommandNode['limit']>>
): ShaperWorkspaceDoc => {
    const node = doc.commandNodes[nodeId];
    if (!node) return doc;
    const limit = {
        world: null,
        zone: null,
        room: null,
        chancePercent: 100,
        ...node.limit,
        ...patch
    };
    return {
        ...doc,
        commandNodes: {
            ...doc.commandNodes,
            [nodeId]: {
                ...node,
                limit: {
                    ...limit,
                    raw: formatShaperLimitRaw(limit.world, limit.zone, limit.room, limit.chancePercent)
                }
            }
        }
    };
};

export const updateShaperComFields = (
    doc: ShaperWorkspaceDoc,
    nodeId: string,
    patch: Partial<ShaperCommandNode['fields']>
): ShaperWorkspaceDoc => {
    const node = doc.commandNodes[nodeId];
    if (!node) return doc;
    return {
        ...doc,
        commandNodes: {
            ...doc.commandNodes,
            [nodeId]: {
                ...node,
                fields: {
                    ...node.fields,
                    ...patch
                }
            }
        }
    };
};

export const updateShaperComNode = (
    doc: ShaperWorkspaceDoc,
    nodeId: string,
    patch: Pick<Partial<ShaperCommandNode>, 'type' | 'parentId'> & {
        fields?: Partial<ShaperCommandNode['fields']>;
    }
): ShaperWorkspaceDoc => {
    const node = doc.commandNodes[nodeId];
    const parent = patch.parentId ? doc.commandNodes[patch.parentId] : null;
    if (!node) return doc;
    if (patch.parentId === nodeId || (parent && parent.roomId !== node.roomId)) return doc;

    let cursor = parent;
    while (cursor) {
        if (cursor.parentId === nodeId) return doc;
        cursor = cursor.parentId ? doc.commandNodes[cursor.parentId] : undefined;
    }

    const parentChanged = patch.parentId !== undefined && patch.parentId !== node.parentId;
    return {
        ...doc,
        commandNodes: {
            ...doc.commandNodes,
            [node.id]: {
                ...node,
                type: patch.type ?? node.type,
                parentId: patch.parentId === undefined ? node.parentId : patch.parentId,
                order: parentChanged ? nextOrder(doc, node.roomId, patch.parentId ?? null) : node.order,
                fields: {
                    ...node.fields,
                    ...patch.fields
                }
            }
        }
    };
};

export const deleteShaperComBranch = (doc: ShaperWorkspaceDoc, nodeId: string): ShaperWorkspaceDoc => {
    const removing = new Set<string>([nodeId]);
    let changed = true;
    while (changed) {
        changed = false;
        Object.values(doc.commandNodes).forEach(node => {
            if (node.parentId && removing.has(node.parentId) && !removing.has(node.id)) {
                removing.add(node.id);
                changed = true;
            }
        });
    }
    const commandNodes = { ...doc.commandNodes };
    removing.forEach(id => delete commandNodes[id]);
    return { ...doc, commandNodes };
};

export const moveShaperComNode = (doc: ShaperWorkspaceDoc, nodeId: string, delta: -1 | 1): ShaperWorkspaceDoc => {
    const node = doc.commandNodes[nodeId];
    if (!node) return doc;
    const siblings = Object.values(doc.commandNodes)
        .filter(item => item.roomId === node.roomId && item.parentId === node.parentId)
        .sort((a, b) => a.order - b.order);
    const index = siblings.findIndex(item => item.id === nodeId);
    const swap = siblings[index + delta];
    if (!swap) return doc;
    return {
        ...doc,
        commandNodes: {
            ...doc.commandNodes,
            [node.id]: { ...node, order: swap.order },
            [swap.id]: { ...swap, order: node.order }
        }
    };
};

export const reparentShaperComNode = (
    doc: ShaperWorkspaceDoc,
    nodeId: string,
    parentId: string | null
): ShaperWorkspaceDoc => {
    const node = doc.commandNodes[nodeId];
    const parent = parentId ? doc.commandNodes[parentId] : null;
    if (!node || node.parentId === parentId || nodeId === parentId) return doc;
    if (parent && parent.roomId !== node.roomId) return doc;

    let cursor = parent;
    while (cursor) {
        if (cursor.parentId === nodeId) return doc;
        cursor = cursor.parentId ? doc.commandNodes[cursor.parentId] : undefined;
    }

    return {
        ...doc,
        commandNodes: {
            ...doc.commandNodes,
            [node.id]: {
                ...node,
                parentId,
                order: nextOrder(doc, node.roomId, parentId)
            }
        }
    };
};
