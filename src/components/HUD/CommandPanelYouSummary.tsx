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
import { useDesktopHoverPreview } from '../../hooks/useDesktopHoverPreview';
import { useQuickStateMenuPosition } from '../../hooks/useQuickStateMenuPosition';
import { useWimpyThresholdControl } from '../../hooks/useWimpyThresholdControl';
import { getMovementModeActions } from '../../hooks/useMovementModeActions';
import { MobileGroupControl } from './MobileGroupControl';
import './CommandPanelYouSummary.css';
import './MobileCharacterPopover.css';

// --- Logic Section ---
const formatCharacterName = (name: string | null | undefined, fallback: string | null | undefined) =>
    (typeof name === 'string' && name.trim()) || (typeof fallback === 'string' && fallback.trim()) || 'Adventurer';

// --- Render Section ---
export const CommandPanelYouSummary = ({
    fallbackName,
    scoreLines,
    executeCommand,
    scopeKey,
    headerActions
}: {
    fallbackName: string | null;
    scoreLines: DrawerLine[];
    executeCommand: ExecuteCommand;
    scopeKey: string;
    headerActions?: React.ReactNode;
}) => {
    const vitals = useActiveVitals();
    const summaryRef = useCommandSummaryHeight();
    const collapsed = useCommandInfoStore(state => state.collapsed);
    const toggle = useCommandInfoStore(state => state.toggle);
    const detailsId = React.useId();
    const { characterInfo: gameCharacterInfo, gameState, isSpectateMode, triggerHaptic, viewport } = useGame();
    const hoverPreview = useDesktopHoverPreview(viewport?.isMobile === false);
    const expanded = !collapsed || hoverPreview.open;
    const mobilePopover = useQuickStateMenuPosition(viewport?.isMobile && expanded ? 'character' : null, true);
    const { displayEqLines } = useUI();
    const { value: wimpyValue, canChange: canChangeWimpy, changeThreshold } = useWimpyThresholdControl();
    const activeTimers = useActiveEffectTimers();
    const { snapshot, isRequesting: isRequestingVitalsScore, requestScore } =
        useVitalsScoreSnapshot(scoreLines, executeCommand, scopeKey);
    const [showSnapshot, setShowSnapshot] = React.useState(false);
    const previousSnapshot = React.useRef(snapshot);
    const character = vitals.characterInfo;
    const name = formatCharacterName(character.name, fallbackName);
    const subtext = [character.race, character.subclass || character.class].filter(Boolean).join(' ');
    const { conditions, getDetails: getConditionTimerDetails } = useCommandPanelConditionTimers(
        vitals.characterInfo.affectedBy,
        vitals.conditions,
        vitals.position,
        name
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
    const refreshVitals = () => {
        if (!canRefreshCombatStats || isRequestingVitalsScore) return;
        triggerHaptic(10);
        requestScore();
    };
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
        const timeout = window.setTimeout(() => setShowSnapshot(false), 2000);
        return () => window.clearTimeout(timeout);
    }, [snapshot]);
    React.useEffect(() => {
        setShowSnapshot(false);
        previousSnapshot.current = null;
    }, [scopeKey]);
    const renderVital = (label: string, status: string | null, value: number, maximum: number, regeneration: number) => {
        const scoreText = maximum > 0 ? `${value}/${maximum}` : String(value);
        const displayStatus = status ? `${status.charAt(0).toUpperCase()}${status.slice(1)}` : '\u2014';
        return <div className="command-tree-you-vital" data-vital-type={label.toLowerCase()} key={label}>
            <small>{label}</small>
            <span className={`command-tree-you-vital-value${showSnapshot ? ' is-showing-snapshot' : ''}`} aria-live="polite">
                <span className="command-tree-you-vital-status" data-vital-type={label.toLowerCase()} aria-hidden={showSnapshot}>
                    {displayStatus} <span className="command-tree-you-vital-regen">({formatRegen(regeneration)}/tick)</span>
                </span>
                <span className="command-tree-you-vital-snapshot" data-vital-type={label.toLowerCase()} aria-hidden={!showSnapshot}>
                    {scoreText} <span className="command-tree-you-vital-regen">({formatRegen(regeneration)}/tick)</span>
                </span>
            </span>
        </div>;
    };
    const vitalsSnapshot = snapshot || {
        hp: vitals.hp, maxHp: vitals.maxHp,
        mana: vitals.mana, maxMana: vitals.maxMana,
        move: vitals.move, maxMove: vitals.maxMove
    };

    return <section ref={summaryRef} className="command-tree-you-summary" aria-label="Character status">
        <div className="command-tree-you-header">
        <button ref={node => { mobilePopover.anchorRef.current = node; }} type="button" className="command-tree-you-identity command-tree-you-toggle"
            aria-expanded={expanded} aria-controls={detailsId}
            aria-label={`${collapsed ? 'Expand' : 'Collapse'} character info`} onPointerEnter={hoverPreview.enter} onPointerLeave={hoverPreview.leave}
            onClick={() => { hoverPreview.clear(); toggle(); }}>
            <strong title={name}>{name}</strong>
            <span>Lv.{character.level || '\u2014'}</span>
            <span className="command-tree-you-gold">{(character.gold || 0).toLocaleString()} gold</span>
            <span className="command-tree-you-progression" title={`+${sessionXp.toLocaleString()} XP and +${sessionTp.toLocaleString()} TP gained this session`} aria-label={`${sessionXp.toLocaleString()} XP and ${sessionTp.toLocaleString()} TP gained this session`}>
                XP +{sessionXp.toLocaleString()} · TP +{sessionTp.toLocaleString()}
            </span>
            {subtext && <small title={subtext} hidden={!expanded}>{subtext}</small>}
        </button>
        {headerActions}
        <MobileGroupControl dock />
        </div>
        <div id={detailsId} ref={node => { mobilePopover.menuRef.current = node; }} popover={viewport?.isMobile ? 'manual' : undefined} className="command-tree-you-expanded" hidden={!expanded}
            style={viewport?.isMobile ? {...mobilePopover.position, width:'min(340px, calc(100vw - 16px))'} : undefined}
            onPointerEnter={hoverPreview.enter} onPointerLeave={hoverPreview.leave}>
        <div className={`command-tree-you-vitals${isRequestingVitalsScore ? ' is-requesting' : ''}`}
            role="button" aria-label="Refresh vitals with score command" aria-disabled={!canRefreshCombatStats}
            aria-busy={isRequestingVitalsScore} tabIndex={canRefreshCombatStats ? 0 : -1}
            onClick={() => { if (canRefreshCombatStats) refreshVitals(); }}
            onKeyDown={event => {
                if (event.key === ' ' && canRefreshCombatStats) event.preventDefault();
                if (!canRefreshCombatStats || event.repeat || event.key !== 'Enter') return;
                event.preventDefault();
                refreshVitals();
            }}
            onKeyUp={event => {
                if (!canRefreshCombatStats || event.key !== ' ') return;
                event.preventDefault();
                refreshVitals();
            }}>
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
