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
import { StatDelta } from './StatDelta';
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
    const {
        characterInfo,
        characterName,
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
        triggerHaptic(15);
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

    // --- Render Section ---
    return (
        <section className="this-is-you-console" aria-label="Character Status Console">
            {/* TIER 1: Identity, Full Bio Metrics & Progression */}
            <div className="this-is-you-tier-identity">
              <div className="this-is-you-hero-strip">
                <span className="this-is-you-level-tag">Lv.{level}</span>
                <strong className="this-is-you-name">{name}</strong>
                <span className="this-is-you-subtext">{ancestry}{subclass}</span>
                <span className="this-is-you-bio-item">Height: <strong>{formatHeight(characterInfo?.height)}</strong></span>
                <span className="this-is-you-bio-item">Age: <strong>{characterInfo?.age || '—'}</strong></span>
                <span className="this-is-you-bio-item">Gold: <strong className="gold">{formatNumber(characterInfo?.gold)}</strong><StatDelta delta={deltas.gold} /></span>
                <span className="this-is-you-bio-item">Cit: <strong className="cyan" title="Citizenships count">{formatNumber(characterInfo?.citizenships)}</strong></span>
              </div>

              <div className="this-is-you-xp-strip">
                <div className="this-is-you-xp-box">
                  <span className="this-is-you-stat-lbl">XP:</span>
                  <strong className="this-is-you-stat-val xp">{formatNumber(characterInfo?.xp)}</strong>
                  <StatDelta delta={deltas.xp} />
                  {characterInfo?.tnl !== undefined && (
                    <span className="this-is-you-stat-sub">({formatNumber(characterInfo.tnl)} next)</span>
                  )}
                </div>
                <div className="this-is-you-xp-box">
                  <span className="this-is-you-stat-lbl">TP:</span>
                  <strong className="this-is-you-stat-val tp">{formatNumber(characterInfo?.tp)}</strong>
                  <StatDelta delta={deltas.tp} />
                  {characterInfo?.tpnl !== undefined && (
                    <span className="this-is-you-stat-sub">({formatNumber(characterInfo.tpnl)} skill)</span>
                  )}
                </div>
              </div>
            </div>

            {/* TIER 2: Vitals & Combat Capabilities (Attack, Dodge, Parry, Armor) */}
            <div className="this-is-you-tier-vitals">
              {/* Pure Numerical Vitals */}
              <div className="this-is-you-vitals-group" role="group" aria-label="Vitals">
                <div className="this-is-you-telemetry-cell">
                  <div className="this-is-you-cell-header">
                    <span className="label hp">HEALTH</span>
                    <span className="regen" title="Regen rate per tick">({formatRegen(regen.hp)})</span>
                  </div>
                  <div className={`this-is-you-cell-val${(vitals.hp ?? 100) < 30 ? ' is-critical' : ''}`}>
                    {vitals.hp ?? '—'}{vitals.maxHp ? ` / ${vitals.maxHp}` : ''}<StatDelta delta={deltas.hp} />
                  </div>
                </div>

                <div className="this-is-you-telemetry-cell">
                  <div className="this-is-you-cell-header">
                    <span className="label mana">MANA</span>
                    <span className="regen" title="Regen rate per tick">({formatRegen(regen.mana)})</span>
                  </div>
                  <div className="this-is-you-cell-val">
                    {vitals.mana ?? '—'}{vitals.maxMana ? ` / ${vitals.maxMana}` : ''}<StatDelta delta={deltas.mana} />
                  </div>
                </div>

                <div className="this-is-you-telemetry-cell">
                  <div className="this-is-you-cell-header">
                    <span className="label move">MOVES</span>
                    <span className="regen" title="Regen rate per tick">({formatRegen(regen.move)})</span>
                  </div>
                  <div className="this-is-you-cell-val">
                    {vitals.move ?? '—'}{vitals.maxMove ? ` / ${vitals.maxMove}` : ''}<StatDelta delta={deltas.move} />
                  </div>
                </div>
              </div>

              {/* Combat capabilities */}
              <div className="this-is-you-combat-slot" role="group" aria-label="Combat">
                  <div className="this-is-you-capabilities-cell">
                    <div className="this-is-you-cell-header">
                      <span>Combat Ratings</span>
                      <span className="sub">Gear &amp; Stance</span>
                    </div>
                    <div className="this-is-you-capabilities-row">
                      <span title="Offensive Power (OB): strike accuracy and damage">Offense: <strong>{vitals.ob ?? '—'}</strong><StatDelta delta={deltas.ob} /></span>
                      <span title="Parry Deflection (PB): weapon blocking rating">Parry: <strong>{vitals.pb ?? '—'}</strong><StatDelta delta={deltas.pb} /></span>
                      <span title="Defensive Evasion (DB): makes you harder to hit">Dodge: <strong>{vitals.db ?? '—'}</strong><StatDelta delta={deltas.db} /></span>
                      <span title="Armor Absorption (ARM): physical damage reduction">Armor: <strong>{vitals.armour ?? '—'}</strong><StatDelta delta={deltas.armour} /></span>
                      <span title="Wimpy Threshold (%y): automatically flee combat when health drops below this value">Wimpy: <strong>{vitals.wimpy !== undefined && vitals.wimpy !== null ? vitals.wimpy : '—'}</strong><StatDelta delta={deltas.wimpy} /></span>
                    </div>
                  </div>
              </div>
            </div>

            {/* TIER 3: Category-Explicit State Pills + Self-Describing Buffs */}
            <div className="this-is-you-tier-states" role="group" aria-label="State">
              <div className="this-is-you-pills-row">
                <ThisIsYouStatePill
                  category="Position"
                  value={currentPosition}
                  options={POSITION_OPTIONS}
                  onSelect={opt => handleStateSelect('pos', opt)}
                />
                <ThisIsYouStatePill
                  category="Alertness"
                  value={currentAlertness}
                  options={ALERTNESS_OPTIONS}
                  onSelect={opt => handleStateSelect('alert', opt)}
                />
                <ThisIsYouStatePill
                  category="Mood"
                  value={currentMood}
                  options={MOOD_OPTIONS}
                  onSelect={opt => handleStateSelect('mood', opt)}
                />
                <ThisIsYouStatePill
                  category="Cast Speed"
                  value={currentSpellSpeed}
                  options={SPELL_SPEED_OPTIONS}
                  onSelect={opt => handleStateSelect('speed', opt)}
                />
              </div>
            </div>
            <div className="this-is-you-buffs-row" aria-label="Active buffs and affects">
                  {activeConditions.length === 0 && <span className="this-is-you-no-buffs">steady · no active effects</span>}
                  {activeConditions.map(condition => (
                    <span key={condition} className="this-is-you-buff-badge">
                      <strong className="this-is-you-buff-name">{condition}</strong>
                    </span>
                  ))}
            </div>
        </section>
    );
};

export default ThisIsYouConsole;
