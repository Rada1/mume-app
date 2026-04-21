import React from 'react';
import { useGame } from '../../context/GameContext';

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
    isDarkMode: boolean;
}

export const MapperToolbar: React.FC<MapperToolbarProps> = ({
    mode, setMode, autoCenter, setIsMinimized, isMobile, isExpanded, onCenterClick, setIsDropdownOpen,
}) => {
    const { viewport, ui } = useGame();

    const showLabels = isExpanded;
    const isPortrait = isMobile && !viewport.isLandscape;

    const toolbarContent = (
        <>
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
        </>
    );

    if (isPortrait) {
        if (!ui.showMapperToolbar) return null;

        return (
            <div 
                className="mapper-minimal-settings"
                style={{
                    position: 'absolute',
                    top: '12px',
                    left: '12px',
                    zIndex: 9999,
                    pointerEvents: 'auto'
                }}
            >
                <div 
                    style={{
                        backgroundColor: 'rgba(255, 255, 255, 0.08)',
                        backdropFilter: 'blur(30px)',
                        WebkitBackdropFilter: 'blur(30px)',
                        padding: '8px',
                        borderRadius: '12px',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        display: 'flex',
                        gap: '8px',
                        alignItems: 'center',
                        flexDirection: 'row',
                        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.6)',
                        whiteSpace: 'nowrap'
                    }}
                >
                    {toolbarContent}
                </div>
            </div>
        );
    }

    return (
        <div 
            onPointerDown={(e) => e.stopPropagation()} // Shield buttons from map gestures
            style={{
                position: 'absolute',
                top: '8px',
                left: '8px',
                zIndex: 3000,
                backgroundColor: 'rgba(15, 23, 42, 0.4)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                padding: '6px',
                borderRadius: '10px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                display: 'flex',
                gap: '8px',
                alignItems: 'center',
                fontSize: '11px',
                flexWrap: 'nowrap',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
                pointerEvents: 'auto'
            }}
        >
            {toolbarContent}
        </div>
    );
};
