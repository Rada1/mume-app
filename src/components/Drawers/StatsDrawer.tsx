import React from 'react';
import { useGame, useVitals } from '../../context/GameContext';
import { DrawerLine } from '../../types';
import VitalsDisplay from '../VitalsDisplay';

interface CharacterDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    statsLines: DrawerLine[];
    executeCommand: (cmd: string, silent?: boolean, isSystem?: boolean, isHistorical?: boolean, fromDrawer?: boolean) => void;
    isLandscape?: boolean;
}

export const StatsDrawer: React.FC<CharacterDrawerProps> = ({
    isOpen,
    onClose,
    statsLines,
    executeCommand,
    isLandscape = false
}) => {
    const {
        mood, setMood, spellSpeed, setSpellSpeed, alertness, setAlertness,
        playerPosition, setPlayerPosition, triggerHaptic, inCombat
    } = useGame();
    const { stats, setStats } = useVitals();

    const handleWimpyChange = (val: number) => {
        setStats(prev => ({ ...prev, wimpy: val }));
        executeCommand(`change wimpy ${val}`);
    };

    const hpRatio = stats.maxHp > 0 ? stats.hp / stats.maxHp : 0;
    const manaRatio = stats.maxMana > 0 ? stats.mana / stats.maxMana : 0;
    const moveRatio = stats.maxMove > 0 ? stats.move / stats.maxMove : 0;

    const renderTicks = () => (
        <div style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, display: 'flex', justifyContent: 'space-between', padding: '0 8px', pointerEvents: 'none', zIndex: 1, alignItems: 'center' }}>
            {[0, 1, 2, 3, 4].map(tick => (
                <div key={tick} style={{ width: '2px', height: '10px', background: 'rgba(255,255,255,0.25)', borderRadius: '1px' }} />
            ))}
        </div>
    );

    return (
        <div
            className={`stats-drawer ${isOpen ? 'open' : ''} ${isLandscape ? 'landscape-mode' : ''}`}
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
                
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '10px' }}>
                    <button onClick={() => { triggerHaptic(20); onClose(); }} style={{ 
                        background: 'rgba(255,255,255,0.1)', 
                        border: 'none', 
                        color: '#fff', 
                        width: '32px', 
                        height: '32px', 
                        borderRadius: '16px', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        fontSize: '1rem', 
                        cursor: 'pointer',
                        zIndex: 10
                    }}>✕</button>
                </div>

                <div className="drawer-main-layout" style={{ 
                    display: 'flex', 
                    flexDirection: isLandscape ? 'row' : 'column', 
                    gap: isLandscape ? '15px' : '0',
                    flex: 1
                }}>
                    {/* LEFT COLUMN (or Top in Portrait) */}
                    <div className="drawer-col-left" style={{ flex: isLandscape ? 1.2 : 'none', display: 'flex', flexDirection: 'column' }}>

                        <button
                            className="stat-bars-btn"
                            onClick={() => {
                                triggerHaptic(20);
                                executeCommand('score');
                            }}
                            style={{
                                width: '100%',
                                background: 'rgba(255, 255, 255, 0.03)',
                                padding: isLandscape ? '10px' : '15px',
                                borderRadius: '12px',
                                border: '1px solid rgba(255, 255, 255, 0.05)',
                                cursor: 'pointer',
                                textAlign: 'left',
                                marginTop: '0'
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
                    <div className="drawer-col-right" style={{ flex: 1, display: 'flex', flexDirection: 'column', marginTop: isLandscape ? '0' : '20px' }}>
                        {/* Combat Percentages Section */}
                        <div className="percentages-section" style={{ 
                            marginBottom: isLandscape ? '10px' : '20px',
                            display: 'grid',
                            gridTemplateColumns: 'repeat(4, 1fr)',
                            gap: '8px',
                            padding: '12px',
                            background: 'rgba(255, 255, 255, 0.03)',
                            borderRadius: '12px',
                            border: '1px solid rgba(255, 255, 255, 0.05)'
                        }}>
                            {[
                                { label: 'OB', value: stats.ob },
                                { label: 'DB', value: stats.db },
                                { label: 'PB', value: stats.pb },
                                { label: 'ARM', value: stats.armour }
                            ].map(stat => (
                                <div key={stat.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                    <div style={{ fontSize: '0.55rem', color: 'rgba(255,255,255,0.4)', letterSpacing: '1px', marginBottom: '2px' }}>{stat.label}</div>
                                    <div style={{ fontSize: '0.9rem', color: 'var(--accent)', fontWeight: 'bold' }}>{stat.value !== undefined ? `${stat.value}%` : '--'}</div>
                                </div>
                            ))}
                        </div>

                        <div className="controls-section" style={{ marginBottom: isLandscape ? '12px' : '25px' }}>
                            <div style={{ marginBottom: isLandscape ? '10px' : '20px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '4px' }}>
                                    <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.4)', letterSpacing: '1px', marginBottom: '1px' }}>MOOD</div>
                                    <div style={{ fontSize: isLandscape ? '0.75rem' : '0.9rem', color: 'var(--accent)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '2px' }}>{mood === 'berserk' ? 'Berserk' : mood}</div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <div style={{ position: 'relative', flex: 1, height: '32px', display: 'flex', alignItems: 'center' }}>
                                        {renderTicks()}
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
                                                setTimeout(() => executeCommand('stat', true, true, true, true), 100);
                                                triggerHaptic(15);
                                            }}
                                            className="mobile-slider"
                                            style={{ width: '100%', position: 'relative', zIndex: 2, background: 'transparent' }}
                                        />
                                    </div>
                                    <button
                                        onClick={() => {
                                            const newVal = mood === 'berserk' ? 'aggressive' : 'berserk';
                                            setMood(newVal);
                                            executeCommand(`change mood ${newVal} `);
                                            setTimeout(() => executeCommand('stat', true, true, true, true), 100);
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
                                <div style={{ position: 'relative', width: '100%', height: '32px', display: 'flex', alignItems: 'center' }}>
                                    {renderTicks()}
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
                                        style={{ width: '100%', position: 'relative', zIndex: 2, background: 'transparent' }}
                                    />
                                </div>
                            </div>

                            <div style={{ marginBottom: isLandscape ? '10px' : '10px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '4px' }}>
                                    <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.4)', letterSpacing: '1px', marginBottom: '1px' }}>ALERTNESS</div>
                                    <div style={{ fontSize: isLandscape ? '0.75rem' : '0.9rem', color: 'var(--accent)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '2px' }}>{alertness}</div>
                                </div>
                                <div style={{ position: 'relative', width: '100%', height: '32px', display: 'flex', alignItems: 'center' }}>
                                    {renderTicks()}
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
                                        style={{ width: '100%', position: 'relative', zIndex: 2, background: 'transparent' }}
                                    />
                                </div>
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
