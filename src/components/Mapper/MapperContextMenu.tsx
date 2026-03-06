import React from 'react';

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
}

export const MapperContextMenu: React.FC<MapperContextMenuProps> = ({
    x, y, roomId, onClose, onDelete, onInfo, onAddMarker, onAddRoom, onSyncLocation, onWalkStart, onWalkEnd, mode = 'edit'
}) => {
    return (
        <>
            <div
                style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000 }}
                onPointerDown={onClose}
            />
            <div style={{
                position: 'absolute',
                top: y,
                left: x,
                zIndex: 1001,
                backgroundColor: '#1e1e2e',
                border: '1px solid #313244',
                borderRadius: '8px',
                padding: '4px',
                minWidth: '150px',
                boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                display: 'flex',
                flexDirection: 'column',
                gap: '2px'
            }}>
                {roomId && mode === 'play' && (
                    <button
                        style={{
                            padding: '12px 12px',
                            backgroundColor: '#a6e3a1',
                            border: 'none',
                            color: '#11111b',
                            fontSize: '14px',
                            fontWeight: 'bold',
                            textAlign: 'center',
                            cursor: 'pointer',
                            borderRadius: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            marginBottom: '4px',
                            boxShadow: '0 4px 10px rgba(166, 227, 161, 0.3)',
                            userSelect: 'none',
                            WebkitUserSelect: 'none',
                            touchAction: 'none'
                        }}
                        onPointerDown={(e) => {
                            e.stopPropagation();
                            onWalkStart?.(roomId);
                        }}
                        onPointerUp={(e) => {
                            e.stopPropagation();
                            onWalkEnd?.();
                        }}
                        onPointerLeave={(e) => {
                            e.stopPropagation();
                            onWalkEnd?.();
                        }}
                        onContextMenu={(e) => e.preventDefault()}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M13 4v16"></path><path d="M17 14l-4 4-4-4"></path></svg>
                        HOLD TO WALK
                    </button>
                )}

                {mode === 'edit' && (
                    <button
                        style={{ padding: '8px 12px', backgroundColor: 'transparent', border: 'none', color: '#cdd6f4', fontSize: '13px', textAlign: 'left', cursor: 'pointer', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        onClick={(e) => { e.stopPropagation(); onSyncLocation(); }}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M16.2 7.8l-2 6.3-6.4 2.1 2-6.3 6.4-2.1z"></path></svg>
                        Sync Player Here
                    </button>
                )}

                {roomId ? (
                    <>
                        <button
                            style={{ padding: '8px 12px', backgroundColor: 'transparent', border: 'none', color: '#89b4fa', fontSize: '13px', textAlign: 'left', cursor: 'pointer', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}
                            onClick={(e) => { e.stopPropagation(); onInfo(); }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(137, 180, 250, 0.1)'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                            Room Info
                        </button>
                        {mode === 'edit' && (
                            <button
                                style={{ padding: '8px 12px', backgroundColor: 'transparent', border: 'none', color: '#f38ba8', fontSize: '13px', textAlign: 'left', cursor: 'pointer', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}
                                onClick={(e) => { e.stopPropagation(); onDelete(); }}
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(243, 139, 168, 0.1)'}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                                Delete Room
                            </button>
                        )}
                    </>
                ) : (
                    mode === 'edit' && (
                        <button
                            style={{ padding: '8px 12px', backgroundColor: 'transparent', border: 'none', color: '#89b4fa', fontSize: '13px', textAlign: 'left', cursor: 'pointer', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}
                            onClick={(e) => { e.stopPropagation(); onAddRoom(); }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(137, 180, 250, 0.1)'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line></svg>
                            Add Room
                        </button>
                    )
                )}

                {mode === 'edit' && (
                    <button
                        style={{ padding: '8px 12px', backgroundColor: 'transparent', border: 'none', color: '#a6e3a1', fontSize: '13px', textAlign: 'left', cursor: 'pointer', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}
                        onClick={(e) => { e.stopPropagation(); onAddMarker(); }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(166, 227, 161, 0.1)'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line></svg>
                        Add Marker
                    </button>
                )}
            </div>
        </>
    );
};
