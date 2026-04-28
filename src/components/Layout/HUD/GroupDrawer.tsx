import React from 'react';
import { Users } from 'lucide-react';
import { useVitals } from '../../../context/GameContext';
import { MemberRow } from '../../Drawers/MemberRow';
import './GroupDrawer.css';

import { UiPositions } from '../../../types';

interface GroupDrawerProps {
    uiPositions: UiPositions;
    isEditMode: boolean;
    dragState: { id: string; type: string; startX: number; startY: number } | null;
    handleDragStart: (e: React.PointerEvent, id: string, type: string) => void;
}

export const GroupDrawer: React.FC<GroupDrawerProps> = ({
    uiPositions, isEditMode, dragState, handleDragStart
}) => {
    const { groupMembers } = useVitals();

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
                width: pos.w ? `${pos.w}px` : undefined,
                height: pos.h ? `${pos.h}px` : undefined,
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
                {groupMembers.map((member, index) => (
                    <MemberRow key={member.id} member={member} index={index} />
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
