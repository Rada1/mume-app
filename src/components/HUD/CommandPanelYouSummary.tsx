/** @file CommandPanelYouSummary.tsx — Compact character status and controls for the command panel. */
import React from 'react';
import { useGame, useUI } from '../../context/GameContext';
import { useActiveEffectTimers } from '../../hooks/useActiveEffectTimers';
import { useCommandPanelConditionTimers } from '../../hooks/useCommandPanelConditionTimers';
import { useCharacterSessionProgress } from '../../hooks/useCharacterSessionProgress';
import { useVitalsScoreSnapshot } from '../../hooks/useVitalsScoreSnapshot';
import { useActiveVitals } from '../../stores/useActiveGameState';
import type { DrawerLine, ExecuteCommand } from '../../types';
import { calculateRegen, formatRegen } from '../../utils/regenUtils';
import { useCommandInfoStore } from '../../stores/useCommandInfoStore';
import { useCommandSummaryHeight } from '../../hooks/useCommandSummaryHeight';
import { useWimpyThresholdControl } from '../../hooks/useWimpyThresholdControl';
import { getMovementModeActions } from '../../hooks/useMovementModeActions';
import './CommandPanelYouSummary.css';

// --- Logic Section ---
const formatCharacterName = (name: string | null | undefined, fallback: string | null | undefined) =>
    name?.trim() || fallback?.trim() || 'Adventurer';

// --- Render Section ---
export const CommandPanelYouSummary = ({
    fallbackName,
    scoreLines,
    executeCommand,
    scopeKey
}: {
    fallbackName: string | null;
    scoreLines: DrawerLine[];
    executeCommand: ExecuteCommand;
    scopeKey: string;
}) => {
    const vitals = useActiveVitals();
    const summaryRef = useCommandSummaryHeight();
    const collapsed = useCommandInfoStore(state => state.collapsed);
    const toggle = useCommandInfoStore(state => state.toggle);
    const detailsId = React.useId();
    const { characterInfo: gameCharacterInfo, gameState, isSpectateMode, triggerHaptic } = useGame();
    const { displayEqLines } = useUI();
    const { value: wimpyValue, canChange: canChangeWimpy, changeThreshold } = useWimpyThresholdControl();
    const activeTimers = useActiveEffectTimers();
    const { snapshot } = useVitalsScoreSnapshot(scoreLines, executeCommand, scopeKey);
    const [showSnapshot, setShowSnapshot] = React.useState(false);
    const previousSnapshot = React.useRef(snapshot);
    const character = vitals.characterInfo;
    const name = formatCharacterName(character.name, fallbackName);
    const subtext = [character.race, character.subclass || character.class].filter(Boolean).join(' ');
    const { conditions, getDetails: getConditionTimerDetails } = useCommandPanelConditionTimers(
        vitals.characterInfo.affectedBy,
        vitals.conditions,
        vitals.position,
        character.name || fallbackName || ''
    );
    const flags = [
        vitals.isRiding || ['riding', 'mounted'].includes(String(vitals.position || '').toLowerCase()) ? 'Riding' : null,
        vitals.sneak && String(vitals.sneak).toLowerCase() !== 'off' ? 'Sneaking' : null,
        vitals.isHidden ? 'Hidden' : null,
        vitals.isRidden ? 'Being ridden' : null,
    ].filter((flag): flag is string => Boolean(flag));
    const movementModes = getMovementModeActions({
        climb: vitals.climb,
        isSwimming: vitals.isSwimming,
        isRiding: vitals.isRiding,
        sneak: vitals.sneak,
        isHidden: vitals.isHidden,
    });
    const { sessionXp, sessionTp } = useCharacterSessionProgress(
        name, character.xp, character.tp, character.tnl, character.tpnl, scopeKey
    );
    const canRefreshCombatStats = gameState === 'playing' && !isSpectateMode;
    const toggleMovementMode = (command: string) => {
        if (!canRefreshCombatStats) return;
        triggerHaptic(10);
        executeCommand(command);
    };
    const refreshCombatStats = React.useCallback(() => {
        if (!canRefreshCombatStats) return;
        executeCommand('info %O %D %k %A', true, true, true, true);
    }, [canRefreshCombatStats, executeCommand]);
    const regen = calculateRegen({
        equipped: displayEqLines.filter(line => line.isItem).map(line => line.rawText || line.text),
        race: gameCharacterInfo.race || character.race,
        position: vitals.position,
        alertness: vitals.alertness,
        conditions: vitals.conditions,
        age: gameCharacterInfo.age || character.age,
        attributes: gameCharacterInfo.stats,
        timers: activeTimers,
        now: Date.now(),
    });
    React.useEffect(() => {
        if (!snapshot || previousSnapshot.current === snapshot) return;
        previousSnapshot.current = snapshot;
        setShowSnapshot(true);
        const timeout = window.setTimeout(() => setShowSnapshot(false), 4500);
        return () => window.clearTimeout(timeout);
    }, [snapshot]);
    React.useEffect(() => {
        setShowSnapshot(false);
        previousSnapshot.current = null;
    }, [scopeKey]);
    const renderVital = (label: string, status: string | null, value: number, maximum: number, regeneration: number) => {
        const scoreText = maximum > 0 ? `${value}/${maximum}` : String(value);
        const displayStatus = status ? `${status.charAt(0).toUpperCase()}${status.slice(1)}` : '\u2014';
        const regenText = `${formatRegen(regeneration)} per tick`;
        return <div className="command-tree-you-vital" data-vital-type={label.toLowerCase()} key={label} tabIndex={0}
            aria-label={`${label}: ${scoreText}; regeneration ${regenText}`}
            aria-describedby={`command-tree-vital-tooltip-${label.toLowerCase()}`}>
            <small>{label}</small>
            <span className={`command-tree-you-vital-value${showSnapshot ? ' is-showing-snapshot' : ''}`} aria-live="polite">
                <span className="command-tree-you-vital-status" data-vital-type={label.toLowerCase()} aria-hidden={showSnapshot}>
                    {displayStatus} <span className="command-tree-you-vital-regen">({formatRegen(regeneration)}/tick)</span>
                </span>
                <span className="command-tree-you-vital-snapshot" aria-hidden={!showSnapshot}>{scoreText}</span>
            </span>
            <span id={`command-tree-vital-tooltip-${label.toLowerCase()}`} className="command-tree-you-vital-tooltip" role="tooltip">
                <strong>{scoreText}</strong>
                <span><small>Regen</small>{regenText}</span>
            </span>
        </div>;
    };
    const vitalsSnapshot = snapshot || {
        hp: vitals.hp, maxHp: vitals.maxHp,
        mana: vitals.mana, maxMana: vitals.maxMana,
        move: vitals.move, maxMove: vitals.maxMove
    };

    return <section ref={summaryRef} className="command-tree-you-summary" aria-label="Character status">
        <button type="button" className="command-tree-you-identity command-tree-you-toggle"
            aria-expanded={!collapsed} aria-controls={detailsId}
            aria-label={`${collapsed ? 'Expand' : 'Collapse'} character info`} onClick={toggle}>
            <strong title={name}>{name}</strong>
            <span>Lv.{character.level || '\u2014'}</span>
            <span className="command-tree-you-gold">{(character.gold || 0).toLocaleString()} gold</span>
            <span className="command-tree-you-progression" title={`+${sessionXp.toLocaleString()} XP and +${sessionTp.toLocaleString()} TP gained this session`} aria-label={`${sessionXp.toLocaleString()} XP and ${sessionTp.toLocaleString()} TP gained this session`}>
                XP +{sessionXp.toLocaleString()} · TP +{sessionTp.toLocaleString()}
            </span>
            {subtext && <small title={subtext} hidden={collapsed}>{subtext}</small>}
        </button>
        <div id={detailsId} className="command-tree-you-expanded" hidden={collapsed}>
        <div className="command-tree-you-vitals" aria-label="Vitals">
            {renderVital('Health', vitals.hpStatus, vitalsSnapshot.hp, vitalsSnapshot.maxHp, regen.hp)}
            {renderVital('Mana', vitals.manaStatus, vitalsSnapshot.mana, vitalsSnapshot.maxMana, regen.mana)}
            {renderVital('Move', vitals.moveStatus, vitalsSnapshot.move, vitalsSnapshot.maxMove, regen.move)}
        </div>
        <div className="command-tree-you-combat-stats" aria-label="Combat stats">
            {[
                { label: 'Offense', value: vitals.ob },
                { label: 'Parry', value: vitals.pb },
                { label: 'Dodge', value: vitals.db },
                { label: 'Armor', value: vitals.armour },
            ].map(({ label, value }) => <button key={label} type="button"
                disabled={!canRefreshCombatStats} onClick={refreshCombatStats}
                title="Click to refresh combat stats">
                <small>{label}</small><span>{value ?? '\u2014'}</span>
            </button>)}
        </div>
        <div className="command-tree-you-details">
            <div><small>Flags</small><span className="command-tree-you-flag-list" title={flags.join(', ')}>
                {flags.length ? <>{flags.join(' · ')} · </> : null}
                {movementModes.filter(mode => mode.id === 'climb' || mode.id === 'swim').map(mode => <React.Fragment key={mode.id}>
                    {mode.id === 'swim' && ' · '}
                    <button type="button" className={`command-tree-you-mode-toggle${mode.active ? ' is-active' : ''}`}
                        aria-pressed={mode.active} disabled={!canRefreshCombatStats}
                        title={`Click to turn ${mode.label.toLowerCase()} ${mode.active ? 'off' : 'on'}`}
                        onClick={() => toggleMovementMode(mode.command)}>
                        {mode.label} {mode.active ? 'On' : 'Off'}
                    </button>
                </React.Fragment>)}
            </span></div>
            <div><small>Conditions</small><span className="command-tree-you-conditions">{conditions.length ? conditions.map((condition, index) => {
                const details = getConditionTimerDetails(condition);
                const tone = details?.tone;
                return <React.Fragment key={condition}>
                    {index > 0 && ' · '}
                    <span className={`command-tree-you-condition${tone ? ` is-${tone}-timer` : ''}`}
                        title={details?.title}
                        aria-label={details?.ariaLabel}
                        tabIndex={details ? 0 : undefined}>{condition}</span>
                </React.Fragment>;
            }) : 'None'}</span></div>
            <div className="command-tree-you-wimpy"><small>Wimpy</small>
                <button type="button" disabled={!canRefreshCombatStats || !canChangeWimpy} onClick={changeThreshold}
                    title="Click to cycle the automatic flee threshold"
                    aria-label={`Wimpy threshold ${wimpyValue ?? 0} HP. Click to change`}>
                    {wimpyValue ?? 0}
                </button>
            </div>
        </div>
        </div>
    </section>;
};
