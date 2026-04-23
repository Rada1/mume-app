import React, { useRef } from 'react';
import { InventoryView } from './Views/InventoryView';
import { GameEntity, InlineCategoryConfig, CustomButton } from '../../types';

interface InventoryDrawerProps {
    isOpen: boolean;
    isPeeking?: boolean;
    onClose: () => void;
    inventoryLines: any[];
    eqLines: any[];
    handleButtonClick: (button: CustomButton, e: React.MouseEvent, context?: string, isContainer?: boolean, parentNoun?: string) => void;
    triggerHaptic: (intensity: number) => void;
    isLandscape?: boolean;
    executeCommand: (cmd: string, silent?: boolean, isSystem?: boolean, isHistorical?: boolean, fromDrawer?: boolean) => void;
    pendingDrawerContainerRef?: React.MutableRefObject<{ containerId: string; cmd: 'inventorylist' | 'equipmentlist'; afterId: string } | null>;
    inlineCategories: InlineCategoryConfig[];
    entities: Record<string, GameEntity>;
    keywordOverrides: Record<string, string>;
}

export const InventoryDrawer: React.FC<InventoryDrawerProps> = (props) => {
    const drawerRef = useRef<HTMLDivElement>(null);

    return (
        <div
            ref={drawerRef}
            className={`inventory-drawer log-card-drawer ${props.isOpen ? 'open' : ''} ${props.isPeeking ? 'peeking' : ''}`}
        >
            <div className="drawer-header" style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                padding: '6px 10px',
                background: 'transparent',
                marginBottom: '4px',
                pointerEvents: 'auto',
                position: 'relative',
                zIndex: 10
            }}>
                {window.innerWidth > 1024 && (
                    <button
                        onClick={() => { props.triggerHaptic?.(20); props.onClose(); }}
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
                            fontSize: '14px',
                            cursor: 'pointer',
                            flexShrink: 0
                        }}
                    >✕</button>
                )}
            </div>
            <InventoryView {...props} />
        </div>
    );
};
