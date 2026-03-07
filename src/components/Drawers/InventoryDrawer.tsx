import React from 'react';

import { DrawerLine } from '../../types';

interface InventoryDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    triggerHaptic: (ms: number) => void;
    inventoryLines: DrawerLine[];
    handleButtonClick: (button: any, e: React.MouseEvent, context?: string) => void;
    executeCommand: (cmd: string, silent?: boolean, isSystem?: boolean, isHistorical?: boolean, fromDrawer?: boolean) => void;
}

export const InventoryDrawer: React.FC<InventoryDrawerProps> = ({
    isOpen,
    onClose,
    triggerHaptic,
    inventoryLines,
    handleButtonClick,
    executeCommand
}) => {
    const [isDragOver, setIsDragOver] = React.useState(false);
    return (
        <div
            className={`inventory-drawer ${isOpen ? 'open' : ''} ${isDragOver ? 'drag-over' : ''}`}
            onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                if (!isDragOver) setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={(e) => {
                e.preventDefault();
                setIsDragOver(false);
                try {
                    const dataStr = e.dataTransfer.getData('application/json');
                    if (!dataStr) return;
                    const data = JSON.parse(dataStr);
                    if (data.type === 'inline-btn' && (data.context || data.cmd === 'target')) {
                        triggerHaptic(40);
                        const noun = data.cmd === 'target' ? 'target' : data.context;
                        executeCommand(`get ${noun}`);
                    }
                } catch (err) {
                    console.error('Failed to parse drop data', err);
                }
            }}
            onPointerDown={(e) => {
                const target = e.target as HTMLElement;
                if (target.closest('button') || target.closest('a')) return;
                e.currentTarget.setPointerCapture(e.pointerId);
                (e.currentTarget as any)._startY = e.clientY;
                (e.currentTarget as any)._startX = e.clientX;
            }}
            onPointerUp={(e) => {
                const startY = (e.currentTarget as any)._startY;
                const startX = (e.currentTarget as any)._startX;

                if (startY !== undefined && startY !== null && startX !== undefined && startX !== null) {
                    const deltaY = e.clientY - startY;
                    const deltaX = e.clientX - startX;
                    const absDeltaX = Math.abs(deltaX);

                    const isDownSwipe = deltaY > 20 && deltaY > absDeltaX;
                    if (isDownSwipe) {
                        const drawerContent = e.currentTarget.querySelector('.drawer-content');
                        const scrolled = drawerContent ? drawerContent.scrollTop : 0;
                        if (scrolled <= 5 || deltaY > 100 || (e.target as HTMLElement).closest('.drawer-header')) {
                            triggerHaptic(40);
                            onClose();
                        }
                    } else if (absDeltaX > 30 && absDeltaX > Math.abs(deltaY)) {
                        triggerHaptic(40);
                        onClose();
                    }
                }
                (e.currentTarget as any)._startY = null;
                (e.currentTarget as any)._startX = null;
            }}
            onPointerCancel={(e) => {
                (e.currentTarget as any)._startY = null;
                (e.currentTarget as any)._startX = null;
            }}
            style={{ touchAction: 'pan-x pan-y' }}
        >
            <div className="drawer-header"
                style={{ cursor: 'ns-resize', touchAction: 'none', height: '60px', padding: '0 20px', display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.03)' }}
            >
                <div className="swipe-indicator" style={{ position: 'absolute', top: '12px', left: '50%', transform: 'translateX(-50%)', width: '60px', height: '6px', background: 'rgba(255,255,255,0.3)', borderRadius: '3px' }} />
                <span style={{ fontWeight: 'bold', fontSize: '1rem', letterSpacing: '1px' }}>Inventory</span>
                <button onClick={() => { triggerHaptic(20); onClose(); }} style={{ marginLeft: 'auto', background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', width: '32px', height: '32px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', cursor: 'pointer' }}>✕</button>
            </div>
            <div className="drawer-content" style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', touchAction: 'pan-y', padding: '10px' }}>
                {inventoryLines.length === 0 ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', opacity: 0.3 }}>
                        <span>Inventory is currently empty</span>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {inventoryLines.map(line => {
                            const depth = line.depth || 0;
                            return (
                                <div
                                    key={line.id}
                                    className={line.isItem ? "inline-btn auto-item" : ""}
                                    draggable={line.isItem}
                                    onDragStart={(e) => {
                                        if (!line.isItem) return;
                                        const dragData = {
                                            type: 'inline-btn',
                                            cmd: 'inventorylist',
                                            context: line.context,
                                            id: `inv-${line.id}`
                                        };
                                        e.dataTransfer.setData('application/json', JSON.stringify(dragData));
                                        e.dataTransfer.effectAllowed = 'move';

                                        // Optional: add a dragging class for visual feedback
                                        e.currentTarget.classList.add('dragging');
                                        triggerHaptic(10);
                                    }}
                                    onDragEnd={(e) => {
                                        e.currentTarget.classList.remove('dragging');
                                    }}
                                    onClick={(e) => {
                                        if (!line.isItem) return;
                                        triggerHaptic(20);
                                        handleButtonClick({
                                            id: `inv-${line.id}`,
                                            command: 'inventorylist',
                                            label: line.context || 'Item',
                                            actionType: 'menu'
                                        } as any, e, line.context);
                                    }}
                                    style={{
                                        padding: '8px 12px',
                                        background: line.isItem ?
                                            (line.isContainer ? 'rgba(137, 180, 250, 0.15)' : 'rgba(100, 255, 100, 0.08)')
                                            : 'rgba(0,0,0,0.2)',
                                        borderRadius: depth > 0 ? '0 6px 6px 0' : '6px',
                                        border: '1px solid rgba(255,255,255,0.05)',
                                        borderLeft: depth > 0 ? `${depth * 3}px solid #89b4fa` : '1px solid rgba(255,255,255,0.05)',
                                        fontSize: depth > 0 ? '0.8rem' : '0.85rem',
                                        cursor: line.isItem ? 'pointer' : 'default',
                                        marginLeft: `${depth * 20}px`,
                                        fontWeight: line.isContainer ? 'bold' : 'normal',
                                        color: line.isContainer ? '#89b4fa' : (depth > 0 ? 'rgba(255,255,255,0.8)' : 'inherit'),
                                        transition: 'all 0.2s ease'
                                    }}
                                    dangerouslySetInnerHTML={{ __html: line.html }}
                                />
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};
