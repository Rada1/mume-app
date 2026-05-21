import React from 'react';
import { useVitalsStore } from '../../stores/useVitalsStore';
import { useVitals, useGame } from '../../context/GameContext';
import { formatCompactNumber } from '../../utils/gameUtils';
import { CombatHealthStatus } from '../../types';
import { DrawerTabBar } from './DrawerTabBar';
import { TimerDrawerTab } from '../Timers/TimerDrawerTab';
import { MagicKeysTab } from '../Timers/MagicKeysTab';

// ── Primitives ────────────────────────────────────────────────────────────────

const Card: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: 8,
        padding: '10px 12px',
        display: 'flex',
        flexDirection: 'column',
        gap: 7,
    }}>
        <div style={{
            fontSize: '0.68em', fontWeight: 700, textTransform: 'uppercase',
            letterSpacing: '1.5px', color: 'rgba(255,255,255,0.22)', marginBottom: 2,
        }}>
            {title}
        </div>
        {children}
    </div>
);

// matches --ansi-green used by header TNL/TPNL pills
const GREEN = '#4ade80';
const GREEN_GLOW = 'rgba(74,222,128,0.3)';

const Row: React.FC<{ label: string; value: React.ReactNode; dim?: boolean }> = ({ label, value, dim }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
        <span style={{ fontSize: '0.78em', color: 'rgba(255,255,255,0.36)', flexShrink: 0 }}>{label}</span>
        <span style={{
            fontSize: '1em',
            color: dim ? 'rgba(255,255,255,0.2)' : GREEN,
            textShadow: dim ? 'none' : `0 0 8px ${GREEN_GLOW}`,
            fontWeight: 500, textAlign: 'right', wordBreak: 'break-word',
        }}>{value}</span>
    </div>
);

// Exact prompt-box bar config
const BAR_CFG = {
    hp:   { fill: '#ff8080', border: 'rgba(255,128,128,0.5)',  segments: 6 },
    mana: { fill: '#c084fc', border: 'rgba(192,132,252,0.5)',  segments: 6 },
    move: { fill: '#86efac', border: 'rgba(134,239,172,0.5)',  segments: 7 },
} as const;

const getFilledSegments = (pct: number, numSegs: number): number => {
    const raw = (Math.max(0, Math.min(100, pct)) / 100) * numSegs;
    let filled = Math.round(raw);
    if (pct < 100 && filled === numSegs) filled = numSegs - 1;
    return Math.max(0, Math.min(numSegs, filled));
};

const BarRow: React.FC<{
    label: string; value: number; max: number;
    barKey: keyof typeof BAR_CFG; statusStr?: string | null;
}> = ({ label, value, max, barKey, statusStr }) => {
    const pct = max > 0 ? (value / max) * 100 : 0;
    const { fill, border, segments } = BAR_CFG[barKey];
    const filled = getFilledSegments(pct, segments);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {/* numbers row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontSize: '0.78em', color: 'rgba(255,255,255,0.36)', minWidth: 36 }}>{label}</span>
                <span style={{ fontSize: '1em', fontFamily: 'monospace', color: fill, textShadow: `0 0 6px ${fill}` }}>
                    {value}
                    <span style={{ opacity: 0.45 }}> / {max}</span>
                    {statusStr && (
                        <span style={{ marginLeft: 7, opacity: 0.55, fontSize: '0.85em', color: 'rgba(255,255,255,0.5)', textShadow: 'none' }}>
                            ({statusStr})
                        </span>
                    )}
                </span>
            </div>
            {/* segmented bar — mirrors prompt box exactly */}
            <div style={{
                position: 'relative', display: 'flex', alignItems: 'center',
                background: 'rgba(0,0,0,0.4)',
                border: `1px solid ${border}`,
                borderRadius: 4, height: 14, width: '100%',
                padding: 1, boxSizing: 'border-box',
                boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.5)',
                transform: 'skewX(15deg)',
            }}>
                <div style={{ display: 'flex', gap: 1, width: '100%', height: '100%', position: 'relative', zIndex: 1 }}>
                    {Array.from({ length: segments }).map((_, i) => (
                        <div key={i} style={{
                            flex: 1, height: '100%',
                            background: 'rgba(255,255,255,0.05)',
                            borderRadius: 2, position: 'relative', overflow: 'hidden',
                        }}>
                            <div style={{
                                position: 'absolute', top: 0, bottom: 0, left: 0,
                                width: i < filled ? '100%' : '0%',
                                backgroundColor: fill,
                                borderRadius: 1,
                                boxShadow: i < filled ? `0 0 4px ${fill}` : 'none',
                                transition: 'width 0.2s ease-out',
                                zIndex: 2,
                            }} />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

const Pill: React.FC<{ label: string; active: boolean; color?: string }> = ({ label, active, color }) => (
    <span style={{
        padding: '2px 7px',
        borderRadius: 10,
        fontSize: '0.82em',
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        background: active ? `rgba(${color ?? '184,134,11'}, 0.15)` : 'rgba(255,255,255,0.04)',
        color: active ? `rgb(${color ?? '184,134,11'})` : 'rgba(255,255,255,0.2)',
        border: `1px solid ${active ? `rgba(${color ?? '184,134,11'}, 0.3)` : 'rgba(255,255,255,0.06)'}`,
    }}>
        {label}
    </span>
);

const statusColor = (s: CombatHealthStatus | null | string): string => {
    switch (s) {
        case 'Healthy': return '#4ade80';
        case 'Fine':    return '#86efac';
        case 'Hurt':    return '#facc15';
        case 'Wounded': return '#fb923c';
        case 'Bad':     return '#f87171';
        case 'Awful':   return '#ef4444';
        case 'Dying':   return '#dc2626';
        case 'Stunned': return '#c084fc';
        default:        return 'rgba(255,255,255,0.4)';
    }
};

const positionLabel = (pos: string): string => {
    const map: Record<string, string> = {
        standing: 'Standing', fighting: 'Fighting', sitting: 'Sitting',
        resting: 'Resting', sleeping: 'Sleeping', stunned: 'Stunned',
        incapacitated: 'Incapacitated', dying: 'Dying', riding: 'Riding', mounted: 'Mounted',
    };
    return map[pos?.toLowerCase()] ?? pos ?? '—';
};

// ── Main Drawer ───────────────────────────────────────────────────────────────

export const StatusDrawer: React.FC = () => {
    const [statusTab, setStatusTab] = React.useState<'vitals' | 'timers' | 'keys'>('vitals');
    const store = useVitalsStore();
    const { mood } = useGame();
    const { opponentName, opponentHealthStatus, bufferName, bufferHealthStatus } = useVitals();

    const {
        characterInfo, hp, maxHp, mana, maxMana, move, maxMove,
        hpStatus, manaStatus, moveStatus, position, wimpy,
        carrying, isRidden, climb, sneak, isHidden, isSwimming,
        mountMoves, spellEffort, alertness, isFoggy, weather, lighting,
    } = store;

    const hasConditions = isHidden || !!sneak || !!climb || isSwimming || isRidden || (position === 'riding' || position === 'mounted');
    const hasCombat = !!opponentName;

    return (
        <>
        <DrawerTabBar
            tabs={[{ id: 'vitals', label: 'Vitals' }, { id: 'timers', label: 'Timers' }, { id: 'keys', label: 'Magic Keys' }]}
            active={statusTab}
            onChange={(id) => setStatusTab(id as 'vitals' | 'timers' | 'keys')}
        />
        {statusTab === 'keys' ? <MagicKeysTab /> : statusTab === 'timers' ? <TimerDrawerTab /> : <div style={{
            flex: 1, overflowY: 'auto', padding: '10px 10px 16px', display: 'flex',
            flexDirection: 'column', gap: 8, scrollbarWidth: 'thin',
            fontSize: 'calc(var(--dynamic-log-size, 16px) + 1px)'
        }}>
            {/* ── Identity ── */}
            <Card title="Character">
                {characterInfo.fullname ? (
                    <div style={{ fontSize: '1.2em', fontWeight: 600, color: 'rgba(255,255,255,0.9)', lineHeight: 1.3 }}>
                        {characterInfo.fullname}
                    </div>
                ) : characterInfo.name ? (
                    <div style={{ fontSize: '1.2em', fontWeight: 600, color: 'rgba(255,255,255,0.9)' }}>
                        {characterInfo.name}
                    </div>
                ) : (
                    <div style={{ fontSize: '1em', color: 'rgba(255,255,255,0.2)', fontStyle: 'italic' }}>Not logged in</div>
                )}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 12px', marginTop: 2 }}>
                    {characterInfo.level > 0 && <Row label="Level" value={characterInfo.level} />}
                    {characterInfo.race && <Row label="Race" value={[characterInfo.race, characterInfo.subrace].filter(Boolean).join(' · ')} />}
                    {characterInfo.class && <Row label="Class" value={[characterInfo.class, characterInfo.subclass].filter(Boolean).join(' · ')} />}
                </div>
            </Card>

            {/* ── Vitals ── */}
            <Card title="Vitals">
                <BarRow label="HP"   value={hp}   max={maxHp}   barKey="hp"   statusStr={hpStatus} />
                <BarRow label="Mana" value={mana} max={maxMana} barKey="mana" statusStr={manaStatus} />
                <BarRow label="Move" value={move} max={maxMove} barKey="move" statusStr={moveStatus} />
                {wimpy > 0 && <Row label="Wimpy" value={`${wimpy}%`} />}
            </Card>

            {/* ── Experience ── */}
            {(characterInfo.xp > 0 || characterInfo.tnl > 0 || characterInfo.tp > 0 || characterInfo.tpnl > 0) && (
                <Card title="Experience">
                    <Row label="XP" value={formatCompactNumber(characterInfo.xp)} />
                    {characterInfo.tnl > 0 && <Row label="To Next Level" value={formatCompactNumber(characterInfo.tnl)} />}
                    {characterInfo.tp > 0 && <Row label="TP" value={formatCompactNumber(characterInfo.tp)} />}
                    {characterInfo.tpnl > 0 && <Row label="TP to Next Level" value={formatCompactNumber(characterInfo.tpnl)} />}
                </Card>
            )}

            {/* ── State ── */}
            <Card title="State">
                <Row label="Position" value={
                    <span style={{
                        color: position === 'fighting' ? '#f87171' : position === 'dying' ? '#dc2626' : GREEN,
                        textShadow: position === 'fighting' || position === 'dying' ? 'none' : `0 0 8px ${GREEN_GLOW}`,
                    }}>
                        {positionLabel(position)}
                    </span>
                } />
                {mood && <Row label="Mood" value={mood} />}
                {alertness && <Row label="Alertness" value={alertness} />}
                {spellEffort && <Row label="Spell Effort" value={spellEffort} />}
                {mountMoves && <Row label="Mount" value={mountMoves} />}
                <Row label="Weather" value={weather !== 'none' ? weather : '—'} dim={weather === 'none'} />
                <Row label="Light" value={
                    lighting === 'sun' ? 'Daylight' :
                    lighting === 'moon' ? 'Moonlight' :
                    lighting === 'artificial' ? 'Artificial' :
                    lighting === 'dark' ? 'Dark' : '—'
                } dim={lighting === 'none'} />
                {isFoggy && <Row label="Fog" value="Foggy" />}
                {carrying && <Row label="Carrying" value={carrying} />}
            </Card>

            {/* ── Conditions ── */}
            {(hasConditions) && (
                <Card title="Conditions">
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                        <Pill label="Hidden" active={isHidden} color="139,92,246" />
                        <Pill label={sneak === 'S' ? 'Sneaking (careful)' : 'Sneaking'} active={!!sneak} color="139,92,246" />
                        <Pill label={climb === 'C' ? 'Climbing (skilled)' : 'Climbing'} active={!!climb} color="234,179,8" />
                        <Pill label="Swimming" active={isSwimming} color="59,130,246" />
                        <Pill label="Riding" active={position === 'riding' || position === 'mounted'} color="34,197,94" />
                        <Pill label="Being Ridden" active={isRidden} color="249,115,22" />
                    </div>
                </Card>
            )}

            {/* ── Combat ── */}
            {hasCombat && (
                <Card title="Combat">
                    {opponentName && (
                        <Row label="Opponent" value={
                            <span>
                                {opponentName}
                                {opponentHealthStatus && (
                                    <span style={{ marginLeft: 8, fontSize: '0.85em', color: statusColor(opponentHealthStatus) }}>
                                        {opponentHealthStatus}
                                    </span>
                                )}
                            </span>
                        } />
                    )}
                    {bufferName && (
                        <Row label="Buffer" value={
                            <span>
                                {bufferName}
                                {bufferHealthStatus && (
                                    <span style={{ marginLeft: 8, fontSize: '0.85em', color: statusColor(bufferHealthStatus) }}>
                                        {bufferHealthStatus}
                                    </span>
                                )}
                            </span>
                        } />
                    )}
                </Card>
            )}
        </div>
        }
        </>
    );
};
