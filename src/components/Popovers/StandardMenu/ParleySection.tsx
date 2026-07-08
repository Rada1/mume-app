import React from 'react';
import { ParleyState, PopoverState, MessageType } from '../../../types';
import { sanitizeMumeHtml } from '../../../utils/securityUtils';

interface ParleySectionProps {
    type: 'command' | 'target';
    parley: ParleyState;
    setParley: (val: ParleyState) => void;
    favorites: string[];
    setFavorites: (val: string[] | ((prev: string[]) => string[])) => void;
    whoList: string[];
    triggerHaptic?: (ms: number) => void;
    setPopoverState: React.Dispatch<React.SetStateAction<PopoverState | null>>;
}

export const ParleySection: React.FC<ParleySectionProps> = ({
    type, parley, setParley, favorites, setFavorites, whoList, triggerHaptic, setPopoverState
}) => {
    if (type === 'command') {
        const COMMANDS = ['tell', 'whisper', 'ask', 'say', 'narrate', 'shout', 'yell', 'sing', 'emote'];
        const favCmds = COMMANDS.filter(c => favorites.includes(`parley-cmd-${c}`));
        const otherCmds = COMMANDS.filter(c => !favorites.includes(`parley-cmd-${c}`));

        const renderCmd = (cmd: string) => {
            const favKey = `parley-cmd-${cmd}`;
            const isFav = favorites.includes(favKey);
            const isActive = parley.command === cmd;
            return (
                <div key={cmd} className="popover-item" data-menu-item="true"
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                    onClick={() => { 
                        triggerHaptic?.(20); 
                        setParley({ ...parley, command: cmd as any }); 
                        setPopoverState(null); 
                    }}>
                    <span style={{ pointerEvents: 'none' }}>
                        {isActive && <span style={{ marginRight: 6, color: 'var(--accent)', fontSize: '0.9rem' }}>✓ </span>}
                        {cmd.toUpperCase()}
                    </span>
                    <div className={`favorite-star ${isFav ? 'active' : ''}`}
                        onClick={(e) => { 
                            e.stopPropagation(); 
                            setFavorites(prev => isFav ? prev.filter(f => f !== favKey) : [...prev, favKey]); 
                        }}
                        style={{ opacity: isFav ? 1 : 0.3, color: isFav ? '#ffd700' : 'inherit', fontSize: '1.2rem', padding: '16px 20px', margin: '-16px -16px -16px auto', cursor: 'pointer', userSelect: 'none', WebkitTapHighlightColor: 'transparent' }}>
                        {isFav ? '★' : '☆'}
                    </div>
                </div>
            );
        };

        return (
            <>
                {favCmds.length > 0 && (
                    <>
                        <div style={{ padding: '4px 8px', fontSize: '0.65rem', opacity: 0.5, textTransform: 'uppercase', letterSpacing: '1px', borderBottom: '1px solid rgba(255,255,255,0.05)', color: 'var(--accent)' }}>★ Favorites</div>
                        {favCmds.map(renderCmd)}
                        <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', margin: '4px 0' }} />
                    </>
                )}
                {otherCmds.map(renderCmd)}
            </>
        );
    }

    // Target selection
    const favTargets = whoList.filter(n => {
        const baseName = n.includes('|') ? n.split('|')[1] : n;
        return favorites.includes(`parley-tgt-${baseName}`);
    });
    const otherTargets = whoList.filter(n => {
        const baseName = n.includes('|') ? n.split('|')[1] : n;
        return !favorites.includes(`parley-tgt-${baseName}`);
    });
    
    const renderTarget = (entry: string | null) => {
        const [htmlDisplay, baseName] = entry && entry.includes('|') ? entry.split('|') : [entry, entry];
        const favKey = baseName ? `parley-tgt-${baseName}` : null;
        const isFav = favKey ? favorites.includes(favKey) : false;
        const isActive = parley.target === baseName;
        const label = baseName ?? '(No Target)';
        
        return (
            <div key={label} className="popover-item" data-menu-item="true"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', opacity: entry === null ? 0.6 : 1 }}
                onClick={() => { 
                    triggerHaptic?.(20); 
                    setParley({ ...parley, target: baseName }); 
                    setPopoverState(null); 
                }}>
                <span style={{ pointerEvents: 'none', display: 'flex', alignItems: 'center' }}>
                    {isActive && <span style={{ marginRight: 6, color: 'var(--accent)', fontSize: '0.9rem' }}>✓ </span>}
                    {entry === null ? label : (
                        <span 
                            style={{ fontFamily: 'monospace', whiteSpace: 'pre', fontSize: '0.85rem' }} 
                            className="parley-target-name"
                            dangerouslySetInnerHTML={{ __html: sanitizeMumeHtml(htmlDisplay!) }}
                        />
                    )}
                </span>
                {favKey && (
                    <div className={`favorite-star ${isFav ? 'active' : ''}`}
                        onClick={(e) => { 
                            e.stopPropagation(); 
                            setFavorites(prev => isFav ? prev.filter(f => f !== favKey) : [...prev, favKey]); 
                        }}
                        style={{ opacity: isFav ? 1 : 0.3, color: isFav ? '#ffd700' : 'inherit', fontSize: '1.2rem', padding: '16px 20px', margin: '-16px -16px -16px auto', cursor: 'pointer', userSelect: 'none', WebkitTapHighlightColor: 'transparent' }}>
                        {isFav ? '★' : '☆'}
                    </div>
                )}
            </div>
        );
    };

    return (
        <>
            {renderTarget(null)}
            {favTargets.length > 0 && (
                <>
                    <div style={{ padding: '4px 8px', fontSize: '0.65rem', opacity: 0.5, textTransform: 'uppercase', letterSpacing: '1px', borderBottom: '1px solid rgba(255,255,255,0.05)', borderTop: '1px solid rgba(255,255,255,0.05)', color: 'var(--accent)' }}>★ Favorites</div>
                    {favTargets.map(n => renderTarget(n))}
                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', margin: '4px 0' }} />
                </>
            )}
            {whoList.length === 0
                ? <div className="popover-empty">No players in WHO list</div>
                : otherTargets.map(n => renderTarget(n))
            }
        </>
    );
};
