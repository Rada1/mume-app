import React from 'react';

interface MapperToolbarProps {
    mode: 'edit' | 'play';
    setMode: (mode: 'edit' | 'play') => void;
    autoCenter: boolean;
    setAutoCenter: (auto: boolean) => void;
    setIsMinimized: (min: boolean) => void;
    isMobile: boolean;
    isExpanded: boolean;
    onCenterClick: () => void;
    onAddRoom?: () => void;
    setIsDropdownOpen: React.Dispatch<React.SetStateAction<boolean>>;
    unveilMap?: boolean;
    setUnveilMap?: (unveil: boolean) => void;
    onResetSync?: () => void;
}

export const MapperToolbar: React.FC<MapperToolbarProps> = ({
    mode, setMode, autoCenter, setAutoCenter, setIsMinimized, isMobile, isExpanded, onCenterClick, onAddRoom, setIsDropdownOpen,
    unveilMap, setUnveilMap, onResetSync
}) => {
    if (isMobile && !isExpanded) return null;

    return (
        <div style={{
            position: 'absolute',
            top: '8px',
            left: '8px',
            zIndex: 10,
            backgroundColor: 'rgba(30, 30, 46, 0.9)',
            padding: '4px',
            borderRadius: '6px',
            border: '1px solid rgba(255,255,255,0.1)',
            display: 'flex',
            gap: '4px',
            alignItems: 'center',
            backdropFilter: 'blur(8px)',
            fontSize: '11px',
            flexWrap: 'nowrap',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
        }}>
            <div style={{ display: 'flex', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden', flexShrink: 0 }}>
                <button
                    style={{ padding: '4px 6px', border: 'none', cursor: 'pointer', backgroundColor: mode === 'edit' ? '#89b4fa' : 'transparent', color: mode === 'edit' ? '#11111b' : '#cdd6f4', fontWeight: mode === 'edit' ? 'bold' : 'normal', transition: 'all 0.2s' }}
                    onClick={() => setMode('edit')}
                >
                    {isExpanded ? 'Edit' : 'E'}
                </button>
                <button
                    style={{ padding: '4px 6px', border: 'none', cursor: 'pointer', backgroundColor: mode === 'play' ? '#a6e3a1' : 'transparent', color: mode === 'play' ? '#11111b' : '#cdd6f4', fontWeight: mode === 'play' ? 'bold' : 'normal', transition: 'all 0.2s' }}
                    onClick={() => setMode('play')}
                >
                    {isExpanded ? 'Play' : 'P'}
                </button>
            </div>

            <div style={{ width: '1px', height: '14px', backgroundColor: 'rgba(255,255,255,0.1)', flexShrink: 0 }} />

            <button
                onClick={() => setUnveilMap?.(!unveilMap)}
                style={{
                    display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 6px', borderRadius: '4px',
                    backgroundColor: unveilMap ? '#89dceb' : 'transparent', color: unveilMap ? '#11111b' : '#cdd6f4',
                    border: 'none', cursor: 'pointer', flexShrink: 0, transition: 'all 0.2s'
                }}
                title={unveilMap ? "Hide unexplored rooms" : "Show all unexplored rooms"}
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                {isExpanded && (unveilMap ? "OFF" : "ON")}
            </button>

            {onResetSync && (
                <button
                    onClick={onResetSync}
                    style={{ padding: '4px 6px', border: 'none', cursor: 'pointer', borderRadius: '4px', backgroundColor: 'transparent', color: '#fab387', display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}
                    title="Reset local map and Sync to MMapper"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 2v6h-6"></path><path d="M3 12a9 9 0 0 1 15-6.7L21 8"></path><path d="M3 22v-6h6"></path><path d="M21 12a9 9 0 0 1-15 6.7L3 16"></path></svg>
                    {isExpanded && "Sync"}
                </button>
            )}

            <div style={{ width: '1px', height: '14px', backgroundColor: 'rgba(255,255,255,0.1)', flexShrink: 0 }} />

            <button
                style={{
                    padding: '4px 6px', border: 'none', cursor: 'pointer', borderRadius: '4px',
                    backgroundColor: autoCenter ? '#f9e2af' : 'transparent', color: autoCenter ? '#11111b' : '#cdd6f4',
                    display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0, transition: 'all 0.2s'
                }}
                onClick={onCenterClick}
                title="Center on player"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="3"></circle></svg>
                {isExpanded && "Center"}
            </button>


            <button
                style={{
                    padding: '4px 6px', border: 'none', cursor: 'pointer', borderRadius: '4px',
                    backgroundColor: 'transparent', color: '#cdd6f4', display: 'flex',
                    alignItems: 'center', gap: '4px', transition: 'all 0.2s'
                }}
                onClick={() => setIsDropdownOpen(prev => !prev)}
                title="More Options"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="2"></circle>
                    <circle cx="12" cy="5" r="2"></circle>
                    <circle cx="12" cy="19" r="2"></circle>
                </svg>
                {isExpanded && "More"}
            </button>

            <button
                style={{ padding: '4px 6px', border: 'none', cursor: 'pointer', borderRadius: '4px', backgroundColor: 'transparent', color: '#f38ba8', display: 'flex', alignItems: 'center', transition: 'all 0.2s' }}
                onClick={() => setIsMinimized(true)}
                title="Minimize"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            </button>
        </div>
    );
};
