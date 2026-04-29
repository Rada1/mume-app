/**
 * @file GroupTableView.tsx
 * @description GMCP-backed table renderer for the Players > Group tab.
 */

import React from 'react';
import { GroupMember } from '../../types';

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

const getName = (member: GroupMember) => member.name || member.label || String(member.id || '');

const getHits = (member: GroupTableMember) => vitalPair(
    member.vits?.hp ?? member.hits ?? member.hp ?? member['hp-string'],
    member.vits?.maxhp ?? member.maxhits ?? member.maxhp
);

const getMana = (member: GroupTableMember) => vitalPair(
    member.vits?.mana ?? member.mana ?? member['mana-string'],
    member.vits?.maxmana ?? member.maxmana
);

const getMoves = (member: GroupTableMember) => vitalPair(
    member.vits?.moves ?? member.moves ?? member.mp ?? member['mp-string'],
    member.vits?.maxmoves ?? member.maxmoves ?? member.maxmp
);

const getState = (member: GroupTableMember) => {
    if (member.state) return member.state;
    if (member.position) return member.position;
    if (member.fighting) return 'fight';
    if (member.waiting) return 'wait';
    return '';
};

const EmptyGroup = () => (
    <div style={{ padding: '40px 20px', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontStyle: 'italic', fontSize: '0.9rem' }}>
        No group members.
    </div>
);

const columns = '15ch 9ch 8ch 10ch 8ch minmax(16ch, 1fr)';

const HeaderRow = () => (
    <>
        <div style={{ display: 'grid', gridTemplateColumns: columns, columnGap: '1ch', fontWeight: 800, color: '#fff', minWidth: '74ch' }}>
            <span>Group Member</span>
            <span>Hits</span>
            <span>Mana</span>
            <span>Moves</span>
            <span>State</span>
            <span>Room</span>
        </div>
        <div style={{ borderTop: '1px dashed rgba(255,255,255,0.78)', minWidth: '74ch', margin: '2px 0 4px' }} />
    </>
);

export const GroupTableView: React.FC<{ members: GroupMember[] }> = ({ members }) => {
    if (members.length === 0) return <EmptyGroup />;

    return (
        <div style={{ flex: 1, overflow: 'auto', padding: '18px 16px', fontFamily: 'var(--font-mono, monospace)', fontSize: '13px', whiteSpace: 'nowrap', lineHeight: 1.55 }}>
            <HeaderRow />
            {members.map((member) => {
                const tableMember = member as GroupTableMember;
                const name = getName(member);

                return (
                    <div
                        key={String(member.id || name)}
                        style={{
                            display: 'grid',
                            gridTemplateColumns: columns,
                            columnGap: '1ch',
                            minWidth: '74ch',
                            padding: 0,
                            background: 'transparent',
                            color: '#fff',
                            font: 'inherit',
                            textAlign: 'left'
                        }}
                    >
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</span>
                        <span style={{ color: '#44ff70', fontWeight: 800 }}>{getHits(tableMember)}</span>
                        <span style={{ color: '#44ff70', fontWeight: 800 }}>{getMana(tableMember)}</span>
                        <span style={{ color: '#44ff70', fontWeight: 800 }}>{getMoves(tableMember)}</span>
                        <span>{getState(tableMember)}</span>
                        <span>{member.room || ''}</span>
                    </div>
                );
            })}
        </div>
    );
};
