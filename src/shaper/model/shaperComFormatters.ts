/**
 * @file shaperComFormatters.ts
 * @description Formats editable Shaper /com nodes into deployable command previews.
 */

import type { ShaperCommandNode } from './shaperTypes';

const field = (node: ShaperCommandNode, key: string, fallback = ''): string =>
    String(node.fields[key] ?? fallback).trim();

const limitRaw = (node: ShaperCommandNode): string => node.limit?.raw || '0';

const joinCommand = (parts: string[]): string => parts.filter(Boolean).join(' ');

const optionalTargetField = (node: ShaperCommandNode, key: string, fallback = 'parent'): string => {
    const value = field(node, key, fallback);
    return value === 'parent' ? '' : value;
};

// --- Command Formatting Section ---
// `parentIndex` is the 1-based position of this node's parent in the deployed
// `/com list`. MUME's bare `+` flag means "child of the *last* command", which
// only holds during a full in-order replay — pushing a single nested command in
// isolation would attach it to whatever command is currently last (yielding a
// "bad parent"). Addressing the parent explicitly with `/com add <index> +`
// makes every child command position-independent. See `/help com add`.
export const formatShaperComCommand = (node: ShaperCommandNode, parentIndex?: number): string => {
    const prefix = node.parentId
        ? (parentIndex ? `/com add ${parentIndex} +` : '/com add +')
        : '/com add';
    const limit = limitRaw(node);
    const vnum = field(node, 'vnum', `<${node.type}>`);
    switch (node.type) {
        case 'mobile':
            return joinCommand([prefix, 'mobile', vnum, limit, field(node, 'maxZonePlayers'), field(node, 'position')]);
        case 'follow':
            return joinCommand([prefix, 'follow', vnum, limit, field(node, 'master'), field(node, 'followMode')]);
        case 'object':
            return joinCommand([prefix, 'object', vnum, limit]);
        case 'hide':
            return joinCommand([prefix, 'hide', vnum, limit]);
        case 'give':
            return joinCommand([prefix, 'give', vnum, limit, optionalTargetField(node, 'target')]);
        case 'equip':
            return joinCommand([prefix, 'equip', vnum, limit, optionalTargetField(node, 'target'), field(node, 'position', '<position>')]);
        case 'put':
            return joinCommand([prefix, 'put', vnum, limit, optionalTargetField(node, 'container'), field(node, 'needObject')]);
        case 'door':
            return joinCommand([prefix, 'door', field(node, 'direction', 'n'), field(node, 'doorAction', 'close'), field(node, 'minDifficulty'), field(node, 'maxDifficulty')]);
        case 'container':
            return joinCommand([prefix, 'container', field(node, 'container'), field(node, 'containerAction', 'close')]);
        case 'find':
            return joinCommand([prefix, 'find', field(node, 'findKind', 'object'), vnum, field(node, 'visibility')]);
        case 'repeat':
            return joinCommand([prefix, 'repeat', field(node, 'minCount', '1'), field(node, 'maxCount')]);
        case 'eqclass':
            return joinCommand([prefix, 'eqclass', field(node, 'eqclass', '<eqclass>'), limit]);
        case 'exec':
            return joinCommand([prefix, 'exec', optionalTargetField(node, 'character'), field(node, 'command', '<command>')]);
        case 'liquid':
            return joinCommand([prefix, 'liquid', field(node, 'liquid', 'water'), field(node, 'amount')]);
        case 'money':
            return joinCommand([prefix, 'money', field(node, 'amount', '1'), field(node, 'currency')]);
        case 'months':
            return joinCommand([prefix, 'months', field(node, 'months', '<months>')]);
        default:
            return joinCommand([prefix, node.type]);
    }
};
