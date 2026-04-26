/**
 * @file DrawerShell.tsx
 * @description Common container for all side drawers.
 */

import React, { ReactNode, useRef } from 'react';
import { X } from 'lucide-react';
import { useUI } from '../../context/GameContext';

interface DrawerShellProps {
    id: string;
    side: 'left' | 'right';
    title?: string;
    children: ReactNode;
}

export const DrawerShell: React.FC<DrawerShellProps> = ({ id, side, title, children }) => {
    const { ui, setUI, triggerHaptic } = useUI();
    const isOpen = ui.drawer === id || (id === 'inventory' && ui.drawer === 'equipment') || (id === 'equipment' && ui.drawer === 'inventory');
    const drawerRef = useRef<HTMLDivElement>(null);

    if (!isOpen) return null;

    const handleClose = () => {
        triggerHaptic(15);
        setUI(prev => ({ ...prev, drawer: 'none' }));
    };

    return (
        <div className={`log-card-drawer drawer-shell ${id}-drawer ${side}-drawer open`}>
            <div className="drawer-header" style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '6px 10px',
                pointerEvents: 'auto'
            }}>
                <span className="drawer-title" style={{ opacity: 0.4, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
                    {title || id}
                </span>
                {window.innerWidth > 1024 && (
                    <button 
                        className="drawer-close-btn"
                        onClick={handleClose}
                        style={{
                            background: 'rgba(255,255,255,0.08)',
                            border: 'none',
                            color: '#fff',
                            width: '28px',
                            height: '28px',
                            borderRadius: '14px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer'
                        }}
                    >
                        <X size={14} />
                    </button>
                )}
            </div>
            <div className="drawer-content" style={{ flex: 1, overflow: 'hidden' }}>
                {children}
            </div>
        </div>
    );
};
