/**
 * @file CommandActionGroupMemberDetails.tsx
 * @description Name, vitals, and location details for group targets.
 */
import React from 'react';
import type { GroupMember } from '../../../types';
import {
    getGroupMemberDetails,
    getGroupMemberHits,
    getGroupMemberMana,
    getGroupMemberMoves,
    getGroupMemberVitalPercent
} from '../../../utils/groupMemberStatus';
import { isVitalLow } from '../../../utils/vitalStatus';
import { CommandTargetKeyword } from './CommandTargetKeyword';

// --- Type Section ---
interface CommandActionGroupMemberDetailsProps {
    member: GroupMember;
    label: string;
    keyword: string;
    nameColor?: string;
    entityTypeLabel?: string;
    isRoomGroupmate?: boolean;
    fighting: boolean;
    variant: 'inline' | 'roster';
}

// --- Logic Section ---
export const CommandActionGroupMemberDetails: React.FC<CommandActionGroupMemberDetailsProps> = ({
    member, label, keyword, nameColor, entityTypeLabel, isRoomGroupmate = false, fighting, variant
}) => {
    const vitals = [
        { kind: 'health' as const, className: 'command-action-group-vital-hits', label: 'Hits', shortLabel: 'H', value: getGroupMemberHits(member) || '—' },
        { kind: 'mana' as const, className: 'command-action-group-vital-mana', label: 'Mana', shortLabel: 'M', value: getGroupMemberMana(member) || '—' },
        { kind: 'move' as const, className: 'command-action-group-vital-moves', label: 'Moves', shortLabel: 'V', value: getGroupMemberMoves(member) || '—' }
    ];
    const combatIndicator = fighting && <small className="command-action-target-combat" aria-label="Fighting">fighting</small>;
    const renderVital = (vital: typeof vitals[number], compact: boolean) => (
        <span className={vital.className} key={vital.kind}>
            {compact ? vital.shortLabel : vital.label}{' '}
            <b className={isVitalLow(getGroupMemberVitalPercent(member, vital.kind)) ? 'is-low-vital' : undefined}>{vital.value}</b>
        </span>
    );

    if (variant === 'roster') {
        const location = member.room || (member as GroupMember & { location?: string }).location || '';
        const details = [...getGroupMemberDetails(member), location].filter(Boolean).join(' · ');
        return <>
            <span className="command-action-group-member-name">
                <span style={{ color: nameColor }}>{label}</span>
                <CommandTargetKeyword keyword={keyword} />
                {combatIndicator}
            </span>
            <span className="command-action-group-member-vitals">
                {vitals.map((vital, index) => <React.Fragment key={vital.kind}>{index > 0 && ' · '}{renderVital(vital, false)}</React.Fragment>)}
            </span>
            {details && <span className="command-action-group-member-location" title={details}>{details}</span>}
        </>;
    }

    return <>
        <span className="command-action-group-inline-identity">
            <span className="command-action-group-inline-name" style={{ color: nameColor }} title={label}>{label}</span>
            <span className="command-action-group-inline-target-meta">
                {entityTypeLabel && <small className="command-action-target-entity-indicator" data-kind={entityTypeLabel.toLowerCase()}>{entityTypeLabel}</small>}
                {isRoomGroupmate && <small className="command-action-target-entity-indicator" data-kind="groupmate">GRP</small>}
                {combatIndicator}
                <CommandTargetKeyword keyword={keyword} />
            </span>
        </span>
        <small className="command-action-group-inline-meta" title={`Hits ${vitals[0].value} · Mana ${vitals[1].value} · Moves ${vitals[2].value}`}>
            {vitals.map((vital, index) => <React.Fragment key={vital.kind}>{index > 0 && ' · '}{renderVital(vital, true)}</React.Fragment>)}
        </small>
    </>;
};
