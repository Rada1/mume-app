/**
 * @file MapperContextMenu.tsx
 * @description Right-click actions for mapped rooms and empty map locations.
 */
import React from 'react';
import './MapperContextMenu.css';

// --- Types ---
interface MapperContextMenuProps {
    x: number;
    y: number;
    roomId: string | null;
    onClose: () => void;
    onDelete: () => void;
    onInfo: () => void;
    onAddMarker: () => void;
    onAddRoom: () => void;
    onSyncLocation: () => void;
    onWalkStart?: (roomId: string) => void;
    onWalkEnd?: () => void;
    mode?: 'edit' | 'play';
    isDarkMode: boolean;
    isMobile?: boolean;
}

// --- Component ---
export const MapperContextMenu: React.FC<MapperContextMenuProps> = ({
    x,
    y,
    roomId,
    onClose,
    onDelete,
    onInfo,
    onAddMarker,
    onAddRoom,
    onSyncLocation,
    onWalkStart,
    mode = 'edit',
    isMobile = false
}) => {
    const menu = (
    <>
        <div
            className="mapper-context-menu-backdrop"
            aria-hidden="true"
            data-mobile={isMobile || undefined}
            onPointerDown={onClose}
        />
        <div
            className="mapper-context-menu"
            role="menu"
            data-mobile={isMobile || undefined}
            style={{
                top: `clamp(8px, ${y}px, calc(100% - ${mode === 'edit' ? 194 : 116}px))`,
                left: `clamp(8px, ${x}px, calc(100% - ${isMobile ? 216 : 176}px))`,
                maxHeight: 'calc(100% - 16px)'
            }}
        >
            {mode === 'edit' && (
                <button
                    type="button"
                    role="menuitem"
                    className="mapper-context-menu-action mapper-context-menu-action--muted"
                    onClick={(event) => { event.stopPropagation(); onSyncLocation(); }}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M16.2 7.8l-2 6.3-6.4 2.1 2-6.3 6.4-2.1z"></path></svg>
                    Sync Player Here
                </button>
            )}

            {roomId ? (
                <>
                    <button
                        type="button"
                        role="menuitem"
                        className="mapper-context-menu-action"
                        onClick={(event) => { event.stopPropagation(); onInfo(); }}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                        Room Info
                    </button>
                    {onWalkStart && (
                        <button
                            type="button"
                            role="menuitem"
                            className="mapper-context-menu-action mapper-context-menu-action--walk"
                            onClick={(event) => { event.stopPropagation(); onWalkStart(roomId); onClose(); }}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 4v6h6"></path><path d="M19 10a7 7 0 1 1-2.05-4.95"></path></svg>
                            Walk Here
                        </button>
                    )}
                    {mode === 'edit' && (
                        <button
                            type="button"
                            role="menuitem"
                            className="mapper-context-menu-action mapper-context-menu-action--danger"
                            onClick={(event) => { event.stopPropagation(); onDelete(); }}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                            Delete Room
                        </button>
                    )}
                </>
            ) : (
                mode === 'edit' && (
                    <button
                        type="button"
                        role="menuitem"
                        className="mapper-context-menu-action"
                        onClick={(event) => { event.stopPropagation(); onAddRoom(); }}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line></svg>
                        Add Room
                    </button>
                )
            )}

            {mode === 'edit' && (
                <button
                    type="button"
                    role="menuitem"
                    className="mapper-context-menu-action mapper-context-menu-action--walk"
                    onClick={(event) => { event.stopPropagation(); onAddMarker(); }}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line></svg>
                    Add Marker
                </button>
            )}
        </div>
    </>
    );

    return menu;
};
