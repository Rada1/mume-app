/**
 * @file ThisIsYouConsole.tsx
 * @description Guided Interactive Bar: consolidates identity, bio, progression,
 * numerical vitals, plain-English capabilities, and category-explicit states into
 * a single cohesive "This is You" dashboard.
 */

// --- Logic Section ---
import React, { FC, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useGame, useUI } from '../../context/GameContext';
import { useActiveVitals } from '../../stores/useActiveGameState';
import { getEffectTimerTone, isSpellEffectTimer } from '../../utils/effectTimerUtils';
import { calculateRegen, formatRegen } from '../../utils/regenUtils';
import { useActiveEffectTimers } from '../../hooks/useActiveEffectTimers';
import { useStatDeltas } from '../../hooks/useStatDeltas';
import { useCharacterConditions } from '../../hooks/useCharacterConditions';
import { useCharacterInfoRefresh } from '../../hooks/useCharacterInfoRefresh';
import { useCharacterPanelVitalsRefresh } from '../../hooks/useCharacterPanelVitalsRefresh';
import { useSwipeDownToMinimize } from '../../hooks/useSwipeDownToMinimize';
import { useSwipeUpToExpand } from '../../hooks/useSwipeUpToExpand';
import { getMovementModeActions } from '../../hooks/useMovementModeActions';
import { ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';
import { useCharacterPanelStore } from '../../stores/useCharacterPanelStore';
import { useModeStore } from '../../stores/useModeStore';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { applyTacticalCommandPrefix, useTacticalCommandPrefixStore } from '../../stores/useTacticalCommandPrefixStore';
import { ThisIsYouVitalsTier } from './ThisIsYouVitalsTier';
import { StatDelta } from './StatDelta';
import { TerminalProgression } from './TerminalProgression';
import { ThisIsYouStatePill, StateOption } from './ThisIsYouStatePill';
import {
    formatHeight,
    formatNumber,
    getNextWimpyPreset,
    POSITION_OPTIONS,
    ALERTNESS_OPTIONS,
    MOOD_OPTIONS,
    SPELL_SPEED_OPTIONS
} from './thisIsYouHelpers';
import './ThisIsYouConsole.css';
import './ThisIsYouTerminal.css';
import './ThisIsYouMobile.css';
import './ThisIsYouMinimizedMobile.css';

interface ThisIsYouConsoleProps {
    alwaysExpanded?: boolean;
}

const normalizeConditionTimerName = (value: string): string => value.toLowerCase().replace(/[^a-z0-9]+/g, '');

const formatConditionTimeLeft = (milliseconds: number): string => {
    const totalMinutes = Math.max(0, Math.ceil(milliseconds / 60_000));
    if (totalMinutes >= 60) {
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
    }
    return `${totalMinutes}m`;
};

const formatConditionTimeElapsed = (milliseconds: number): string => {
    const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
    const totalMinutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    if (totalMinutes >= 60) {
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
    }
    return totalMinutes > 0
        ? `${totalMinutes}m ${seconds.toString().padStart(2, '0')}s`
        : `${seconds}s`;
};

export const ThisIsYouConsole: FC<ThisIsYouConsoleProps> = ({ alwaysExpanded = false }) => {
    const isMinimized = useCharacterPanelStore(s => s.isMinimized);
    const setIsMinimized = useCharacterPanelStore(s => s.setIsMinimized);
    const toggleMinimized = useCharacterPanelStore(s => s.toggleMinimized);
    const panelIsMinimized = alwaysExpanded ? false : isMinimized;
    const [mobileSheetPortalHost, setMobileSheetPortalHost] = useState<HTMLElement | null>(null);
    const consoleRef = useRef<HTMLElement | null>(null);
    const mobileSheetPlaceholderHeightRef = useRef(72);
    const {
        characterInfo,
        characterName,
        viewport,
        gameState,
        executeCommand,
        triggerHaptic,
        mood,
        setMood,
        spellSpeed,
        setSpellSpeed,
        alertness,
        setAlertness,
        setPlayerPosition,
        isSpectateMode
    } = useGame();
    const spectateTarget = useModeStore(state => state.spectateTarget);
    const activeView = useModeStore(state => state.activeView);
    const viewingSpectateTarget = isSpectateMode && activeView === 'target';

    const isMobileSheet = Boolean(viewport?.isMobile && !alwaysExpanded && !panelIsMinimized);
    const pendingCommandPrefix = useTacticalCommandPrefixStore(state => state.prefix);
    const usePanelBlur = useSettingsStore(state => state.useTacticalPanelBlur);
    const isPerformanceMode = useSettingsStore(state => state.isPerformanceMode);
    const isPanelBlurred = Boolean(usePanelBlur && !isPerformanceMode);
    const minimizeSwipe = useSwipeDownToMinimize(isMobileSheet, () => setIsMinimized(true));
    const expandSwipe = useSwipeUpToExpand(
        Boolean(viewport?.isMobile && !alwaysExpanded && panelIsMinimized),
        () => setIsMinimized(false)
    );

    useLayoutEffect(() => {
        setMobileSheetPortalHost(document.body);
    }, []);

    useLayoutEffect(() => {
        if (!viewport?.isMobile || alwaysExpanded) return;
        const updatePlaceholderHeight = () => {
            if (panelIsMinimized && consoleRef.current) {
                mobileSheetPlaceholderHeightRef.current = Math.ceil(consoleRef.current.getBoundingClientRect().height);
            }
        };
        updatePlaceholderHeight();
        const observer = new ResizeObserver(updatePlaceholderHeight);
        if (consoleRef.current) observer.observe(consoleRef.current);
        return () => observer.disconnect();
    }, [alwaysExpanded, panelIsMinimized, viewport?.isMobile]);

    const vitals = useActiveVitals();
    const { displayEqLines, spectateBuffer } = useUI();
    const activeTimers = useActiveEffectTimers();
    const [displayWimpy, setDisplayWimpy] = useState<number | null>(vitals.wimpy ?? null);
    const [conditionNow, setConditionNow] = useState(Date.now());

    useEffect(() => {
        setDisplayWimpy(vitals.wimpy ?? null);
    }, [vitals.wimpy]);

    useEffect(() => {
        const interval = window.setInterval(() => setConditionNow(Date.now()), 1000);
        return () => window.clearInterval(interval);
    }, []);
    const timerNow = viewingSpectateTarget && Number.isFinite(spectateBuffer.displayCutoff)
        ? spectateBuffer.displayCutoff
        : conditionNow;
    const displayedAlertness = viewingSpectateTarget ? vitals.alertness : alertness;
    const displayedMood = viewingSpectateTarget ? vitals.mood : mood;
    const displayedSpellSpeed = viewingSpectateTarget ? vitals.spellEffort : spellSpeed;

    const refreshCharacterInfo = useCharacterInfoRefresh(
        characterInfo?.name || characterName || '', gameState === 'playing' && !isSpectateMode, executeCommand, !alwaysExpanded
    );
    useCharacterPanelVitalsRefresh(
        panelIsMinimized,
        gameState === 'playing',
        isSpectateMode,
        executeCommand
    );

    const regen = useMemo(() => calculateRegen({
        equipped: (displayEqLines || []).filter(line => line.isItem).map(line => line.rawText || line.text),
        race: characterInfo?.race,
        position: vitals.position,
        alertness: displayedAlertness || undefined,
        conditions: vitals.conditions,
        age: characterInfo?.age,
        attributes: characterInfo?.stats,
        timers: activeTimers,
        now: timerNow,
    }), [activeTimers, characterInfo, displayEqLines, displayedAlertness, timerNow, vitals.conditions, vitals.position]);

    // Command dispatchers for state pills
    const handleStateSelect = (kind: 'pos' | 'alert' | 'mood' | 'speed', option: StateOption) => {
        if (isSpectateMode) return;
        if (kind === 'pos') {
            if (!pendingCommandPrefix) {
                const currentPosition = (vitals.position || '').toLowerCase();
                const nextPosition = option.value.toLowerCase();
                if (currentPosition === 'sleeping' && nextPosition !== 'sleeping') {
                    executeCommand('wake');
                }
                setPlayerPosition(option.value as 'standing' | 'sitting' | 'resting' | 'sleeping');
            }
            if (option.command) executeCommand(applyTacticalCommandPrefix(option.command));
        } else if (kind === 'alert') {
            setAlertness(option.value);
            if (option.command) executeCommand(option.command);
        } else if (kind === 'mood') {
            setMood(option.value);
            if (option.command) executeCommand(option.command);
        } else if (kind === 'speed') {
            setSpellSpeed(option.value);
            if (option.command) executeCommand(option.command);
        }
    };

    // Capitalize state display
    const currentPosition = (vitals.position || 'standing').charAt(0).toUpperCase() + (vitals.position || 'standing').slice(1);
    const currentAlertness = (displayedAlertness || 'normal').charAt(0).toUpperCase() + (displayedAlertness || 'normal').slice(1);
    const currentMood = (displayedMood || 'normal').charAt(0).toUpperCase() + (displayedMood || 'normal').slice(1);
    const currentSpellSpeed = (displayedSpellSpeed || 'normal').charAt(0).toUpperCase() + (displayedSpellSpeed || 'normal').slice(1);

    const activeConditions = useCharacterConditions(
        vitals.characterInfo.affectedBy, vitals.conditions, activeTimers, vitals.position, timerNow
    );
    const conditionTimers = useMemo(() => activeTimers.filter(timer => {
        if (timer.expiresAt && timer.expiresAt <= timerNow) return false;
        if (!timer.target || timer.target.toLowerCase() === 'self') return true;
        const timerCharacterName = viewingSpectateTarget ? spectateTarget || characterInfo?.name : characterName || characterInfo?.name;
        return normalizeConditionTimerName(timer.target) === normalizeConditionTimerName(timerCharacterName || '');
    }), [activeTimers, characterInfo?.name, characterName, spectateTarget, timerNow, viewingSpectateTarget]);
    const getConditionTimer = (condition: string) => {
        const normalized = normalizeConditionTimerName(condition);
        return conditionTimers.find(candidate => {
            const timerName = normalizeConditionTimerName(candidate.name);
            const timerId = normalizeConditionTimerName(candidate.catalogId);
            return timerName === normalized
                || timerName.includes(normalized)
                || normalized.includes(timerName)
                || timerId.includes(normalized);
        });
    };
    const getConditionTimerText = (condition: string): { text: string; label: string } | null => {
        const timer = getConditionTimer(condition);
        if (!timer) return null;
        if (isSpellEffectTimer(timer.kind)) return {
            text: formatConditionTimeElapsed(timerNow - timer.startedAt),
            label: 'Time active'
        };
        return timer.expiresAt ? {
            text: formatConditionTimeLeft(timer.expiresAt - timerNow),
            label: 'Time remaining'
        } : null;
    };

    const name = viewingSpectateTarget
        ? (spectateTarget || characterInfo?.name || characterName || 'Adventurer')
        : (characterInfo?.name || characterName || 'Adventurer');
    const level = characterInfo?.level || '—';
    const ancestry = characterInfo?.subrace || characterInfo?.race || '—';
    const subclass = characterInfo?.subclass ? ` · ${characterInfo.subclass}` : '';
    const statValues = useMemo(() => ({
        gold: characterInfo?.gold ?? null, xp: characterInfo?.xp ?? null, tp: characterInfo?.tp ?? null,
        hp: vitals.hp ?? null, mana: vitals.mana ?? null, move: vitals.move ?? null,
        ob: vitals.ob ?? null, pb: vitals.pb ?? null, db: vitals.db ?? null,
        armour: vitals.armour ?? null, wimpy: vitals.wimpy ?? null
    }), [characterInfo?.gold, characterInfo?.xp, characterInfo?.tp, vitals.hp, vitals.mana,
        vitals.move, vitals.ob, vitals.pb, vitals.db, vitals.armour, vitals.wimpy]);
    const deltas = useStatDeltas(characterInfo?.name || characterName || '', statValues);
    const movementModes = getMovementModeActions(vitals);
    const handleWimpyChange = () => {
        const nextPreset = getNextWimpyPreset(displayWimpy ?? 0, vitals.maxHp ?? 0);
        if (!nextPreset || isSpectateMode) return;
        setDisplayWimpy(nextPreset.value);
        triggerHaptic(15);
        executeCommand(nextPreset.value === 0
            ? 'cha wimpy 0'
            : `change wimpy ${nextPreset.value}`);
    };
    const handleVitalsRefresh = () => {
        if (gameState !== 'playing' || isSpectateMode) return;
        triggerHaptic(10);
        executeCommand('score', true, true, true, true);
        window.setTimeout(refreshCharacterInfo, 3000);
    };

    const handleHeaderClick = () => {
        if (alwaysExpanded) return;
        triggerHaptic(10);
        toggleMinimized();
    };

    // --- Render Section ---
    const consolePanel = (
        <section
            ref={consoleRef}
            className={`this-is-you-console${panelIsMinimized ? ' is-minimized' : ''}${viewport?.isMobile ? ' is-mobile' : ''}${isMobileSheet ? ' is-mobile-sheet' : ''}${isPanelBlurred ? ' has-blurred-background' : ''}${alwaysExpanded ? ' is-always-expanded' : ''}`}
            aria-label="Character Status Console"
            onTouchStart={minimizeSwipe.onTouchStart}
            onTouchEnd={minimizeSwipe.onTouchEnd}
            onTouchCancel={minimizeSwipe.onTouchCancel}
            onTouchStartCapture={expandSwipe.onTouchStart}
            onTouchEndCapture={expandSwipe.onTouchEnd}
            onTouchCancelCapture={expandSwipe.onTouchCancel}
        >
            {/* TIER 1: Identity, Full Bio Metrics & Progression */}
            <div
                className="this-is-you-tier-identity"
                onClick={handleHeaderClick}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                    if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) {
                        e.preventDefault();
                        handleHeaderClick();
                    }
                }}
                title={alwaysExpanded ? 'Character status' : panelIsMinimized ? 'Click to expand character panel' : 'Click to minimize character panel'}
                aria-label={alwaysExpanded ? 'Character status' : panelIsMinimized ? 'Character panel minimized. Click to expand.' : 'Character panel expanded. Click to minimize.'}
            >
              <div className="this-is-you-hero-strip">
                <span className="this-is-you-level-tag">Lv.{level}</span>
                <strong className="this-is-you-name">{name}</strong>
                <span className="this-is-you-subtext">{ancestry}{subclass}</span>
                <span className="this-is-you-bio-item this-is-you-desktop-detail">Height: <strong>{formatHeight(characterInfo?.height)}</strong></span>
                <span className="this-is-you-bio-item this-is-you-desktop-detail">Age: <strong>{characterInfo?.age || '—'}</strong></span>
                <span className="this-is-you-bio-item">Gold: <strong className="gold">{formatNumber(characterInfo?.gold)}</strong><StatDelta delta={deltas.gold} /></span>
                <span className="this-is-you-bio-item this-is-you-desktop-detail">War Fame: <strong className="cyan" title="War fame from info %K">{formatNumber(characterInfo?.warPoints ?? characterInfo?.warFame)}</strong></span>
              </div>

              <div className="this-is-you-identity-actions">
                <TerminalProgression characterName={name}
                  xp={characterInfo?.xp} tp={characterInfo?.tp}
                  tnl={characterInfo?.tnl} tpnl={characterInfo?.tpnl} />
                {!panelIsMinimized && <button
                  type="button"
                  className="this-is-you-refresh-button"
                  aria-label="Refresh score"
                  title="Refresh score"
                  disabled={gameState !== 'playing' || isSpectateMode}
                  onClick={(event) => {
                    event.stopPropagation();
                    handleVitalsRefresh();
                  }}
                >
                  <RefreshCw size={16} aria-hidden="true" />
                </button>}
                {!alwaysExpanded && <span className="this-is-you-expand-indicator" aria-hidden="true">
                  {panelIsMinimized ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </span>}
              </div>
            </div>

            <div className="this-is-you-minimized-summary" aria-label="Combat and state summary">
              <div className="this-is-you-minimized-summary-group" aria-label="Combat">
                <strong>COMBAT</strong>
                <span>Off <b>{vitals.ob ?? '—'}</b></span>
                <span>Parry <b>{vitals.pb ?? '—'}</b></span>
                <span>Dodge <b>{vitals.db ?? '—'}</b></span>
                <span>Armor <b>{vitals.armour ?? '—'}</b></span>
              </div>
              <div className="this-is-you-minimized-summary-group" aria-label="State">
                <strong>STATE</strong>
                <ThisIsYouStatePill category="Position" accentColor="blue" value={currentPosition} options={POSITION_OPTIONS} isMobile={Boolean(viewport?.isMobile)} isCompact={panelIsMinimized && !viewport?.isMobile} isCommandPrefixPending={Boolean(pendingCommandPrefix)} disabled={isSpectateMode} onInteract={() => triggerHaptic(15)} onSelect={opt => handleStateSelect('pos', opt)} />
                <ThisIsYouStatePill category="Mood" accentColor="red" value={currentMood} options={MOOD_OPTIONS} isMobile={Boolean(viewport?.isMobile)} isCompact={panelIsMinimized && !viewport?.isMobile} confirmOptionValue="berserk" confirmMessage="Berserk prevents fleeing. Tap Berserk again within 4 seconds to confirm." disabled={isSpectateMode} onInteract={() => triggerHaptic(15)} onSelect={opt => handleStateSelect('mood', opt)} />
                <ThisIsYouStatePill category="Cast" accentColor="purple" value={currentSpellSpeed} options={SPELL_SPEED_OPTIONS} isMobile={Boolean(viewport?.isMobile)} isCompact={panelIsMinimized && !viewport?.isMobile} disabled={isSpectateMode} onInteract={() => triggerHaptic(15)} onSelect={opt => handleStateSelect('speed', opt)} />
                <ThisIsYouStatePill category="Alert" accentColor="gold" value={currentAlertness} options={ALERTNESS_OPTIONS} isMobile={Boolean(viewport?.isMobile)} isCompact={panelIsMinimized && !viewport?.isMobile} disabled={isSpectateMode} onInteract={() => triggerHaptic(15)} onSelect={opt => handleStateSelect('alert', opt)} />
              </div>
            </div>

            <div className="this-is-you-body-wrapper">
              <div className="this-is-you-body-inner">

            {/* TIER 2: Vitals & Combat Capabilities (Attack, Dodge, Parry, Armor) */}
            <ThisIsYouVitalsTier
                hp={vitals.hp}
                maxHp={vitals.maxHp}
                mana={vitals.mana}
                maxMana={vitals.maxMana}
                move={vitals.move}
                maxMove={vitals.maxMove}
                ob={vitals.ob}
                pb={vitals.pb}
                db={vitals.db}
                armour={vitals.armour}
                wimpy={displayWimpy}
                onWimpyChange={handleWimpyChange}
                canAdjustWimpy={!isSpectateMode && (vitals.maxHp ?? 0) > 0}
                regen={regen}
                deltas={deltas}
            />

            {/* TIER 3: Category-Explicit State Pills + Self-Describing Buffs */}
            <div className="this-is-you-tier-states" role="group" aria-label="State">
              <div className="this-is-you-pills-row">
                <ThisIsYouStatePill
                  category="Position"
                  accentColor="blue"
                  value={currentPosition}
                  options={POSITION_OPTIONS}
                  inlineOptions={Boolean(viewport?.isMobile)}
                  isMobile={Boolean(viewport?.isMobile)}
                  isCommandPrefixPending={Boolean(pendingCommandPrefix)}
                  disabled={isSpectateMode}
                  onInteract={() => triggerHaptic(15)}
                  onSelect={opt => handleStateSelect('pos', opt)}
                />
                <ThisIsYouStatePill
                  category="Mood"
                  accentColor="red"
                  value={currentMood}
                  options={MOOD_OPTIONS}
                  confirmOptionValue="berserk"
                  confirmMessage="Berserk prevents fleeing. Tap Berserk again within 4 seconds to confirm."
                  inlineOptions={Boolean(viewport?.isMobile)}
                  isMobile={Boolean(viewport?.isMobile)}
                  disabled={isSpectateMode}
                  onInteract={() => triggerHaptic(15)}
                  onSelect={opt => handleStateSelect('mood', opt)}
                />
                <ThisIsYouStatePill
                  category="Cast Speed"
                  accentColor="purple"
                  value={currentSpellSpeed}
                  options={SPELL_SPEED_OPTIONS}
                  inlineOptions={Boolean(viewport?.isMobile)}
                  disabled={isSpectateMode}
                  onInteract={() => triggerHaptic(15)}
                  onSelect={opt => handleStateSelect('speed', opt)}
                />
                <ThisIsYouStatePill
                  category="Alertness"
                  accentColor="gold"
                  value={currentAlertness}
                  options={ALERTNESS_OPTIONS}
                  inlineOptions={Boolean(viewport?.isMobile)}
                  disabled={isSpectateMode}
                  onInteract={() => triggerHaptic(15)}
                  onSelect={opt => handleStateSelect('alert', opt)}
                />
              </div>
            </div>
            <div className="this-is-you-tier-modes" role="group" aria-label="Movement and stealth">
              {movementModes.map(mode => (
                <button
                  key={mode.id}
                  type="button"
                  className="this-is-you-mode-row"
                  aria-label={`${mode.label} ${mode.active ? 'on' : 'off'}. Click to toggle.`}
                  aria-pressed={mode.active}
                  title={`Send: ${mode.command}`}
                  disabled={isSpectateMode}
                  onClick={() => { triggerHaptic(15); executeCommand(mode.command); }}
                >
                  <span>{mode.label}</span><strong>{mode.active ? 'On' : 'Off'}</strong>
                </button>
              ))}
            </div>
            <div className="this-is-you-buffs-row" aria-label="Active buffs and affects">
                  {activeConditions.length === 0 && <span className="this-is-you-no-buffs">steady · no active effects</span>}
                  {activeConditions.map(condition => {
                    const timer = getConditionTimer(condition);
                    const timerText = getConditionTimerText(condition);
                    const timerTone = timer ? getEffectTimerTone(timer.kind) : null;
                    return (
                      <span key={condition} className={`this-is-you-buff-badge${timerTone ? ` is-${timerTone}-timer` : ''}`}>
                        <strong className="this-is-you-buff-name">{condition}</strong>
                        {timerText && <span className="this-is-you-buff-time" aria-label={timerText.label}>
                          {timerText.text}
                        </span>}
                      </span>
                    );
                  })}
            </div>
              </div>
            </div>
        </section>
    );

    return isMobileSheet && mobileSheetPortalHost
        ? <>
            <div
                className="this-is-you-mobile-sheet-placeholder"
                aria-hidden="true"
                style={{ height: `${mobileSheetPlaceholderHeightRef.current}px` }}
            />
            {createPortal(
                consolePanel,
                mobileSheetPortalHost
            )}
        </>
        : consolePanel;
};

export default ThisIsYouConsole;
