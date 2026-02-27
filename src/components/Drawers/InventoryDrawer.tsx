import React from 'react';

interface InventoryDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    triggerHaptic: (ms: number) => void;
}

export const InventoryDrawer: React.FC<InventoryDrawerProps> = ({
    isOpen,
    onClose,
    triggerHaptic
}) => {
    return (
        <div
            className={`inventory-drawer ${isOpen ? 'open' : ''}`}
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
                <span style={{ fontWeight: 'bold', fontSize: '1rem', letterSpacing: '1px' }}>Empty Drawer</span>
                <button onClick={() => { triggerHaptic(20); onClose(); }} style={{ marginLeft: 'auto', background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', width: '32px', height: '32px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', cursor: 'pointer' }}>✕</button>
            </div>
            <div className="drawer-content" style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', touchAction: 'pan-y', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: 0.3 }}>
                <span>Bottom Drawer is currently empty</span>
            </div>
        </div>
    );
};
