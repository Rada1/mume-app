/**
 * @file PromptModeIndicators.tsx
 * @description Interactive MUME prompt indicators backed by the shared slider popouts.
 */

// --- Logic Section ---
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useGame } from '../../context/GameContext';
import { useActiveVitals } from '../../stores/useActiveGameState';
import { CombatSliderPopout } from '../Combat/CombatSliderPopout';
import { DispositionSliderPopout, DispositionSliderConfig } from '../HUD/DispositionSliderPopout';
import { PromptAffectedIndicators } from './PromptAffectedIndicators';

const MOOD_OPTIONS = ['wimpy', 'prudent', 'normal', 'brave', 'aggressive', 'berserk'];
const MOOD_LABELS = ['WIMPY', 'PRUDENT', 'NORMAL', 'BRAVE', 'AGGRESSIVE', 'BERSERK'];
const SPEED_OPTIONS = ['quick', 'fast', 'normal', 'careful', 'thorough'];
const SPEED_LABELS = ['QUICK', 'FAST', 'NORMAL', 'CAREFUL', 'THOROUGH'];
const ALERT_OPTIONS = ['normal', 'careful', 'attentive', 'vigilant', 'paranoid'];
const ALERT_LABELS = ['NORMAL', 'CAREFUL', 'ATTENTIVE', 'VIGILANT', 'PARANOID'];
const POSITION_OPTIONS = ['sleeping', 'resting', 'sitting', 'standing'];

const POSITION_CODES: Record<string, number> = {
    dying: 1,
    incapacitated: 2,
    stunned: 3,
    sleeping: 4,
    resting: 5,
    sitting: 6,
    fighting: 7,
    standing: 8
};

const POSITION_SLIDER_CODES = POSITION_OPTIONS.map(opt => POSITION_CODES[opt]);

const getOptionCode = (value: string, options: string[]): number => {
    const normalized = value.toLowerCase();
    const exactIndex = options.indexOf(normalized);
    if (exactIndex >= 0) return exactIndex + 1;
    const prefixIndex = options.findIndex(option => normalized.startsWith(option.slice(0, 3)));
    return prefixIndex >= 0 ? prefixIndex + 1 : 1;
};

const PromptIndicatorButton: React.FC<{
    label: string;
    title: string;
    onClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
    active?: boolean;
    className?: string;
}> = ({ label, title, onClick, active = false, className = '' }) => (
    <button
        type="button"
        className={`prompt-mode-indicator ${className}${active ? ' active' : ''}`.trim()}
        title={title}
        aria-label={title}
        onClick={onClick}
    >
        {label}
    </button>
);

// --- Render Section ---
export const PromptModeIndicators: React.FC = () => {
    const {
        executeCommand,
        mood,
        setMood,
        spellSpeed,
        setSpellSpeed,
        alertness,
        setAlertness,
        setPlayerPosition,
        triggerHaptic,
        playEffect,
        isSpectateMode
    } = useGame();
    const vitals = useActiveVitals();
    const [activeSlider, setActiveSlider] = useState<'position' | 'mood' | 'speed' | 'alert' | null>(null);
    const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);

    const openSlider = useCallback((slider: 'position' | 'mood' | 'speed' | 'alert', event: React.MouseEvent<HTMLButtonElement>) => {
        if (isSpectateMode) return;
        event.stopPropagation();
        triggerHaptic(10);
        setAnchorRect(event.currentTarget.getBoundingClientRect());
        setActiveSlider(current => current === slider ? null : slider);
    }, [isSpectateMode, triggerHaptic]);

    const dispositionSliders: DispositionSliderConfig[] = useMemo(() => ([
        { id: 'mood', label: 'Mood', value: mood || 'normal', options: MOOD_OPTIONS, displayLabels: MOOD_LABELS },
        { id: 'speed', label: 'Spell Speed', value: spellSpeed || 'normal', options: SPEED_OPTIONS, displayLabels: SPEED_LABELS },
        { id: 'alert', label: 'Alertness', value: alertness || 'normal', options: ALERT_OPTIONS, displayLabels: ALERT_LABELS }
    ]), [alertness, mood, spellSpeed]);

    const handleDispositionSelect = useCallback((id: DispositionSliderConfig['id'], value: string) => {
        if (id === 'mood') {
            setMood(value);
            executeCommand(`cha mood ${value}`);
        } else if (id === 'speed') {
            setSpellSpeed(value);
            executeCommand(`change spell ${value}`);
        } else {
            setAlertness(value);
            executeCommand(`cha alert ${value}`);
        }
        triggerHaptic(15);
    }, [executeCommand, playEffect, setAlertness, setMood, setSpellSpeed, triggerHaptic]);

    const handlePositionSelect = useCallback((value: string, index: number) => {
        const currentPosition = vitals.position.toLowerCase();
        if (currentPosition === 'sleeping' && index > 0) executeCommand('wake');
        setPlayerPosition(value);
        executeCommand(value === 'sleeping' ? 'sleep' : value === 'resting' ? 'rest' : value === 'sitting' ? 'sit' : 'stand');
        triggerHaptic(15);
        playEffect('slider');
    }, [executeCommand, playEffect, setPlayerPosition, triggerHaptic, vitals.position]);

    const handleMovementClick = useCallback((command: 'swim' | 'ride' | 'lead' | 'climb' | 'sneak', event: React.MouseEvent<HTMLButtonElement>) => {
        if (isSpectateMode) return;
        event.stopPropagation();
        triggerHaptic(10);
        executeCommand(command);
        playEffect('slider');
    }, [executeCommand, isSpectateMode, playEffect, triggerHaptic]);

    const position = vitals.position.toLowerCase();
    const moodCode = getOptionCode(mood || 'normal', MOOD_OPTIONS);
    const speedCode = getOptionCode(spellSpeed || 'normal', SPEED_OPTIONS);
    const alertCode = getOptionCode(alertness || 'normal', ALERT_OPTIONS);
    const positionCode = POSITION_CODES[position] || POSITION_CODES.standing;
    const previousModeValuesRef = useRef<Record<string, string> | null>(null);
    const [modeAnimationKeys, setModeAnimationKeys] = useState<Record<string, number>>({});
    const modeValues = useMemo(() => ({
        position,
        alertness: alertness || 'normal',
        speed: spellSpeed || 'normal',
        mood: mood || 'normal'
    }), [alertness, mood, position, spellSpeed]);

    useEffect(() => {
        const previousValues = previousModeValuesRef.current;
        if (previousValues) {
            const changedModes = Object.keys(modeValues).filter(mode => previousValues[mode] !== modeValues[mode]);
            if (changedModes.length > 0) {
                setModeAnimationKeys(current => {
                    const next = { ...current };
                    for (const mode of changedModes) next[mode] = (current[mode] || 0) + 1;
                    return next;
                });
            }
        }
        previousModeValuesRef.current = modeValues;
    }, [modeValues]);
    const movementIndicators = [
        { id: 'swim', label: 'W', title: vitals.isSwimming ? 'Swimming — click to toggle' : 'Swim — click to toggle', active: vitals.isSwimming, command: 'swim' as const },
        { id: 'ride', label: 'R', title: vitals.isRiding ? 'Riding — click to lead' : 'Ride — click to ride', active: vitals.isRiding, command: (vitals.isRiding ? 'lead' : 'ride') as const },
        {
            id: 'climb',
            label: vitals.climb?.toLowerCase().includes('safe') ? 'c' : 'C',
            title: vitals.climb ? (vitals.climb.toLowerCase().includes('safe') ? 'Climbing safely — click to toggle' : 'Climbing — click to toggle') : 'Climb — click to toggle',
            active: Boolean(vitals.climb),
            command: 'climb' as const
        },
        { id: 'sneak', label: 'S', title: vitals.sneak ? 'Sneaking — click to toggle' : 'Sneak — click to toggle', active: Boolean(vitals.sneak), command: 'sneak' as const }
    ];
    const previousMovementStatesRef = useRef<Record<string, boolean> | null>(null);
    const [movementAnimations, setMovementAnimations] = useState<Record<string, { direction: 'up' | 'down'; key: number }>>({});
    const movementStates = useMemo(() => Object.fromEntries(
        movementIndicators.map(({ id, active }) => [id, active])
    ), [vitals.climb, vitals.isRiding, vitals.isSwimming, vitals.sneak]);

    useEffect(() => {
        const previousStates = previousMovementStatesRef.current;
        if (previousStates) {
            const changes = Object.entries(movementStates).filter(([id, active]) => previousStates[id] !== active);
            if (changes.length > 0) {
                setMovementAnimations(current => {
                    const next = { ...current };
                    for (const [id, active] of changes) {
                        next[id] = { direction: active ? 'up' : 'down', key: (current[id]?.key || 0) + 1 };
                    }
                    return next;
                });
            }
        }
        previousMovementStatesRef.current = movementStates;
    }, [movementStates]);

    const previousCombatStatsRef = useRef<Record<string, number | undefined> | null>(null);
    const [combatStatAnimations, setCombatStatAnimations] = useState<Record<string, { direction: 'up' | 'down'; key: number }>>({});
    const combatStatValues = useMemo(() => ({
        OB: vitals.ob,
        DB: vitals.db,
        PB: vitals.pb,
        ARM: vitals.armour
    }), [vitals.armour, vitals.db, vitals.ob, vitals.pb]);

    useEffect(() => {
        const previousValues = previousCombatStatsRef.current;
        if (previousValues) {
            const changes = Object.entries(combatStatValues).filter(([label, value]) =>
                value !== undefined && previousValues[label] !== undefined && value !== previousValues[label]
            );
            if (changes.length > 0) {
                setCombatStatAnimations(current => {
                    const next = { ...current };
                    for (const [label, value] of changes) {
                        next[label] = {
                            direction: value! > previousValues[label]! ? 'up' : 'down',
                            key: (current[label]?.key || 0) + 1
                        };
                    }
                    return next;
                });
            }
        }
        previousCombatStatsRef.current = combatStatValues;
    }, [combatStatValues]);

    const combatStats = [
        { label: 'OB', name: 'Offensive bonus', description: 'Improves your chance to hit and the damage of your attacks.', value: vitals.ob },
        { label: 'DB', name: 'Defensive bonus', description: 'Makes you harder for opponents to hit.', value: vitals.db },
        { label: 'PB', name: 'Parry bonus', description: 'Improves your ability to parry incoming attacks.', value: vitals.pb },
        { label: 'ARM', name: 'Armour', description: 'Reduces the damage you take from physical attacks.', value: vitals.armour }
    ].filter(stat => stat.value !== undefined);

    return (
        <span className="prompt-control-group">
            <span className="custom-prompt-prefix">[</span>
            {movementIndicators.length > 0 && (
                <span className="prompt-movement-indicators" aria-label="Movement states">
                    {movementIndicators.map((indicator, index) => {
                        const animation = movementAnimations[indicator.id];
                        return (
                        <React.Fragment key={indicator.id}>
                            {index > 0 && <span className="prompt-stat-divider">|</span>}
                            <PromptIndicatorButton
                                key={animation?.key || 0}
                                label={indicator.label}
                                title={indicator.title}
                                active={indicator.active}
                                className={`prompt-movement-indicator${animation ? ` movement-indicator-change-${animation.direction}` : ''}`}
                                onClick={event => handleMovementClick(indicator.command, event)}
                            />
                        </React.Fragment>
                        );
                    })}
                </span>
            )}
            {movementIndicators.length > 0 && <span className="prompt-stat-divider">|</span>}
            <span className="prompt-mode-indicators" aria-label="Character settings">
                <PromptIndicatorButton
                    key={modeAnimationKeys.position || 0}
                    label={`P${positionCode}`}
                    title={`Position: ${position}`}
                    active={activeSlider === 'position'}
                    className={modeAnimationKeys.position ? 'mode-indicator-change' : ''}
                    onClick={event => openSlider('position', event)}
                />
                <span className="prompt-stat-divider">|</span>
                <PromptIndicatorButton
                    key={modeAnimationKeys.alertness || 0}
                    label={`A${alertCode}`}
                    title={`Alertness: ${alertness || 'normal'}`}
                    className={modeAnimationKeys.alertness ? 'mode-indicator-change' : ''}
                    onClick={event => openSlider('alert', event)}
                />
                <span className="prompt-stat-divider">|</span>
                <PromptIndicatorButton
                    key={modeAnimationKeys.speed || 0}
                    label={`S${speedCode}`}
                    title={`Spell speed: ${spellSpeed || 'normal'}`}
                    className={modeAnimationKeys.speed ? 'mode-indicator-change' : ''}
                    onClick={event => openSlider('speed', event)}
                />
                <span className="prompt-stat-divider">|</span>
                <PromptIndicatorButton
                    key={modeAnimationKeys.mood || 0}
                    label={`M${moodCode}`}
                    title={`Mood: ${mood || 'normal'}`}
                    className={modeAnimationKeys.mood ? 'mode-indicator-change' : ''}
                    onClick={event => openSlider('mood', event)}
                />
            </span>
            {combatStats.length > 0 && <span className="prompt-stat-divider">|</span>}
            {combatStats.length > 0 && (
                <span className="prompt-combat-stat-indicators" aria-label="Combat statistics">
                    {combatStats.map((stat, index) => {
                        const animation = combatStatAnimations[stat.label];
                        return (
                        <React.Fragment key={stat.label}>
                            {index > 0 && <span className="prompt-stat-divider">|</span>}
                            <span className="prompt-stat-item" title={`${stat.name}: ${stat.description}`}>
                                <span className="prompt-stat-label">{stat.label}</span>
                                <span
                                    key={animation?.key || 0}
                                    className={`prompt-stat-value${animation ? ` combat-stat-change-${animation.direction}` : ''}`}
                                >
                                    {stat.value}%
                                </span>
                            </span>
                        </React.Fragment>
                        );
                    })}
                </span>
            )}
            <span className="custom-prompt-prefix">]</span>
            <PromptAffectedIndicators />
            {activeSlider === 'position' && anchorRect && (
                <CombatSliderPopout
                    label="POSITION"
                    value={POSITION_OPTIONS.includes(position) ? position : 'standing'}
                    options={POSITION_OPTIONS}
                    codes={POSITION_SLIDER_CODES}
                    anchorRect={anchorRect}
                    onSelect={handlePositionSelect}
                    onClose={() => setActiveSlider(null)}
                    triggerHaptic={triggerHaptic}
                />
            )}
            {activeSlider !== null && activeSlider !== 'position' && anchorRect && (
                <DispositionSliderPopout
                    slider={dispositionSliders.find(item => item.id === activeSlider)}
                    anchorRect={anchorRect}
                    onSelect={handleDispositionSelect}
                    onClose={() => setActiveSlider(null)}
                />
            )}
        </span>
    );
};

export default React.memo(PromptModeIndicators);
