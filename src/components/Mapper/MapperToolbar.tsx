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
}

export const MapperToolbar: React.FC<MapperToolbarProps> = ({
    mode, setMode, autoCenter, setAutoCenter, setIsMinimized, isMobile, isExpanded, onCenterClick, onAddRoom, setIsDropdownOpen
}) => {
    if (isMobile && !isExpanded) return null;

    return (
        <div style={{ position: 'absolute', top: '8px', left: '8px', zIndex: 10, backgroundColor: 'rgba(30, 30, 46, 0.9)', padding: '4px', borderRadius: '4px', border: '1px solid #313244', display: 'flex', gap: '8px', alignItems: 'center', backdropFilter: 'blur(4px)', fontSize: '12px' }}>
            <div style={{ display: 'flex', backgroundColor: '#313244', borderRadius: '4px', overflow: 'hidden' }}>
                <button
                    style={{ padding: '4px 8px', border: 'none', cursor: 'pointer', backgroundColor: mode === 'edit' ? '#89b4fa' : 'transparent', color: mode === 'edit' ? '#11111b' : '#cdd6f4', fontWeight: mode === 'edit' ? 'bold' : 'normal' }}
                    onClick={() => setMode('edit')}
                >
                    Edit
                </button>
                <button
                    style={{ padding: '4px 8px', border: 'none', cursor: 'pointer', backgroundColor: mode === 'play' ? '#a6e3a1' : 'transparent', color: mode === 'play' ? '#11111b' : '#cdd6f4', fontWeight: mode === 'play' ? 'bold' : 'normal' }}
                    onClick={() => setMode('play')}
                >
                    Play
                </button>
            </div>

            {mode === 'edit' && onAddRoom && (
                <button
                    style={{ padding: '4px 8px', border: 'none', cursor: 'pointer', borderRadius: '4px', backgroundColor: '#313244', color: '#89b4fa', display: 'flex', alignItems: 'center', gap: '4px' }}
                    onClick={onAddRoom}
                    title="Add Room at Center"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"></path><path d="M12 5v14"></path></svg>
                    Add
                </button>
            )}

            <button
                style={{ padding: '4px 8px', border: 'none', cursor: 'pointer', borderRadius: '4px', backgroundColor: autoCenter ? '#f9e2af' : '#313244', color: autoCenter ? '#11111b' : '#cdd6f4', display: 'flex', alignItems: 'center', gap: '4px' }}
                onClick={onCenterClick}
                title="Center on player"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="3"></circle></svg>
                Center
            </button>
            <div style={{ width: '1px', height: '16px', backgroundColor: 'rgba(255,255,255,0.1)', margin: '0 2px' }} />
            <button
                style={{ padding: '4px 8px', border: 'none', cursor: 'pointer', borderRadius: '4px', backgroundColor: '#313244', color: '#f38ba8', display: 'flex', alignItems: 'center' }}
                onClick={() => setIsMinimized(true)}
                title="Minimize"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            </button>
            <div style={{ width: '1px', height: '16px', backgroundColor: 'rgba(255,255,255,0.1)', margin: '0 2px' }} />
            <button
                style={{ padding: '4px 8px', border: 'none', cursor: 'pointer', borderRadius: '4px', backgroundColor: '#313244', color: '#cdd6f4', display: 'flex', alignItems: 'center' }}
                onClick={() => setIsDropdownOpen(prev => !prev)}
                title="More Options"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg>
            </button>
        </div>
    );
};
