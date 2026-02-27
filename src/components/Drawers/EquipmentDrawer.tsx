import React from 'react';

interface EquipmentDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    eqHtml: string;
    inventoryHtml: string;
    handleLogClick: (e: React.MouseEvent) => void;
    triggerHaptic: (ms: number) => void;
}

export const EquipmentDrawer: React.FC<EquipmentDrawerProps> = ({
    isOpen,
    onClose,
    eqHtml,
    inventoryHtml,
    handleLogClick,
    triggerHaptic
}) => {
    return (
        <div
            className={`right-drawer ${isOpen ? 'open' : ''}`}
            onPointerDown={(e) => {
                const target = e.target as HTMLElement;
                if (target.closest('button') || target.closest('a') || target.closest('.inline-btn') || target.tagName === 'INPUT') return;
                e.currentTarget.setPointerCapture(e.pointerId);
                (e.currentTarget as any)._startX = e.clientX;
                (e.currentTarget as any)._startY = e.clientY;
            }}
            onPointerUp={(e) => {
                const startX = (e.currentTarget as any)._startX;
                const startY = (e.currentTarget as any)._startY;
                if (startX !== undefined && startX !== null) {
                    const deltaX = e.clientX - startX;
                    const deltaY = Math.abs(e.clientY - (startY || 0));
                    if (deltaX > 20 && deltaX > deltaY) {
                        triggerHaptic(40);
                        onClose();
                    }
                }
                (e.currentTarget as any)._startX = null;
                (e.currentTarget as any)._startY = null;
            }}
            onPointerCancel={(e) => {
                (e.currentTarget as any)._startX = null;
                (e.currentTarget as any)._startY = null;
            }}
            style={{ touchAction: 'pan-y' }}
        >
            <div className="drawer-header">
                <span style={{ fontWeight: 'bold', fontSize: '1rem', letterSpacing: '1px' }}>Equipment & Inventory</span>
                <button onClick={() => { triggerHaptic(20); onClose(); }} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', width: '32px', height: '32px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', cursor: 'pointer' }}>✕</button>
            </div>
            <div className="drawer-content" style={{ display: 'flex', flexDirection: 'column', gap: '15px', flex: 1, overflow: 'hidden' }}>
                <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '45px', display: 'flex', alignItems: 'center', justifyContent: 'flex-start', paddingLeft: '10px', zIndex: 100 }}>
                    <div style={{ width: '6px', height: '80px', background: 'rgba(255,255,255,0.4)', borderRadius: '3px' }} />
                </div>

                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                    <div style={{ fontWeight: 'bold', color: 'var(--accent)', marginBottom: '8px', borderBottom: '1px solid rgba(74, 222, 128, 0.3)', fontSize: '0.8rem', letterSpacing: '2px', flexShrink: 0, paddingBottom: '6px' }}>EQUIPMENT</div>
                    <div className="drawer-section-content" onClick={handleLogClick} style={{ flex: 1, overflow: 'auto', fontSize: '0.85rem', lineHeight: '1.5', background: 'rgba(0,0,0,0.3)', padding: '10px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', WebkitOverflowScrolling: 'touch' }} dangerouslySetInnerHTML={{ __html: eqHtml }} />
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                    <div style={{ fontWeight: 'bold', color: 'var(--accent)', marginBottom: '8px', borderBottom: '1px solid rgba(74, 222, 128, 0.3)', fontSize: '0.8rem', letterSpacing: '2px', flexShrink: 0, paddingBottom: '6px' }}>INVENTORY</div>
                    <div className="drawer-section-content" onClick={handleLogClick} style={{ flex: 1, overflow: 'auto', fontSize: '0.85rem', lineHeight: '1.5', background: 'rgba(0,0,0,0.3)', padding: '10px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', WebkitOverflowScrolling: 'touch' }} dangerouslySetInnerHTML={{ __html: inventoryHtml }} />
                </div>
            </div>
        </div>
    );
};
