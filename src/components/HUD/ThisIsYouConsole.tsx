/**
 * @file ThisIsYouConsole.tsx
 * @description Guided Interactive Bar: consolidates identity, bio, progression,
 * numerical vitals, plain-English capabilities, and category-explicit states into
 * a single cohesive "This is You" dashboard.
 */

// --- Logic Section ---
import React, { FC, useEffect, useMemo, useState } from 'react';
import { useGame, useUI } from '../../context/GameContext';
import { useActiveVitals } from '../../stores/useActiveGameState';
import { useEffectTimerStore } from '../../stores/useEffectTimerStore';
import { calculateRegen, formatRegen } from '../../utils/regenUtils';
import { useStatDeltas } from '../../hooks/useStatDeltas';
import { useCharacterConditions } from '../../hooks/useCharacterConditions';
import { useCharacterInfoRefresh } from '../../hooks/useCharacterInfoRefresh';
import { useSwipeUpToMinimize } from '../../hooks/useSwipeUpToMinimize';
import { getMovementModeActions } from '../../hooks/useMovementModeActions';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useCharacterPanelStore } from '../../stores/useCharacterPanelStore';
import { ThisIsYouVitalsTier } from './ThisIsYouVitalsTier';
import { StatDelta } from './StatDelta';
import { TerminalProgression } from './TerminalProgression';
import { ThisIsYouStatePill, StateOption } from './ThisIsYouStatePill';
import {
    formatHeight,
    formatNumber,
    POSITION_OPTIONS,
    ALERTNESS_OPTIONS,
    MOOD_OPTIONS,
    SPELL_SPEED_OPTIONS
} from './thisIsYouHelpers';
import './ThisIsYouConsole.css';
import './ThisIsYouTerminal.css';

export const ThisIsYouConsole: FC = () => {
    const isMinimized = useCharacterPanelStore(s => s.isMinimized);
    const toggleMinimized = useCharacterPanelStore(s => s.toggleMinimized);
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

    const vitals = useActiveVitals();
    const { displayEqLines } = useUI();
    const activeTimers = useEffectTimerStore(state => state.timers);
    useCharacterInfoRefresh(
        characterInfo?.name || characterName || '', gameState === 'playing' && !isSpectateMode, executeCommand
    );

    // Tick regen calculation
    const [regenNow, setRegenNow] = useState(() => Date.now());
    useEffect(() => {
        const timer = window.setInterval(() => setRegenNow(Date.now()), 60_000);
        return () => window.clearInterval(timer);
    }, []);

    const regen = useMemo(() => calculateRegen({
        equipped: (displayEqLines || []).filter(line => line.isItem).map(line => line.rawText || line.text),
        race: characterInfo?.race,
        position: vitals.position,
        alertness,
        conditions: vitals.conditions,
        age: characterInfo?.age,
        attributes: characterInfo?.stats,
        timers: activeTimers,
        now: regenNow,
    }), [activeTimers, alertness, characterInfo, displayEqLines, regenNow, vitals.conditions, vitals.position]);

    // Command dispatchers for state pills
    const handleStateSelect = (kind: 'pos' | 'alert' | 'mood' | 'speed', option: StateOption) => {
        if (isSpectateMode) return;
        if (kind === 'pos') {
            setPlayerPosition(option.value as 'standing' | 'sitting' | 'resting' | 'sleeping');
            if (option.command) executeCommand(option.command);
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
    const currentAlertness = (alertness || 'normal').charAt(0).toUpperCase() + (alertness || 'normal').slice(1);
    const currentMood = (mood || 'normal').charAt(0).toUpperCase() + (mood || 'normal').slice(1);
    const currentSpellSpeed = (spellSpeed || 'normal').charAt(0).toUpperCase() + (spellSpeed || 'normal').slice(1);

    const activeConditions = useCharacterConditions(
        vitals.characterInfo.affectedBy, vitals.conditions, activeTimers, vitals.position, isSpectateMode
    );

    const name = characterInfo?.name || characterName || 'Adventurer';
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

    const handleToggleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        triggerHaptic(10);
        toggleMinimized();
    };

    const handleHeaderClick = () => {
        triggerHaptic(10);
        toggleMinimized();
    };
    const swipeHandlers = useSwipeUpToMinimize(Boolean(viewport?.isMobile && !isMinimized), () => {
        triggerHaptic(10);
        toggleMinimized();
    });

    // --- Render Section ---
    return (
        <section
            className={`this-is-you-console${isMinimized ? ' is-minimized' : ''}`}
            aria-label="Character Status Console"
            {...swipeHandlers}
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
                title={isMinimized ? 'Click to expand character panel' : 'Click to minimize character panel'}
                aria-label={isMinimized ? 'Character panel minimized. Click to expand.' : 'Character panel expanded. Click to minimize.'}
            >
              <div className="this-is-you-hero-strip">
                <span className="this-is-you-level-tag">Lv.{level}</span>
                <strong className="this-is-you-name">{name}</strong>
                <span className="this-is-you-subtext">{ancestry}{subclass}</span>
                <span className="this-is-you-bio-item this-is-you-desktop-detail">Height: <strong>{formatHeight(characterInfo?.height)}</strong></span>
                <span className="this-is-you-bio-item this-is-you-desktop-detail">Age: <strong>{characterInfo?.age || '—'}</strong></span>
                <span className="this-is-you-bio-item">Gold: <strong className="gold">{formatNumber(characterInfo?.gold)}</strong><StatDelta delta={deltas.gold} /></span>
                <span className="this-is-you-bio-item this-is-you-desktop-detail">Cit: <strong className="cyan" title="Citizenships count">{formatNumber(characterInfo?.citizenships)}</strong></span>
              </div>

              <div className="this-is-you-identity-actions">
                <TerminalProgression characterName={name}
                  xp={characterInfo?.xp} tp={characterInfo?.tp}
                  tnl={characterInfo?.tnl} tpnl={characterInfo?.tpnl} />
                <button
                  type="button"
                  className="this-is-you-toggle-btn"
                  onClick={handleToggleClick}
                  aria-label={isMinimized ? 'Expand character panel' : 'Minimize character panel'}
                  title={isMinimized ? 'Expand character panel (slide up)' : 'Minimize character panel (slide down)'}
                >
                  {isMinimized ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
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
                wimpy={vitals.wimpy}
                regen={regen}
                deltas={deltas}
            />

            {/* TIER 3: Category-Explicit State Pills + Self-Describing Buffs */}
            <div className="this-is-you-tier-states" role="group" aria-label="State">
              <div className="this-is-you-pills-row">
                <ThisIsYouStatePill
                  category="Position"
                  value={currentPosition}
                  options={POSITION_OPTIONS}
                  onInteract={() => triggerHaptic(15)}
                  onSelect={opt => handleStateSelect('pos', opt)}
                />
                <ThisIsYouStatePill
                  category="Alertness"
                  value={currentAlertness}
                  options={ALERTNESS_OPTIONS}
                  onInteract={() => triggerHaptic(15)}
                  onSelect={opt => handleStateSelect('alert', opt)}
                />
                <ThisIsYouStatePill
                  category="Mood"
                  value={currentMood}
                  options={MOOD_OPTIONS}
                  onInteract={() => triggerHaptic(15)}
                  onSelect={opt => handleStateSelect('mood', opt)}
                />
                <ThisIsYouStatePill
                  category="Cast Speed"
                  value={currentSpellSpeed}
                  options={SPELL_SPEED_OPTIONS}
                  onInteract={() => triggerHaptic(15)}
                  onSelect={opt => handleStateSelect('speed', opt)}
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
                  {activeConditions.map(condition => (
                    <span key={condition} className="this-is-you-buff-badge">
                      <strong className="this-is-you-buff-name">{condition}</strong>
                    </span>
                  ))}
            </div>
              </div>
            </div>
        </section>
    );
};

export default ThisIsYouConsole;
