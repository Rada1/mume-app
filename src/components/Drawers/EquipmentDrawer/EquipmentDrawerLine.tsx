import React from 'react';
import { DrawerLine } from '../../../types';

interface EquipmentDrawerLineProps {
    line: DrawerLine;
    listType: 'inventorylist' | 'equipmentlist';
    draggedItem: any;
    activeDropTarget: any;
    primedItemId: string | null;
    isDraggingRef: React.MutableRefObject<boolean>;
    handlePointerDown: (e: React.PointerEvent, line: DrawerLine, source: 'inventory' | 'equipment') => void;
    handleButtonClick: (button: any, e: React.MouseEvent, context?: string) => void;
    triggerHaptic: (ms: number) => void;
}

export const EquipmentDrawerLine: React.FC<EquipmentDrawerLineProps> = ({
    line,
    listType,
    draggedItem,
    activeDropTarget,
    primedItemId,
    isDraggingRef,
    handlePointerDown,
    handleButtonClick,
    triggerHaptic
}) => {
    const source = listType === 'inventorylist' ? 'inventory' : 'equipment';
    const isBeingDragged = draggedItem?.line.id === line.id;
    const isTargeted = activeDropTarget?.type === 'container' && activeDropTarget.id === (line.context || line.id);
    const depth = line.depth || 0;

    if (line.isItem) {
        const isPrimed = primedItemId === line.id;
        return (
            <div
                className={`inline-btn auto-item ${isPrimed ? 'primed' : ''} ${isTargeted ? 'drop-target' : ''} ${line.isContainer ? 'is-container' : ''}`}
                data-item-name={line.context || line.id}
                onPointerDown={(e) => handlePointerDown(e, line, source)}
                onClick={(e) => {
                    if (isDraggingRef.current) return;
                    triggerHaptic(20);
                    handleButtonClick({
                        id: `drawer-${line.id}`,
                        command: listType,
                        label: line.context || 'Item',
                        actionType: 'menu'
                    } as any, e, line.context);
                }}
                style={{
                    backgroundColor: isBeingDragged ? 'rgba(100, 255, 100, 0.02)' :
                        isTargeted ? 'rgba(255, 255, 100, 0.2)' :
                            isPrimed ? 'rgba(100, 255, 100, 0.04)' :
                                line.isContainer ? 'rgba(137, 180, 250, 0.15)' : 'rgba(100, 255, 100, 0.08)',
                    borderBottom: '1px solid rgba(255,255,255,0.1)',
                    borderLeft: depth > 0 ? `${depth * 3}px solid #89b4fa` : 'none',
                    padding: '8px 12px',
                    marginLeft: `${depth * 20}px`,
                    borderRadius: depth > 0 ? '0 4px 4px 0' : '4px',
                    marginBottom: '4px',
                    cursor: 'grab',
                    opacity: isBeingDragged ? 0.3 : isPrimed ? 0.6 : 1,
                    transform: isTargeted ? 'scale(1.02)' : isPrimed ? 'scale(0.95)' : 'scale(1)',
                    transition: 'all 0.15s ease',
                    boxShadow: isTargeted ? '0 0 10px rgba(137, 180, 250, 0.3)' : 'none',
                    touchAction: draggedItem ? 'none' : 'pan-y',
                    fontWeight: line.isContainer ? 'bold' : 'normal',
                    color: line.isContainer ? '#89b4fa' : (depth > 0 ? 'rgba(255,255,255,0.8)' : 'inherit'),
                    fontSize: depth > 0 ? '0.8rem' : '0.85rem'
                }}
                dangerouslySetInnerHTML={{ __html: line.html }}
            />
        );
    }
    return (
        <div
            style={{
                padding: '4px 0',
                opacity: line.isHeader ? 0.7 : 1,
                whiteSpace: 'pre-wrap',
                marginLeft: `${depth * 20}px`,
                fontSize: line.isHeader ? '0.75rem' : '0.85rem',
                color: line.isHeader ? 'var(--accent)' : 'inherit',
                letterSpacing: line.isHeader ? '1px' : 'normal'
            }}
            dangerouslySetInnerHTML={{ __html: line.html }}
        />
    );
};
