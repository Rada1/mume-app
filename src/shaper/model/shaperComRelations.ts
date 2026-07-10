/**
 * @file shaperComRelations.ts
 * @description Semantic relationship helpers for Shaper /com command trees.
 */

import type { ShaperCommandNode } from './shaperTypes';
import type { ShaperComTreeNode } from './shaperComCommands';
import { shaperComEntityLabel } from './shaperComDisplay';

export interface ShaperComRelation {
    sourceId: string;
    targetId: string | null;
    label: string;
    targetText: string;
    targetLabel: string;
}

const textField = (node: ShaperCommandNode, key: string): string =>
    String(node.fields[key] ?? '').trim();

const relationSpec = (node: ShaperCommandNode): { field: string; nameField: string; label: string; targetTypes: string[] } | null => {
    if (node.type === 'put') return { field: 'container', nameField: 'containerName', label: 'into', targetTypes: ['object', 'hide', 'put'] };
    if (node.type === 'give') return { field: 'target', nameField: 'targetName', label: 'to', targetTypes: ['mobile', 'follow'] };
    if (node.type === 'equip') return { field: 'target', nameField: 'targetName', label: 'wears', targetTypes: ['mobile', 'follow'] };
    if (node.type === 'follow') return { field: 'master', nameField: 'masterName', label: 'follows', targetTypes: ['mobile', 'follow'] };
    if (node.type === 'exec') return { field: 'character', nameField: 'targetName', label: 'as', targetTypes: ['mobile', 'follow'] };
    if (node.type === 'container') return { field: 'container', nameField: 'containerName', label: 'object', targetTypes: ['object', 'hide', 'put'] };
    return null;
};

const findTargetNode = (
    source: ShaperComTreeNode,
    nodes: ShaperComTreeNode[],
    targetValue: string,
    targetTypes: string[]
): ShaperComTreeNode | null => {
    if (targetValue === 'parent') {
        return source.parentId ? nodes.find(node => node.id === source.parentId) ?? null : null;
    }

    return nodes.find(node =>
        node.id !== source.id &&
        targetTypes.includes(node.type) &&
        textField(node, 'vnum') === targetValue
    ) ?? null;
};

// --- Relation Section ---
export const buildShaperComRelations = (nodes: ShaperComTreeNode[]): ShaperComRelation[] =>
    nodes.flatMap(node => {
        const spec = relationSpec(node);
        if (!spec) return [];

        const targetText = textField(node, spec.field);
        if (!targetText) return [];

        const target = findTargetNode(node, nodes, targetText, spec.targetTypes);
        if (targetText === 'parent' && !target) return [];
        const targetIndex = target ? nodes.findIndex(item => item.id === target.id) : -1;
        const fallbackName = textField(node, spec.nameField);
        const fallbackLabel = fallbackName ? `${targetText} (${fallbackName})` : targetText;
        return [{
            sourceId: node.id,
            targetId: target?.id ?? null,
            label: spec.label,
            targetText,
            targetLabel: target ? `#${targetIndex + 1} ${shaperComEntityLabel(target)}` : fallbackLabel
        }];
    });
