import React from 'react';
import { useGame } from '../../context/GameContext';
import { DrawerLine } from '../../types';
import VitalsDisplay from '../VitalsDisplay';

interface CharacterDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    statsLines: DrawerLine[];
    executeCommand: (cmd: string) => void;
    isLandscape?: boolean;
}

export const CharacterDrawer: React.FC<CharacterDrawerProps> = ({
    isOpen,
    onClose,
    statsLines,
    executeCommand,
    isLandscape = false
}) => {
    const {
        mood, setMood, spellSpeed, setSpellSpeed, alertness, setAlertness,
        playerPosition, setPlayerPosition, stats, setStats, triggerHaptic, inCombat
    } = useGame();

    const handleWimpyChange = (val: number) => {
        setStats(prev => ({ ...prev, wimpy: val }));
        executeCommand(`change wimpy ${val}`);
    };

    const hpRatio = stats.maxHp > 0 ? stats.hp / stats.maxHp : 0;
    const manaRatio = stats.maxMana > 0 ? stats.mana / stats.maxMana : 0;
    const moveRatio = stats.maxMove > 0 ? stats.move / stats.maxMove : 0;

    return (
        <div
            className={`character-drawer ${isOpen ? 'open' : ''} ${isLandscape ? 'landscape-mode' : ''}`}
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
            <div className="drawer-content" style={{ 
                flex: 1, 
                overflowY: 'auto', 
                WebkitOverflowScrolling: 'touch', 
                padding: isLandscape ? '12px 15px 40px 15px' : '20px', 
                position: 'relative', 
                touchAction: 'pan-y',
                display: 'flex',
                flexDirection: 'column'
            }}>
                <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '45px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: '10px', zIndex: 1, pointerEvents: 'none' }}>
                    <div style={{ width: '6px', height: '80px', background: 'rgba(255,255,255,0.4)', borderRadius: '3px' }} />
                </div>
                
                {!isLandscape && (
                    <div className="drawer-title-row" style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
                        <span style={{ fontWeight: 'bold', fontSize: '1.1rem', letterSpacing: '1px' }}>Character</span>
                        <button onClick={() => { triggerHaptic(20); onClose(); }} style={{ marginLeft: 'auto', background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', width: '36px', height: '36px', borderRadius: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
                    </div>
                )}

                <div className="drawer-main-layout" style={{ 
                    display: 'flex', 
                    flexDirection: isLandscape ? 'row' : 'column', 
                    gap: isLandscape ? '15px' : '0',
                    flex: 1
                }}>
                    {/* LEFT COLUMN (or Top in Portrait) */}
                    <div className="drawer-col-left" style={{ flex: isLandscape ? 1.2 : 'none', display: 'flex', flexDirection: 'column' }}>
                        <div className="stat-section" style={{ marginBottom: isLandscape ? '6px' : '25px' }}>
                            <div style={{ fontWeight: 'bold', color: 'var(--accent)', marginBottom: '6px', borderBottom: '1px solid rgba(74, 222, 128, 0.3)', fontSize: '0.7rem', letterSpacing: '2px' }}>STATUS</div>
                            <div style={{
                                display: 'flex', flexDirection: 'column', gap: '2px',
                                fontSize: isLandscape ? '0.7rem' : '0.85rem', lineHeight: '1.3',
                                background: 'rgba(0,0,0,0.3)', padding: isLandscape ? '8px 10px' : '15px',
                                borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)',
                                minHeight: isLandscape ? '80px' : '100px',
                                maxHeight: isLandscape ? '150px' : 'none',
                                overflowY: 'auto'
                            }}>
                                {statsLines.map(line => (
                                    <div
                                        key={line.id}
                                        style={{ whiteSpace: 'pre-wrap' }}
                                        dangerouslySetInnerHTML={{ __html: line.html }}
                                    />
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
                                padding: isLandscape ? '10px' : '15px',
                                borderRadius: '12px',
                                border: '1px solid rgba(255,255,255,0.05)',
                                cursor: 'pointer',
                                textAlign: 'left',
                                marginTop: isLandscape ? '0' : 'auto'
                            }}
                        >
                            <VitalsDisplay
                                stats={stats}
                                hpRatio={hpRatio}
                                manaRatio={manaRatio}
                                moveRatio={moveRatio}
                                inCombat={inCombat}
                                orientation="horizontal"
                                onWimpyChange={handleWimpyChange}
                                isLandscape={isLandscape}
                            />
                        </button>
                    </div>

                    {/* RIGHT COLUMN (or Bottom in Portrait) */}
                    <div className="drawer-col-right" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                        <div className="controls-section" style={{ marginBottom: isLandscape ? '12px' : '25px' }}>
                            <div style={{ marginBottom: isLandscape ? '10px' : '20px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '4px' }}>
                                    <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.4)', letterSpacing: '1px', marginBottom: '1px' }}>MOOD</div>
                                    <div style={{ fontSize: isLandscape ? '0.75rem' : '0.9rem', color: 'var(--accent)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '2px' }}>{mood === 'berserk' ? 'Berserk' : mood}</div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
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
                                            padding: isLandscape ? '4px 8px' : '6px 12px',
                                            borderRadius: '6px',
                                            border: mood === 'berserk' ? '1px solid var(--accent)' : '1px solid rgba(255,255,255,0.2)',
                                            background: mood === 'berserk' ? 'rgba(74, 222, 128, 0.2)' : 'transparent',
                                            color: mood === 'berserk' ? 'var(--accent)' : '#fff',
                                            fontSize: '0.6rem',
                                            fontWeight: 'bold',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        BERSERK
                                    </button>
                                </div>
                            </div>

                            <div style={{ marginBottom: isLandscape ? '10px' : '20px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '4px' }}>
                                    <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.4)', letterSpacing: '1px', marginBottom: '1px' }}>SPELL SPEED</div>
                                    <div style={{ fontSize: isLandscape ? '0.75rem' : '0.9rem', color: 'var(--accent)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '2px' }}>{spellSpeed}</div>
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

                            <div style={{ marginBottom: isLandscape ? '10px' : '10px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '4px' }}>
                                    <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.4)', letterSpacing: '1px', marginBottom: '1px' }}>ALERTNESS</div>
                                    <div style={{ fontSize: isLandscape ? '0.75rem' : '0.9rem', color: 'var(--accent)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '2px' }}>{alertness}</div>
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

                        <div className="position-section" style={{ marginBottom: '10px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '6px' }}>
                                <div style={{ fontSize: '0.55rem', color: 'rgba(255,255,255,0.4)', letterSpacing: '1px', marginBottom: '1px' }}>PLAYER POSITION</div>
                            </div>
                            <div style={{ display: 'flex', gap: '4px', justifyContent: 'space-between', width: '100%', flexWrap: 'nowrap' }}>
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
                                            height: isLandscape ? '28px' : '34px',
                                            padding: '0 2px',
                                            borderRadius: '6px',
                                            border: item.isHighlighted ? '1px solid var(--accent)' : '1px solid rgba(255,255,255,0.1)',
                                            background: item.isHighlighted ? 'rgba(74, 222, 128, 0.2)' : 'rgba(255,255,255,0.05)',
                                            color: item.isHighlighted ? 'var(--accent)' : '#fff',
                                            fontSize: '0.6rem',
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
                    </div>
                </div>
            </div>
        </div>
    );
};
