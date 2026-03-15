import React from 'react';
import { Users } from 'lucide-react';
import { useGame } from '../../../context/GameContext';
import { GroupMember } from '../../../types';
import './GroupDrawer.css';

interface GroupDrawerProps {
    uiPositions: any;
    isEditMode: boolean;
    dragState: any;
    handleDragStart: (e: React.PointerEvent, id: string, type: string) => void;
}

const MemberRow: React.FC<{ member: GroupMember }> = ({ member }) => {
    // Determine status color based on HP percentage
    const hpPercent = member.hp || 0;
    const hpColor = hpPercent > 70 ? 'var(--accent)' : hpPercent > 30 ? '#ffaa00' : '#ff4444';

    return (
        <div className="group-member-row">
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

export const GroupDrawer: React.FC<GroupDrawerProps> = ({
    uiPositions, isEditMode, dragState, handleDragStart
}) => {
    const { groupMembers } = useGame();

    const pos = uiPositions.group || {};
    const isDefault = pos.x === undefined && pos.y === undefined;

    // Only show if there are members or in edit mode
    if (groupMembers.length === 0 && !isEditMode) return null;

    return (
        <div
            id="cluster-group"
            className="group-drawer-cluster"
            style={{
                position: 'absolute',
                left: pos.x !== undefined ? pos.x : (isDefault ? '10px' : undefined),
                top: pos.y !== undefined ? pos.y : (isDefault ? '10px' : undefined),
                transform: pos.scale ? `scale(${pos.scale})` : undefined,
                transformOrigin: 'top left',
                cursor: isEditMode ? 'move' : undefined,
                border: isEditMode ? '1px dashed rgba(255,255,0,0.3)' : undefined,
                padding: isEditMode ? '10px' : undefined,
                backgroundColor: isEditMode ? 'rgba(255,255,0,0.1)' : 'rgba(0,0,0,0.4)',
                borderRadius: '12px',
                backdropFilter: 'blur(8px)',
                zIndex: 1600,
                minWidth: '180px',
                pointerEvents: 'auto'
            }}
            onPointerDown={(e) => { if (isEditMode) handleDragStart(e, 'group', 'cluster'); }}
        >
            <div className="group-header">
                <Users size={16} />
                <span>Group ({groupMembers.length})</span>
            </div>
            
            <div className="group-members-list">
                {groupMembers.map(member => (
                    <MemberRow key={member.id} member={member} />
                ))}
                {isEditMode && groupMembers.length === 0 && (
                    <div className="edit-placeholder">Group Members</div>
                )}
            </div>

            {isEditMode && (
                <div 
                    className="resize-handle" 
                    onPointerDown={(e) => { e.stopPropagation(); handleDragStart(e, 'group', 'cluster-resize'); }}
                    style={{
                        position: 'absolute',
                        right: 0,
                        bottom: 0,
                        width: '20px',
                        height: '20px',
                        cursor: 'nwse-resize',
                        zIndex: 1700
                    }}
                />
            )}
        </div>
    );
};
