/**
 * @file GroupTableView.tsx
 * @description GMCP-backed table renderer for the Players > Group tab.
 */

// --- Logic Section ---
import React from 'react';
import type { GroupMember } from '../../types';
import { getMemberColor } from '../../utils/groupUtils';
import { getGroupMemberHits, getGroupMemberMana, getGroupMemberMoves, getGroupMemberName, getGroupMemberState, getGroupMemberVitalPercent } from '../../utils/groupMemberStatus';
import { isVitalLow } from '../../utils/vitalStatus';

const EmptyGroup = () => (
    <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--group-status-muted, rgba(255,255,255,0.3))', fontStyle: 'italic', fontSize: '0.85rem' }}>
        No group members.
    </div>
);

const columns = '15ch 9ch 8ch 10ch 8ch minmax(16ch, 1fr)';

const HeaderRow = () => (
    <>
        <div style={{ display: 'grid', gridTemplateColumns: columns, columnGap: '1ch', fontWeight: 800, color: 'var(--group-status-muted, #fff)', minWidth: '74ch' }}>
            <span>Group Member</span>
            <span>Hits</span>
            <span>Mana</span>
            <span>Moves</span>
            <span>State</span>
            <span>Room</span>
        </div>
        <div style={{ borderTop: '1px dashed var(--group-status-divider, rgba(255,255,255,0.78))', minWidth: '74ch', margin: '2px 0 4px' }} />
    </>
);

export const GroupTableView: React.FC<{ members: GroupMember[]; compact?: boolean; onSelectMember?: (member: GroupMember) => void }> = ({ members, compact = false, onSelectMember }) => {
    if (members.length === 0) return compact ? null : <EmptyGroup />;

    return (
        <div style={{ flex: compact ? '0 0 auto' : 1, overflow: 'auto', padding: compact ? '2px 10px 5px' : '10px 12px', fontFamily: 'var(--font-mono, monospace)', fontSize: compact ? '11px' : 'var(--dynamic-log-size, 16px)', whiteSpace: 'nowrap', lineHeight: compact ? 1.25 : 1.55, color: 'var(--group-status-text, #fff)' }}>
            <HeaderRow />
            {members.map((member, index) => {
                const name = getGroupMemberName(member);
                const memberColor = getMemberColor(index).core;

                return (
                    <div
                        key={String(member.id || name)}
                        style={{
                            display: 'grid',
                            gridTemplateColumns: columns,
                            columnGap: '1ch',
                            minWidth: '74ch',
                            padding: compact ? '2px 0' : 0,
                            background: 'transparent',
                            color: 'var(--group-status-text, #fff)',
                            font: 'inherit',
                            textAlign: 'left'
                        }}
                    >
                        {onSelectMember ? <button type="button" className="room-group-member-target" onClick={() => onSelectMember(member)} title={`Select ${name}`} style={{color:memberColor}}>{name}</button> : <span className="inline-btn" data-id={String(member.id || name)}
                            data-cmd="inline-player" data-category="cat-ally"
                            data-context={name} data-action="menu"
                            style={{ overflow: 'hidden', textOverflow: 'ellipsis', cursor: 'pointer', '--glow-color': memberColor } as React.CSSProperties}>{name}</span>}
                        <span className={`group-status-vital group-status-vital-hits${isVitalLow(getGroupMemberVitalPercent(member, 'health')) ? ' is-low-vital' : ''}`}>{getGroupMemberHits(member)}</span>
                        <span className={`group-status-vital group-status-vital-mana${isVitalLow(getGroupMemberVitalPercent(member, 'mana')) ? ' is-low-vital' : ''}`}>{getGroupMemberMana(member)}</span>
                        <span className={`group-status-vital group-status-vital-moves${isVitalLow(getGroupMemberVitalPercent(member, 'move')) ? ' is-low-vital' : ''}`}>{getGroupMemberMoves(member)}</span>
                        <span>{getGroupMemberState(member)}</span>
                        <span>{member.room || ''}</span>
                    </div>
                );
            })}
        </div>
    );
};
