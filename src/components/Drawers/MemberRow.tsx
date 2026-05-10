import React from 'react';
import { GroupMember } from '../../types';
import { useModeStore } from '../../stores/useModeStore';
import { getMemberColor } from '../../utils/groupUtils';

interface MemberRowProps {
    member: GroupMember;
    index: number;
}

export const MemberRow: React.FC<MemberRowProps> = ({ member, index }) => {
    const { isSpectating, spectateTarget, startSpectate, stopSpectate } = useModeStore();
    const color = getMemberColor(index);
    const memberName = member.name || member.label || '';
    const isTarget = isSpectating && spectateTarget === memberName;

    // hp/mana/mp come as percentages (0-100) or strings "100%"
    const parsePercent = (val: any) => {
        if (typeof val === 'number') return val;
        if (typeof val === 'string') return parseInt(val);
        return 0;
    };

    const hp = parsePercent(member.hp ?? member['hp-string']);
    const mana = member.mana !== undefined ? parsePercent(member.mana ?? member['mana-string']) : undefined;
    const moves = member.mp !== undefined ? parsePercent(member.mp ?? member['mp-string']) : undefined;
    
    const isFighting = member.fighting || member.position?.toLowerCase() === 'fighting';

    const renderBar = (percent: number, type: 'hp' | 'mana' | 'move') => (
        <div className={`member-bar ${type}`}>
            <div className="member-bar-segment">
                <div className="member-bar-fill" style={{ width: `${Math.max(0, Math.min(100, percent))}%` }} />
                <div className="member-bar-dividers">
                    <div className="member-bar-divider" />
                    <div className="member-bar-divider" />
                    <div className="member-bar-divider" />
                    <div className="member-bar-divider" />
                </div>
            </div>
        </div>
    );

    const handleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (isTarget) {
            stopSpectate();
        } else {
            startSpectate(memberName);
        }
    };

    return (
        <div
            className={`group-member-row ${isTarget ? 'spectating' : ''}`}
            data-player-name={member.name}
            onClick={handleClick}
            style={{
                cursor: 'pointer',
                border: isTarget ? '2px solid var(--accent, #4a90e2)' : '1px solid transparent',
                borderRadius: '8px',
                transition: 'all 0.2s',
                background: isTarget ? 'rgba(74, 144, 226, 0.15)' : 'transparent',
                position: 'relative'
            }}
        >
            {isTarget && (
                <div style={{
                    position: 'absolute', top: '-6px', right: '6px',
                    fontSize: '0.55em', fontWeight: 'bold', textTransform: 'uppercase',
                    color: 'var(--accent, #4a90e2)', letterSpacing: '0.5px',
                    background: 'var(--bg, #1a1a2e)', padding: '0 4px', borderRadius: '3px'
                }}>
                    Spectating
                </div>
            )}

            <div className="member-status-icon" style={{ backgroundColor: color.core, boxShadow: `0 0 10px ${color.core}44` }} />

            <div className="member-main">
                <div className="member-top">
                    <span className="member-name">{member.name || member.label}</span>
                    <span className="member-room">{member.room || ''}</span>
                    <div className="member-numeric-vitals">
                        <span className="current">{hp}</span>
                        <span className="max">%</span>
                    </div>
                </div>

                <div className="member-bars">
                    {renderBar(hp, 'hp')}
                    {mana !== undefined && renderBar(mana, 'mana')}
                    {moves !== undefined && renderBar(moves, 'move')}
                </div>

                <div className="member-conditions">
                    {isFighting && <span className="cond-badge bad">FIGHT</span>}
                    {member.bashed && <span className="cond-badge bad">BASH</span>}
                    {member.poison && <span className="cond-badge bad">POIS</span>}
                    {member.wound && <span className="cond-badge bad">WND</span>}
                    {member.blind && <span className="cond-badge bad">BLND</span>}
                    {member.snared && <span className="cond-badge bad">SNRE</span>}
                    {member.slept && <span className="cond-badge bad">SLP</span>}
                    {member.waiting && <span className="cond-badge neut">WAIT</span>}
                    {member.sanctuary && <span className="cond-badge good">SANC</span>}
                    {member.hungry && <span className="cond-badge neut">HUNGRY</span>}
                    {member.thirsty && <span className="cond-badge neut">THIRSTY</span>}
                </div>
            </div>
        </div>
    );
};
