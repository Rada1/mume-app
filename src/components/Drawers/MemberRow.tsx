import React from 'react';
import { GroupMember } from '../../types';
import { getMemberColor } from '../../utils/groupUtils';

interface MemberRowProps {
    member: GroupMember;
    index: number;
}

export const MemberRow: React.FC<MemberRowProps> = ({ member, index }) => {
    const color = getMemberColor(index);
    
    // hp/mana/mp come as percentages (0-100) or strings "100%"
    const parsePercent = (val: any) => {
        if (typeof val === 'number') return val;
        if (typeof val === 'string') return parseInt(val);
        return 0;
    };

    const hp = parsePercent(member.hp ?? member['hp-string']);
    const mana = member.mana !== undefined ? parsePercent(member.mana ?? member['mana-string']) : undefined;
    const moves = member.mp !== undefined ? parsePercent(member.mp ?? member['mp-string']) : undefined;

    const hpColor = hp > 66 ? '#ee2222' : hp > 33 ? '#eab308' : '#ef4444';

    const renderSegmentedBar = (percent: number, type: 'hp' | 'mana' | 'move') => {
        const segments = [10, 15, 20, 25, 30]; // Matches main HUD chunks
        let remaining = percent;
        
        return (
            <div className={`member-stat-track ${type}`}>
                <div className="member-stat-segments">
                    {segments.map((segWidth, i) => {
                        const chunkWeight = remaining / segWidth;
                        const fill = Math.max(0, Math.min(100, chunkWeight * 100));
                        remaining = Math.max(0, remaining - segWidth);
                        
                        return (
                            <div key={i} className="member-stat-segment" style={{ flex: segWidth }}>
                                <div className="member-stat-fill" style={{ width: `${fill}%` }} />
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    return (
        <div className="group-member-row" data-player-name={member.name}>
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
                    {renderSegmentedBar(hp, 'hp')}
                    {mana !== undefined && renderSegmentedBar(mana, 'mana')}
                    {moves !== undefined && renderSegmentedBar(moves, 'move')}
                </div>

                <div className="member-conditions">
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
