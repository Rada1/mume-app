import React from 'react';
import { DrawerLine } from '../../types';

interface MendingFooterProps {
    isMendingMode: boolean;
    setIsMendingMode: (val: boolean) => void;
    setMendingTarget: (val: string | null) => void;
    selectedItems: Set<string>;
    setSelectedItems: (val: Set<string>) => void;
    eqLines: DrawerLine[];
    inventoryLines: DrawerLine[];
    executeCommand: (cmd: string, silent?: boolean, isSystem?: boolean, isHistorical?: boolean, fromDrawer?: boolean) => void;
    onClose: () => void;
}

export const MendingFooter: React.FC<MendingFooterProps> = ({
    isMendingMode, setIsMendingMode, setMendingTarget, selectedItems, setSelectedItems, eqLines, inventoryLines, executeCommand, onClose
}) => {
    if (!isMendingMode) return null;

    return (
        <div className="drawer-footer mending-footer" style={{
            padding: '12px',
            margin: '10px 15px 20px',
            borderRadius: '16px',
            border: '1px solid rgba(255,255,255,0.1)',
            display: 'flex',
            gap: '10px',
            background: 'rgba(15, 23, 42, 0.7)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
            pointerEvents: 'auto'
        }}>
            <button
                className="footer-btn mend-cancel-btn"
                onClick={() => {
                    setIsMendingMode(false);
                    setMendingTarget(null);
                    setSelectedItems(new Set());
                }}
                style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '8px',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: '#fff'
                }}
            >
                Cancel
            </button>
            <button
                className="footer-btn mend-confirm-btn"
                disabled={selectedItems.size === 0}
                onClick={() => {
                    const items = Array.from(selectedItems).map(id => {
                        const line = [...eqLines, ...inventoryLines].find(l => l.id === id);
                        if (!line) return null;
                        const isEq = eqLines.some(l => l.id === id);
                        return { handle: line.context || line.id, isEq };
                    }).filter(Boolean);

                    items.forEach((item, index) => {
                        setTimeout(() => {
                            if (item?.isEq) {
                                executeCommand(`remove ${item.handle}`, false, false);
                                executeCommand(`mend ${item.handle}`, false, false);
                            } else {
                                executeCommand(`mend ${item?.handle}`, false, false);
                            }
                        }, index * 350); // Stagger commands
                    });

                    setIsMendingMode(false);
                    setMendingTarget(null);
                    setSelectedItems(new Set());
                    onClose();
                }}
                style={{
                    flex: 2,
                    padding: '12px',
                    borderRadius: '8px',
                    background: selectedItems.size > 0 ? 'var(--accent)' : 'rgba(255,255,255,0.02)',
                    border: 'none',
                    color: selectedItems.size > 0 ? '#000' : 'rgba(255,255,255,0.2)',
                    fontWeight: 'bold',
                    opacity: selectedItems.size > 0 ? 1 : 0.5
                }}
            >
                Mend Selected ({selectedItems.size})
            </button>
        </div>
    );
};
