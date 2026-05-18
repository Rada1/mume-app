/**
 * @file magicKeyUtils.ts
 * @description Helpers for parsing, storing, and resolving MUME magic room keys.
 */

import { TeleportTarget } from '../types';

export const MAGIC_KEY_TTL_MS = 24 * 60 * 60 * 1000;

const KEY_PATTERN = /key:\s*'([^']+)'/i;
const KEYED_SPELLS = ['teleport', 'portal', 'scry', 'watch room'] as const;
const KEYED_SPELL_ALIASES: Record<string, typeof KEYED_SPELLS[number]> = {
    tp: 'teleport',
    tele: 'teleport'
};

const normalizeName = (value: string) => value.trim().replace(/\s+/g, ' ').toLowerCase();

export const getMagicKeyId = (target: Pick<TeleportTarget, 'id'>) =>
    target.id.trim().split(/\s+/)[0] || target.id.trim();

export const isKeyedSpell = (spell: string) => (KEYED_SPELLS as readonly string[]).includes(spell.toLowerCase());

export const makeMagicKeyTarget = (
    key: string,
    name: string,
    sourceSpell: TeleportTarget['sourceSpell'],
    sourceLine?: string,
    gatheredZone?: string | null
): TeleportTarget => {
    const now = Date.now();
    const cleanKey = key.trim().split(/\s+/)[0] || key.trim();
    const cleanName = name.trim().replace(/\s+/g, ' ') || key;
    return {
        id: cleanKey,
        name: cleanName,
        label: cleanName,
        command: `teleport ${cleanName}`,
        expiresAt: now + MAGIC_KEY_TTL_MS,
        createdAt: now,
        sourceSpell,
        sourceLine,
        gatheredZone: gatheredZone?.trim() || undefined
    };
};

export const parseMagicKeyLine = (text: string, roomName?: string | null, roomZone?: string | null): TeleportTarget | null => {
    const keyMatch = text.match(KEY_PATTERN);
    if (!keyMatch) return null;

    const key = keyMatch[1];
    if (/magic aura of this place/i.test(text)) {
        return makeMagicKeyTarget(key, roomName || 'Located room', 'locate', text.trim(), roomZone);
    }

    const locateLifeMatch = text.match(/^\s*(.+?)\s+-\s+(.+?)\s+(Very far|Near|Far)\s+key:\s*'[^']+'/i);
    if (locateLifeMatch) {
        const name = `${locateLifeMatch[1].trim()} - ${locateLifeMatch[2].trim()} ${locateLifeMatch[3].trim()}`;
        return makeMagicKeyTarget(key, name, 'locate life', text.trim(), roomZone);
    }

    return null;
};

export const pruneExpiredMagicKeys = (targets: TeleportTarget[], now = Date.now()) =>
    targets.filter(target => !target.expiresAt || target.expiresAt > now);

export const upsertMagicKeyTarget = (targets: TeleportTarget[], nextTarget: TeleportTarget) => {
    const activeTargets = pruneExpiredMagicKeys(targets);
    const existing = activeTargets.find(target => target.id === nextTarget.id);
    const merged = existing
        ? { ...nextTarget, customName: existing.customName, gatheredZone: nextTarget.gatheredZone || existing.gatheredZone, name: existing.customName || nextTarget.name, label: existing.customName || nextTarget.label }
        : nextTarget;
    return [merged, ...activeTargets.filter(target => target.id !== nextTarget.id)];
};

export const renameMagicKeyTarget = (targets: TeleportTarget[], id: string, customName: string) =>
    targets.map(target => {
        if (target.id !== id) return target;
        const name = customName.trim() || target.sourceLine || target.name;
        return { ...target, customName: customName.trim() || undefined, name, label: name };
    });

export const findMagicKeyTarget = (targets: TeleportTarget[], query: string, now = Date.now()) => {
    const normalized = normalizeName(query);
    if (!normalized) return null;
    return pruneExpiredMagicKeys(targets, now).find(target => {
        const names = [target.customName, target.label, target.name, target.sourceLine].filter(Boolean) as string[];
        return getMagicKeyId(target).toLowerCase() === normalized ||
            names.some(name => normalizeName(name) === normalized || normalizeName(name).startsWith(normalized));
    }) || null;
};

export const buildKeyedSpellCommand = (prefix: string, target: TeleportTarget) =>
    `${prefix} ${getMagicKeyId(target)}`;

export const parseKeyedSpellCommand = (cmd: string) => {
    const trimmed = cmd.trim();
    const castMatch = trimmed.match(/^cast\s+['"]?(teleport|portal|scry|watch room)['"]?\s*(.*)$/i);
    if (castMatch) {
        const spell = castMatch[1].toLowerCase();
        return { prefix: `cast '${spell}'`, spell, target: castMatch[2].trim() };
    }

    const directMatch = trimmed.match(/^(teleport|portal|scry|watch room|tp|tele)(?:\s+(.+))?$/i);
    if (directMatch) {
        const inputSpell = directMatch[1].toLowerCase();
        const spell = KEYED_SPELL_ALIASES[inputSpell] || inputSpell;
        return { prefix: `cast '${spell}'`, spell, target: (directMatch[2] || '').trim() };
    }
    return null;
};
