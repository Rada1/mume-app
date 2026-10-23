/**
 * @file groupMemberStatus.ts
 * @description Formats the live status fields shared by group views.
 */

// --- Type Section ---
import type { GroupMember } from '../types';
import { getVitalPercent, type VitalKind } from './vitalStatus';

type VitalValue = string | number | undefined;
type GroupTableMember = GroupMember & {
    state?: string;
    hits?: VitalValue;
    maxhits?: VitalValue;
    maxhp?: VitalValue;
    maxmana?: VitalValue;
    moves?: VitalValue;
    maxmoves?: VitalValue;
    maxmp?: VitalValue;
};

// --- Logic Section ---
const valueText = (value: VitalValue): string => {
    if (value === undefined || value === null) return '';
    return String(value);
};

const vitalPair = (current: VitalValue, max: VitalValue): string => {
    const currentText = valueText(current);
    const maxText = valueText(max);
    if (!currentText) return '';
    if (currentText.includes('/') || currentText.endsWith('%')) return currentText;
    return maxText ? `${currentText}/${maxText}` : currentText;
};

export const getGroupMemberName = (member: GroupMember): string => member.name || member.label || String(member.id || '');

export const getGroupMemberHits = (member: GroupMember): string => {
    const value = member as GroupTableMember;
    return vitalPair(value.vits?.hp ?? value.hits ?? value.hp ?? value['hp-string'], value.vits?.maxhp ?? value.maxhits ?? value.maxhp);
};

export const getGroupMemberMana = (member: GroupMember): string => {
    const value = member as GroupTableMember;
    return vitalPair(value.vits?.mana ?? value.mana ?? value['mana-string'], value.vits?.maxmana ?? value.maxmana);
};

export const getGroupMemberMoves = (member: GroupMember): string => {
    const value = member as GroupTableMember;
    return vitalPair(value.vits?.moves ?? value.moves ?? value.mp ?? value['mp-string'], value.vits?.maxmoves ?? value.maxmoves ?? value.maxmp);
};

export const getGroupMemberVitalPercent = (member: GroupMember, kind: VitalKind): number | null => {
    const value = member as GroupTableMember;
    if (kind === 'health') {
        return getVitalPercent(kind, value.vits?.hp ?? value.hits ?? value.hp ?? value['hp-string'], value.vits?.maxhp ?? value.maxhits ?? value.maxhp);
    }
    if (kind === 'mana') {
        return getVitalPercent(kind, value.vits?.mana ?? value.mana ?? value['mana-string'], value.vits?.maxmana ?? value.maxmana);
    }
    return getVitalPercent(kind, value.vits?.moves ?? value.moves ?? value.mp ?? value['mp-string'], value.vits?.maxmoves ?? value.maxmoves ?? value.maxmp);
};

export const getGroupMemberState = (member: GroupMember): string => {
    const value = member as GroupTableMember;
    if (value.state) return value.state;
    if (value.position) return value.position;
    if (value.fighting) return 'fight';
    if (value.waiting) return 'wait';
    return '';
};

export const getGroupMemberDetails = (member: GroupMember): string[] => {
    const value = member as GroupTableMember;
    const details: string[] = [];
    const addDetail = (detail: string) => {
        const normalized = detail.trim();
        if (normalized && !details.some(existing => existing.toLowerCase() === normalized.toLowerCase())) {
            details.push(normalized);
        }
    };

    [value.state, value.position].forEach(detail => {
        if (typeof detail === 'string') addDetail(detail);
    });

    const flags: Array<[keyof GroupMember, string]> = [
        ['fighting', 'Fighting'],
        ['waiting', 'Waiting'],
        ['bashed', 'Bashed'],
        ['poison', 'Poisoned'],
        ['wound', 'Wounded'],
        ['blind', 'Blind'],
        ['snared', 'Snared'],
        ['slept', 'Sleeping'],
        ['sanctuary', 'Sanctuary'],
        ['hungry', 'Hungry'],
        ['thirsty', 'Thirsty']
    ];

    flags.forEach(([key, label]) => {
        const isAlreadyDescribed = key === 'fighting'
            ? details.some(detail => /fight/i.test(detail))
            : key === 'waiting' && details.some(detail => /wait/i.test(detail));
        if (member[key] && !isAlreadyDescribed) addDetail(label);
    });

    return details;
};
