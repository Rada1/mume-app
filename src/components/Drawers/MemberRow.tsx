import React from 'react';
import { GroupMember } from '../../types';

export const MemberRow: React.FC<{ member: GroupMember }> = ({ member }) => {
    const hpPercent = member.hp || 0;
    const hpColor = hpPercent > 70 ? 'var(--accent)' : hpPercent > 30 ? '#ffaa00' : '#ff4444';

    return (
        <div className="group-member-row" data-player-name={member.name}>
            <div className="member-info">
                <span className="member-name">{member.name}</span>
                <span className="member-room">{member.room || ''}</span>
            </div>
            <div className="member-vitals">
                <div className="vitals-bar hp">
                    <div
                        className="vitals-fill"
                        style={{ width: `${hpPercent}%`, backgroundColor: hpColor }}
                    />
                </div>
                {member.mana !== undefined && (
                    <div className="vitals-bar mana">
                        <div
                            className="vitals-fill"
                            style={{ width: `${member.mana}%`, backgroundColor: '#4444ff' }}
                        />
                    </div>
                )}
            </div>
            <div className="member-conditions">
                {member.bashed && <span className="cond-tag bad">BASH</span>}
                {member.waiting && <span className="cond-tag neut">WAIT</span>}
                {member.poison && <span className="cond-tag bad">POIS</span>}
                {member.blind && <span className="cond-tag bad">BLND</span>}
            </div>
        </div>
    );
};
