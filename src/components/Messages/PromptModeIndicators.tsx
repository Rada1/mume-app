/**
 * @file PromptModeIndicators.tsx
 * @description Interactive MUME prompt indicators for movement, stance, and combat ratings.
 */

// --- Logic Section ---
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useGame, useUI } from '../../context/GameContext';
import { useActiveVitals } from '../../stores/useActiveGameState';
import { CombatSliderPopout } from '../Combat/CombatSliderPopout';
import { DispositionSliderPopout, DispositionSliderConfig } from '../HUD/DispositionSliderPopout';
import { PromptAffectedIndicators } from './PromptAffectedIndicators';
import { calculateEquipmentSpellStats } from '../../utils/equipmentSpellStatsUtils';
import { audioManager } from '../../services/audio/audioManager';
import PromptMovementGroup, { MovementIndicatorItem } from '../HUD/PromptMovementGroup';
import PromptStanceGroup, { StanceItem } from '../HUD/PromptStanceGroup';
import PromptCombatStatsGroup, { CombatStatItem } from '../HUD/PromptCombatStatsGroup';
import { PromptTargetSelector } from '../HUD/PromptTargetSelector';

const MOOD_OPTIONS = ['wimpy', 'prudent', 'normal', 'brave', 'aggressive', 'berserk'];
const MOOD_LABELS = ['WIMPY', 'PRUDENT', 'NORMAL', 'BRAVE', 'AGGRESSIVE', 'BERSERK'];
const SPEED_OPTIONS = ['quick', 'fast', 'normal', 'careful', 'thorough'];
const SPEED_LABELS = ['QUICK', 'FAST', 'NORMAL', 'CAREFUL', 'THOROUGH'];
const ALERT_OPTIONS = ['normal', 'careful', 'attentive', 'vigilant', 'paranoid'];
const ALERT_LABELS = ['NORMAL', 'CAREFUL', 'ATTENTIVE', 'VIGILANT', 'PARANOID'];
const POSITION_OPTIONS = ['sleeping', 'resting', 'sitting', 'standing'];

const POSITION_CODES: Record<string, number> = {
    dying: 1, incapacitated: 2, stunned: 3, sleeping: 4,
    resting: 5, sitting: 6, fighting: 7, standing: 8
};

const POSITION_SLIDER_CODES = POSITION_OPTIONS.map(opt => POSITION_CODES[opt]);

// A server prompt can replace this component just as an info response updates
// combat values. Keep the comparison baseline across prompt instances.
let lastRenderedCombatStats: Record<string, number | undefined> | null = null;
let lastRenderedModeValues: Record<string, string> | null = null;
let renderedModeAnimationKeys: Record<string, number> = {};

const formatShortName = (val: string, map: Record<string, string>): string => {
    const key = (val || '').toLowerCase();
    return map[key] || (val ? `${val.charAt(0).toUpperCase()}${val.slice(1, 4)}` : 'Norm');
};

const MOOD_SHORT: Record<string, string> = { wimpy: 'Wimpy', prudent: 'Prud', normal: 'Norm', brave: 'Brave', aggressive: 'Aggr', berserk: 'Zerk' };
const SPEED_SHORT: Record<string, string> = { quick: 'Quick', fast: 'Fast', normal: 'Norm', careful: 'Care', thorough: 'Thor' };
const ALERT_SHORT: Record<string, string> = { normal: 'Norm', careful: 'Care', attentive: 'Attn', vigilant: 'Vigi', paranoid: 'Para' };
const POS_SHORT: Record<string, string> = { sleeping: 'Sleep', resting: 'Rest', sitting: 'Sit', standing: 'Stand' };

const getOptionCode = (value: string, options: string[]): number => {
    const normalized = value.toLowerCase();
    const exactIndex = options.indexOf(normalized);
    if (exactIndex >= 0) return exactIndex + 1;
    const prefixIndex = options.findIndex(option => normalized.startsWith(option.slice(0, 3)));
    return prefixIndex >= 0 ? prefixIndex + 1 : 1;
};

// --- Render Section ---
export const PromptModeIndicators: React.FC = () => {
    const {
        executeCommand, mood, setMood, spellSpeed, setSpellSpeed,
        alertness, setAlertness, setPlayerPosition, triggerHaptic,
        isSpectateMode
    } = useGame();
    const { displayEqLines } = useUI();
    const vitals = useActiveVitals();
    const equipmentSpellStats = calculateEquipmentSpellStats(
        displayEqLines.filter(line => line.isItem).map(line => line.rawText || line.text)
    );
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
    }, [executeCommand, setAlertness, setMood, setSpellSpeed, triggerHaptic]);

    const handlePositionSelect = useCallback((value: string, index: number) => {
        const currentPosition = vitals.position.toLowerCase();
        if (currentPosition === 'sleeping' && index > 0) executeCommand('wake');
        setPlayerPosition(value);
        executeCommand(value === 'sleeping' ? 'sleep' : value === 'resting' ? 'rest' : value === 'sitting' ? 'sit' : 'stand');
        triggerHaptic(15);
        audioManager.playEffect('slider');
    }, [executeCommand, setPlayerPosition, triggerHaptic, vitals.position]);

    const handleMovementClick = useCallback((command: 'swim' | 'ride' | 'lead' | 'climb' | 'sneak', event: React.MouseEvent<HTMLButtonElement>) => {
        if (isSpectateMode) return;
        event.stopPropagation();
        triggerHaptic(10);
        executeCommand(command);
        audioManager.playEffect('slider');
    }, [executeCommand, isSpectateMode, triggerHaptic]);

    const position = vitals.position.toLowerCase();
    const moodCode = getOptionCode(mood || 'normal', MOOD_OPTIONS);
    const speedCode = getOptionCode(spellSpeed || 'normal', SPEED_OPTIONS);
    const alertCode = getOptionCode(alertness || 'normal', ALERT_OPTIONS);
    const positionCode = POSITION_CODES[position] || POSITION_CODES.standing;
    const [modeAnimationKeys, setModeAnimationKeys] = useState<Record<string, number>>({});
    const modeValues = useMemo(() => ({
        position, alertness: alertness || 'normal', speed: spellSpeed || 'normal', mood: mood || 'normal'
    }), [alertness, mood, position, spellSpeed]);

    useEffect(() => {
        const previousValues = lastRenderedModeValues;
        if (previousValues) {
            const changedModes = Object.keys(modeValues).filter(mode => previousValues[mode] !== modeValues[mode]);
            if (changedModes.length > 0) {
                setModeAnimationKeys(current => {
                    const next = { ...current };
                    for (const m of changedModes) {
                        const nextKey = (renderedModeAnimationKeys[m] || 0) + 1;
                        renderedModeAnimationKeys[m] = nextKey;
                        next[m] = nextKey;
                    }
                    return next;
                });
            }
        }
        lastRenderedModeValues = modeValues;
    }, [modeValues]);

    const movementIndicators: MovementIndicatorItem[] = useMemo(() => [
        { id: 'swim', label: 'W', title: vitals.isSwimming ? 'Swimming — click to toggle' : 'Swim — click to toggle', active: vitals.isSwimming, command: 'swim' },
        { id: 'ride', label: 'R', title: vitals.isRiding ? 'Riding — click to lead' : 'Ride — click to ride', active: vitals.isRiding, command: (vitals.isRiding ? 'lead' : 'ride') },
        {
            id: 'climb',
            label: vitals.climb?.toLowerCase().includes('safe') ? 'c' : 'C',
            title: vitals.climb ? (vitals.climb.toLowerCase().includes('safe') ? 'Climbing safely — click to toggle' : 'Climbing — click to toggle') : 'Climb — click to toggle',
            active: Boolean(vitals.climb),
            command: 'climb'
        },
        { id: 'sneak', label: 'S', title: vitals.sneak ? 'Sneaking — click to toggle' : 'Sneak — click to toggle', active: Boolean(vitals.sneak), command: 'sneak' }
    ], [vitals.climb, vitals.isRiding, vitals.isSwimming, vitals.sneak]);

    const previousMovementStatesRef = useRef<Record<string, boolean> | null>(null);
    const [movementAnimations, setMovementAnimations] = useState<Record<string, { direction: 'up' | 'down'; key: number }>>({});
    const movementStates = useMemo(() => Object.fromEntries(
        movementIndicators.map(({ id, active }) => [id, active])
    ), [movementIndicators]);

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

    const stanceItems: StanceItem[] = useMemo(() => [
        {
            id: 'position',
            tag: `P${positionCode}`,
            code: `P${positionCode}`,
            text: formatShortName(position, POS_SHORT),
            title: `Position: ${position}`,
            isActive: activeSlider === 'position',
            animKey: modeAnimationKeys.position
        },
        {
            id: 'alert',
            tag: `A${alertCode}`,
            code: `A${alertCode}`,
            text: formatShortName(alertness || 'normal', ALERT_SHORT),
            title: `Alertness: ${alertness || 'normal'}`,
            isActive: activeSlider === 'alert',
            animKey: modeAnimationKeys.alertness
        },
        {
            id: 'speed',
            tag: `S${speedCode}`,
            code: `S${speedCode}`,
            text: formatShortName(spellSpeed || 'normal', SPEED_SHORT),
            title: `Spell speed: ${spellSpeed || 'normal'}`,
            isActive: activeSlider === 'speed',
            animKey: modeAnimationKeys.speed
        },
        {
            id: 'mood',
            tag: `M${moodCode}`,
            code: `M${moodCode}`,
            text: formatShortName(mood || 'normal', MOOD_SHORT),
            title: `Mood: ${mood || 'normal'}`,
            isActive: activeSlider === 'mood',
            animKey: modeAnimationKeys.mood
        }
    ], [activeSlider, alertCode, alertness, modeAnimationKeys, mood, moodCode, position, positionCode, speedCode, spellSpeed]);

    const [combatStatAnimations, setCombatStatAnimations] = useState<Record<string, { direction: 'up' | 'down'; key: number }>>({});
    const combatStatValues = useMemo(() => ({
        OB: vitals.ob, DB: vitals.db, PB: vitals.pb, ARM: vitals.armour,
        SA: equipmentSpellStats.spellAttack, SS: equipmentSpellStats.spellSave
    }), [equipmentSpellStats.spellAttack, equipmentSpellStats.spellSave, vitals.armour, vitals.db, vitals.ob, vitals.pb]);

    useEffect(() => {
        const previousValues = lastRenderedCombatStats;
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
        lastRenderedCombatStats = combatStatValues;
    }, [combatStatValues]);

    const combatStats: CombatStatItem[] = useMemo(() => [
        { label: 'OB', name: 'Offensive bonus', description: 'Improves your chance to hit and attack damage.', value: vitals.ob },
        { label: 'DB', name: 'Defensive bonus', description: 'Makes you harder for opponents to hit.', value: vitals.db },
        { label: 'PB', name: 'Parry bonus', description: 'Improves ability to parry incoming attacks.', value: vitals.pb },
        { label: 'ARM', name: 'Armour', description: 'Reduces damage taken from physical attacks.', value: vitals.armour },
        { label: 'SA', name: 'Spell attack', description: 'Known attack-spell modifier from equipped items.', value: equipmentSpellStats.spellAttack, equipmentOnly: true },
        { label: 'SS', name: 'Spell save', description: 'Known saving-spell modifier from equipped items.', value: equipmentSpellStats.spellSave, equipmentOnly: true }
    ].filter(stat => stat.value !== undefined && (!stat.equipmentOnly || stat.value !== 0)), [equipmentSpellStats.spellAttack, equipmentSpellStats.spellSave, vitals.armour, vitals.db, vitals.ob, vitals.pb]);

    return (
        <div className="prompt-controls-line">
            <span className="prompt-line-header">Stance</span>
            <span className="prompt-header-divider">│</span>
            <PromptMovementGroup
                indicators={movementIndicators}
                animations={movementAnimations}
                onMovementClick={handleMovementClick}
            />
            <span className="prompt-group-divider">│</span>
            <PromptStanceGroup
                items={stanceItems}
                onItemClick={openSlider}
            />
            <span className="prompt-group-divider">│</span>
            <PromptCombatStatsGroup
                stats={combatStats}
                animations={combatStatAnimations}
            />
            <PromptAffectedIndicators />
            <span className="prompt-target-end">
                <PromptTargetSelector />
            </span>

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
        </div>
    );
};

export default React.memo(PromptModeIndicators);
