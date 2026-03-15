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
    onUndock?: () => void;
    isDarkMode: boolean;
    isMapFloating: boolean;
    setIsMapFloating: (floating: boolean) => void;
}

export const MapperToolbar: React.FC<MapperToolbarProps> = ({
    mode, setMode, autoCenter, setAutoCenter, setIsMinimized, isMobile, isExpanded, onCenterClick, onAddRoom, setIsDropdownOpen,
    unveilMap, setUnveilMap, onResetSync, onUndock, isDarkMode, isMapFloating, setIsMapFloating
}) => {
    if (isMobile && !isExpanded) return null;

    // Use icon-only mode if floating or mobile tray is narrow
    const showLabels = !isMapFloating && isExpanded;

    return (
        <div 
            onPointerDown={(e) => e.stopPropagation()} // Shield buttons from map gestures
            style={{
                position: 'absolute',
                top: '8px',
                left: '8px',
                zIndex: 3000,
                backgroundColor: isDarkMode ? 'rgba(30, 30, 46, 0.9)' : 'rgba(255, 255, 255, 0.9)',
                padding: '4px',
                borderRadius: '6px',
                border: isDarkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)',
                display: 'flex',
                gap: '4px',
                alignItems: 'center',
                backdropFilter: 'blur(8px)',
                fontSize: '11px',
                flexWrap: 'nowrap',
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                pointerEvents: 'auto'
            }}
        >
            <div style={{ display: 'flex', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden', flexShrink: 0 }}>
                <button
                    style={{ padding: '4px 8px', border: 'none', cursor: 'pointer', backgroundColor: mode === 'edit' ? '#89b4fa' : 'transparent', color: mode === 'edit' ? '#11111b' : '#cdd6f4', fontWeight: 'bold', transition: 'all 0.2s' }}
                    onClick={(e) => { e.stopPropagation(); setMode('edit'); }}
                    title="Edit Mode"
                >
                    {showLabels ? 'Edit' : 'E'}
                </button>
                <button
                    style={{ padding: '4px 8px', border: 'none', cursor: 'pointer', backgroundColor: mode === 'play' ? '#a6e3a1' : 'transparent', color: mode === 'play' ? '#11111b' : '#cdd6f4', fontWeight: 'bold', transition: 'all 0.2s' }}
                    onClick={(e) => { e.stopPropagation(); setMode('play'); }}
                    title="Play Mode"
                >
                    {showLabels ? 'Play' : 'P'}
                </button>
            </div>

            <div style={{ width: '1px', height: '14px', backgroundColor: 'rgba(255,255,255,0.1)', flexShrink: 0 }} />

            <button
                style={{
                    padding: '4px 6px', border: 'none', cursor: 'pointer', borderRadius: '4px',
                    backgroundColor: autoCenter ? '#f9e2af' : 'transparent', color: autoCenter ? '#11111b' : '#cdd6f4',
                    display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0, transition: 'all 0.2s'
                }}
                onClick={(e) => { e.stopPropagation(); onCenterClick(); }}
                title="Center on player"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="3"></circle></svg>
                {showLabels && "Center"}
            </button>

            <div style={{ width: '1px', height: '14px', backgroundColor: 'rgba(255,255,255,0.1)', flexShrink: 0 }} />

            <button
                style={{
                    padding: '4px 6px', border: 'none', cursor: 'pointer', borderRadius: '4px',
                    backgroundColor: 'transparent', color: '#cdd6f4', display: 'flex',
                    alignItems: 'center', gap: '4px', transition: 'all 0.2s'
                }}
                onClick={(e) => { e.stopPropagation(); setIsDropdownOpen(prev => !prev); }}
                title="Map Menu"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="3" y1="12" x2="21" y2="12"></line>
                    <line x1="3" y1="6" x2="21" y2="6"></line>
                    <line x1="3" y1="18" x2="21" y2="18"></line>
                </svg>
                {showLabels && "Menu"}
            </button>
        </div>
    );
};
