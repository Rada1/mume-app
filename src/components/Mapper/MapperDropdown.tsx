import React from 'react';

interface MapperDropdownProps {
    isOpen: boolean;
    setIsOpen: (open: boolean) => void;
    allowPersistence: boolean;
    setAllowPersistence: (allow: boolean) => void;
    isDarkMode: boolean;
    setIsDarkMode: (dark: boolean) => void;
    exportMap: () => void;
    importMap: (e: React.ChangeEvent<HTMLInputElement>) => void;
    importMMapper: (e: React.ChangeEvent<HTMLInputElement>) => void;
    clearMap: () => void;
}

export const MapperDropdown: React.FC<MapperDropdownProps> = ({
    isOpen, setIsOpen, allowPersistence, setAllowPersistence, isDarkMode, setIsDarkMode,
    exportMap, importMap, importMMapper, clearMap
}) => {
    if (!isOpen) return null;

    return (
        <div style={{ position: 'absolute', top: '8px', right: '8px', zIndex: 100 }}>

            <>
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: -1 }} onClick={() => setIsOpen(false)} />
                <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: '8px', backgroundColor: '#1e1e2e', border: '1px solid #313244', borderRadius: '8px', padding: '8px', minWidth: '180px', boxShadow: '0 10px 25px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ padding: '6px 12px', fontSize: '11px', color: '#585b70', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 'bold' }}>Settings</div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', cursor: 'pointer', userSelect: 'none', borderRadius: '4px' }}>
                        <input type="checkbox" checked={allowPersistence} onChange={(e) => setAllowPersistence(e.target.checked)} style={{ cursor: 'pointer', accentColor: '#a6e3a1', width: '16px', height: '16px' }} />
                        <span style={{ fontSize: '13px', color: allowPersistence ? '#a6e3a1' : '#f38ba8', fontWeight: 'bold' }}>Session Saving</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', cursor: 'pointer', userSelect: 'none', borderRadius: '4px' }}>
                        <input type="checkbox" checked={isDarkMode} onChange={(e) => setIsDarkMode(e.target.checked)} style={{ cursor: 'pointer', accentColor: '#cba6f7', width: '16px', height: '16px' }} />
                        <span style={{ fontSize: '13px', color: isDarkMode ? '#cba6f7' : '#fab387', fontWeight: 'bold' }}>Dark Mode</span>
                    </label>
                    <div style={{ height: '1px', backgroundColor: '#313244', margin: '4px 8px' }} />
                    <button style={{ padding: '8px 12px', backgroundColor: 'transparent', border: 'none', color: '#89b4fa', fontSize: '13px', textAlign: 'left', cursor: 'pointer', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '8px' }} onClick={exportMap}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                        Export Map
                    </button>
                    <label style={{ padding: '8px 12px', backgroundColor: 'transparent', border: 'none', color: '#a6e3a1', fontSize: '13px', textAlign: 'left', cursor: 'pointer', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                        Import Map
                        <input type="file" onChange={importMap} style={{ display: 'none' }} accept=".json" />
                    </label>
                    <label style={{ padding: '8px 12px', backgroundColor: 'transparent', border: 'none', color: '#f9e2af', fontSize: '13px', textAlign: 'left', cursor: 'pointer', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                        Import MMapper (.mm2)
                        <input type="file" onChange={importMMapper} style={{ display: 'none' }} accept=".mm2" />
                    </label>
                    <button style={{ padding: '8px 12px', backgroundColor: 'rgba(243, 139, 168, 0.05)', border: 'none', color: '#f38ba8', fontSize: '13px', textAlign: 'left', cursor: 'pointer', borderRadius: '4px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }} onClick={clearMap}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                        Clear Map
                    </button>
                </div>
            </>
        </div>
    );
};
