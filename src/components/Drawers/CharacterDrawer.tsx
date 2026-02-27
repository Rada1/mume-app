import React from 'react';
import StatBars from '../StatBars';

interface CharacterDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    statsHtml: string;
    mood: string;
    setMood: (mood: string) => void;
    spellSpeed: string;
    setSpellSpeed: (speed: string) => void;
    alertness: string;
    setAlertness: (alertness: string) => void;
    playerPosition: string;
    setPlayerPosition: (pos: string) => void;
    executeCommand: (cmd: string) => void;
    triggerHaptic: (ms: number) => void;
    stats: any;
    hpRowRef: React.RefObject<HTMLDivElement>;
    manaRowRef: React.RefObject<HTMLDivElement>;
    moveRowRef: React.RefObject<HTMLDivElement>;
    handleWimpyChange: (val: number) => void;
}

export const CharacterDrawer: React.FC<CharacterDrawerProps> = ({
    isOpen,
    onClose,
    statsHtml,
    mood,
    setMood,
    spellSpeed,
    setSpellSpeed,
    alertness,
    setAlertness,
    playerPosition,
    setPlayerPosition,
    executeCommand,
    triggerHaptic,
    stats,
    hpRowRef,
    manaRowRef,
    moveRowRef,
    handleWimpyChange
}) => {
    return (
        <div
            className={`character-drawer ${isOpen ? 'open' : ''}`}
            onPointerDown={(e) => {
                const target = e.target as HTMLElement;
                if (target.closest('button') || target.closest('a') || target.closest('.inline-btn') || target.tagName === 'INPUT') return;
                e.currentTarget.setPointerCapture(e.pointerId);
                (e.currentTarget as any)._startX = e.clientX;
                (e.currentTarget as any)._startY = e.clientY;
            }}
            onPointerUp={(e) => {
                const startX = (e.currentTarget as any)._startX;
                const startY = (e.currentTarget as any)._startY;
                if (startX !== undefined && startX !== null) {
                    const deltaX = startX - e.clientX;
                    const deltaY = Math.abs(e.clientY - (startY || 0));
                    if (deltaX > 20 && deltaX > deltaY) {
                        triggerHaptic(40);
                        onClose();
                    }
                }
                (e.currentTarget as any)._startX = null;
                (e.currentTarget as any)._startY = null;
            }}
            onPointerCancel={(e) => {
                (e.currentTarget as any)._startX = null;
            }}
            style={{ touchAction: 'pan-y' }}
        >
            <div className="drawer-content" style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '20px', position: 'relative', touchAction: 'pan-y' }}>
                <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '45px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: '10px', zIndex: 100 }}>
                    <div style={{ width: '6px', height: '80px', background: 'rgba(255,255,255,0.4)', borderRadius: '3px' }} />
                </div>
                <div className="drawer-title-row" style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
                    <span style={{ fontWeight: 'bold', fontSize: '1.1rem', letterSpacing: '1px' }}>Character</span>
                    <button onClick={() => { triggerHaptic(20); onClose(); }} style={{ marginLeft: 'auto', background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', width: '36px', height: '36px', borderRadius: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
                </div>

                <div className="stat-section" style={{ marginBottom: '25px' }}>
                    <div style={{ fontWeight: 'bold', color: 'var(--accent)', marginBottom: '10px', borderBottom: '1px solid rgba(74, 222, 128, 0.3)', fontSize: '0.8rem', letterSpacing: '2px' }}>STATUS</div>
                    <div style={{ whiteSpace: 'pre', overflowX: 'auto', fontSize: '0.85rem', lineHeight: '1.4', background: 'rgba(0,0,0,0.3)', padding: '15px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }} dangerouslySetInnerHTML={{ __html: statsHtml }} />
                </div>

                <div className="controls-section" style={{ marginBottom: '25px' }}>
                    <div style={{ marginBottom: '20px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '8px' }}>
                            <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', letterSpacing: '1px', marginBottom: '2px' }}>MOOD</div>
                            <div style={{ fontSize: '0.9rem', color: 'var(--accent)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '2px' }}>{mood === 'berserk' ? 'Berserk' : mood}</div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                            <input
                                type="range"
                                min="0"
                                max="4"
                                step="1"
                                value={['wimpy', 'prudent', 'normal', 'brave', 'aggressive'].indexOf(mood === 'berserk' ? 'aggressive' : mood)}
                                onChange={(e) => {
                                    const options = ['wimpy', 'prudent', 'normal', 'brave', 'aggressive'];
                                    const val = options[parseInt(e.target.value)];
                                    setMood(val);
                                    executeCommand(`change mood ${val} `);
                                    triggerHaptic(15);
                                }}
                                className="mobile-slider"
                                style={{ flex: 1 }}
                            />
                            <button
                                onClick={() => {
                                    const newVal = mood === 'berserk' ? 'aggressive' : 'berserk';
                                    setMood(newVal);
                                    executeCommand(`change mood ${newVal} `);
                                    triggerHaptic(30);
                                }}
                                style={{
                                    padding: '6px 12px',
                                    borderRadius: '6px',
                                    border: mood === 'berserk' ? '1px solid var(--accent)' : '1px solid rgba(255,255,255,0.2)',
                                    background: mood === 'berserk' ? 'rgba(74, 222, 128, 0.2)' : 'transparent',
                                    color: mood === 'berserk' ? 'var(--accent)' : '#fff',
                                    fontSize: '0.7rem',
                                    fontWeight: 'bold',
                                    cursor: 'pointer'
                                }}
                            >
                                BERSERK
                            </button>
                        </div>
                    </div>

                    <div style={{ marginBottom: '20px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '8px' }}>
                            <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', letterSpacing: '1px', marginBottom: '2px' }}>SPELL SPEED</div>
                            <div style={{ fontSize: '0.9rem', color: 'var(--accent)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '2px' }}>{spellSpeed}</div>
                        </div>
                        <input
                            type="range"
                            min="0"
                            max="4"
                            step="1"
                            value={['quick', 'fast', 'normal', 'careful', 'thorough'].indexOf(spellSpeed)}
                            onChange={(e) => {
                                const options = ['quick', 'fast', 'normal', 'careful', 'thorough'];
                                const val = options[parseInt(e.target.value)];
                                setSpellSpeed(val);
                                executeCommand(`change spell ${val} `);
                                triggerHaptic(15);
                            }}
                            className="mobile-slider"
                            style={{ width: '100%' }}
                        />
                    </div>

                    <div style={{ marginBottom: '10px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '8px' }}>
                            <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', letterSpacing: '1px', marginBottom: '2px' }}>ALERTNESS</div>
                            <div style={{ fontSize: '0.9rem', color: 'var(--accent)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '2px' }}>{alertness}</div>
                        </div>
                        <input
                            type="range"
                            min="0"
                            max="4"
                            step="1"
                            value={['normal', 'careful', 'attentive', 'vigilant', 'paranoid'].indexOf(alertness)}
                            onChange={(e) => {
                                const options = ['normal', 'careful', 'attentive', 'vigilant', 'paranoid'];
                                const val = options[parseInt(e.target.value)];
                                setAlertness(val);
                                executeCommand(`change alert ${val} `);
                                triggerHaptic(15);
                            }}
                            className="mobile-slider"
                            style={{ width: '100%' }}
                        />
                    </div>
                </div>

                <div className="position-section" style={{ marginBottom: '25px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '8px' }}>
                        <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', letterSpacing: '1px', marginBottom: '2px' }}>PLAYER POSITION</div>
                    </div>
                    <div style={{ display: 'flex', gap: '5px', justifyContent: 'space-between', width: '100%', flexWrap: 'nowrap' }}>
                        {[
                            { label: 'sleep', cmd: 'sleep', isHighlighted: playerPosition === 'sleeping' },
                            { label: 'wake', cmd: 'wake', isHighlighted: playerPosition !== 'sleeping' },
                            { label: 'rest', cmd: 'rest', isHighlighted: playerPosition === 'resting' },
                            { label: 'sit', cmd: 'sit', isHighlighted: playerPosition === 'sitting' },
                            { label: 'stand', cmd: 'stand', isHighlighted: playerPosition === 'standing' },
                        ].map(item => (
                            <button
                                key={item.label}
                                onClick={() => {
                                    triggerHaptic(20);
                                    executeCommand(item.cmd);
                                    if (item.cmd === 'sleep') setPlayerPosition('sleeping');
                                    else if (item.cmd === 'wake' && playerPosition === 'sleeping') setPlayerPosition('resting');
                                    else if (['rest', 'sit', 'stand'].includes(item.cmd)) {
                                        const posMap: Record<string, string> = { 'rest': 'resting', 'sit': 'sitting', 'stand': 'standing' };
                                        setPlayerPosition(posMap[item.cmd]);
                                    }
                                }}
                                style={{
                                    height: '34px',
                                    padding: '0 4px',
                                    borderRadius: '6px',
                                    border: item.isHighlighted ? '1px solid var(--accent)' : '1px solid rgba(255,255,255,0.1)',
                                    background: item.isHighlighted ? 'rgba(74, 222, 128, 0.2)' : 'rgba(255,255,255,0.05)',
                                    color: item.isHighlighted ? 'var(--accent)' : '#fff',
                                    fontSize: '0.65rem',
                                    fontWeight: 'bold',
                                    textTransform: 'uppercase',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flex: 1,
                                    minWidth: '0'
                                }}
                            >
                                {item.label}
                            </button>
                        ))}
                    </div>
                </div>

                <button
                    className="stat-bars-btn"
                    onClick={() => {
                        triggerHaptic(20);
                        executeCommand('score');
                    }}
                    style={{
                        width: '100%',
                        background: 'rgba(0,0,0,0.2)',
                        padding: '15px',
                        borderRadius: '12px',
                        border: '1px solid rgba(255,255,255,0.05)',
                        cursor: 'pointer',
                        textAlign: 'left'
                    }}
                >
                    <StatBars stats={stats} hpRowRef={hpRowRef} manaRowRef={manaRowRef} moveRowRef={moveRowRef} orientation="horizontal" onWimpyChange={handleWimpyChange} />
                </button>
            </div>
        </div>
    );
};
