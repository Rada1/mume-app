import React from 'react';
import { createPortal } from 'react-dom';

interface MapperDropdownProps {
    isOpen: boolean;
    setIsOpen: (open: boolean) => void;
    allowPersistence: boolean;
    setAllowPersistence: (allow: boolean) => void;
    exportMap: () => void;
    importMap: (e: React.ChangeEvent<HTMLInputElement>) => void;
    importMMapper: (e: React.ChangeEvent<HTMLInputElement>) => void;
    clearMap: () => void;
    unveilMap: boolean;
    setUnveilMap: (unveil: boolean) => void;
    onResetSync: () => void;
    isMobile: boolean;
}

export const MapperDropdown: React.FC<MapperDropdownProps> = ({
    isOpen, setIsOpen, allowPersistence, setAllowPersistence,
    exportMap, importMap, importMMapper, clearMap, unveilMap, setUnveilMap, onResetSync,
    isMobile
}) => {
    if (!isOpen) return null;
    
    const dropdownContent = (
        <div style={{ 
            position: isMobile ? 'fixed' : 'absolute', 
            top: isMobile ? 'auto' : '45px', 
            bottom: isMobile ? '120px' : 'auto', 
            left: isMobile ? '15px' : '8px',
            right: isMobile ? 'auto' : 'auto',
            zIndex: 99999,
            pointerEvents: 'auto'
        }}>
            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: -1 }} onClick={() => setIsOpen(false)} />
            <div style={{
                backgroundColor: 'rgba(0, 0, 0, 0.75)',
                backdropFilter: 'blur(16px) saturate(180%)',
                WebkitBackdropFilter: 'blur(16px) saturate(180%)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderBottom: '2px solid var(--accent)',
                borderRadius: '16px',
                padding: '12px',
                minWidth: '220px',
                maxHeight: isMobile ? '45vh' : 'calc(100vh - 150px)',
                overflowY: 'auto',
                boxShadow: '0 20px 60px rgba(0, 0, 0, 0.6)',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                scrollbarWidth: 'none',
                msOverflowStyle: 'none'
            }}>
                <div style={{ padding: '6px 12px', fontSize: '11px', color: '#9399b2', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 'bold' }}>View & Actions</div>

                <button
                    style={{ padding: '10px 14px', backgroundColor: unveilMap ? 'rgba(137, 220, 235, 0.12)' : 'transparent', border: 'none', color: unveilMap ? '#89dceb' : '#cdd6f4', fontSize: '14px', textAlign: 'left', cursor: 'pointer', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}
                    onClick={() => { setUnveilMap(!unveilMap); setIsOpen(false); }}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                    {unveilMap ? "Hide Unexplored" : "Reveal All Rooms"}
                </button>

                <button 
                    style={{ padding: '10px 14px', backgroundColor: 'transparent', border: 'none', color: '#fab387', fontSize: '14px', textAlign: 'left', cursor: 'pointer', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '10px' }} 
                    onClick={() => { onResetSync(); setIsOpen(false); }}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 2v6h-6"></path><path d="M3 12a9 9 0 0 1 15-6.7L21 8"></path><path d="M3 22v-6h6"></path><path d="M21 12a9 9 0 0 1-15 6.7L3 16"></path></svg>
                    Sync to MMapper
                </button>

                <div style={{ height: '1px', backgroundColor: 'rgba(255,255,255,0.1)', margin: '4px 8px' }} />

                <div style={{ padding: '6px 12px', fontSize: '11px', color: '#9399b2', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 'bold' }}>Settings</div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', cursor: 'pointer', userSelect: 'none', borderRadius: '8px' }}>
                    <input type="checkbox" checked={allowPersistence} onChange={(e) => setAllowPersistence(e.target.checked)} style={{ cursor: 'pointer', accentColor: '#a6e3a1', width: '18px', height: '18px' }} />
                    <span style={{ fontSize: '14px', color: allowPersistence ? '#a6e3a1' : '#cdd6f4', fontWeight: 'bold' }}>Session Saving</span>
                </label>
                <div style={{ height: '1px', backgroundColor: 'rgba(255,255,255,0.1)', margin: '4px 8px' }} />
                <button style={{ padding: '10px 14px', backgroundColor: 'transparent', border: 'none', color: '#89b4fa', fontSize: '14px', textAlign: 'left', cursor: 'pointer', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '10px' }} onClick={exportMap}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                    Export Map
                </button>
                <label style={{ padding: '10px 14px', backgroundColor: 'transparent', border: 'none', color: '#a6e3a1', fontSize: '14px', textAlign: 'left', cursor: 'pointer', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                    Import Map
                    <input type="file" onChange={importMap} style={{ display: 'none' }} accept=".json" />
                </label>
                <label style={{ padding: '10px 14px', backgroundColor: 'transparent', border: 'none', color: '#f9e2af', fontSize: '14px', textAlign: 'left', cursor: 'pointer', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                    Import MMapper (.mm2)
                    <input type="file" onChange={importMMapper} style={{ display: 'none' }} accept=".mm2" />
                </label>
                <button style={{ padding: '10px 14px', backgroundColor: 'rgba(243, 139, 168, 0.08)', border: 'none', color: '#f38ba8', fontSize: '14px', textAlign: 'left', cursor: 'pointer', borderRadius: '8px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '10px' }} onClick={clearMap}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                    Clear Map
                </button>
                <div style={{ height: '30px', flexShrink: 0 }} />
            </div>
        </div>
    );

    return isMobile ? createPortal(dropdownContent, document.body) : dropdownContent;
};
