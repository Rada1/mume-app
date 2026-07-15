/**
 * @file PromptModeIndicators.tsx
 * @description Interactive MUME prompt indicators backed by the shared slider popouts.
 */

// --- Logic Section ---
import React, { useCallback, useMemo, useState } from 'react';
import { useGame, useUI } from '../../context/GameContext';
import { useActiveVitals } from '../../stores/useActiveGameState';
import { CombatSliderPopout } from '../Combat/CombatSliderPopout';
import { DispositionSliderPopout, DispositionSliderConfig } from '../HUD/DispositionSliderPopout';

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
        isSpectateMode
    } = useGame();
    const { handleTabClick } = useUI();
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
            executeCommand(`cha speed ${value}`);
        } else {
            setAlertness(value);
            executeCommand(`cha alert ${value}`);
        }
        triggerHaptic(15);
        setActiveSlider(null);
    }, [executeCommand, setAlertness, setMood, setSpellSpeed, triggerHaptic]);

    const handlePositionSelect = useCallback((value: string, index: number) => {
        const currentPosition = vitals.position.toLowerCase();
        if (currentPosition === 'sleeping' && index > 0) executeCommand('wake');
        setPlayerPosition(value);
        executeCommand(value === 'sleeping' ? 'sleep' : value === 'resting' ? 'rest' : value === 'sitting' ? 'sit' : 'stand');
        triggerHaptic(15);
        setActiveSlider(null);
    }, [executeCommand, setPlayerPosition, triggerHaptic, vitals.position]);

    const handleMovementClick = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
        event.stopPropagation();
        handleTabClick('status');
        triggerHaptic(10);
    }, [handleTabClick, triggerHaptic]);

    const position = vitals.position.toLowerCase();
    const moodCode = getOptionCode(mood || 'normal', MOOD_OPTIONS);
    const speedCode = getOptionCode(spellSpeed || 'normal', SPEED_OPTIONS);
    const alertCode = getOptionCode(alertness || 'normal', ALERT_OPTIONS);
    const positionCode = POSITION_CODES[position] || POSITION_CODES.standing;
    const movementIndicators = [
        vitals.isRiding ? { label: 'R', title: 'Riding' } : null,
        vitals.isRidden ? { label: 'r', title: 'Being ridden' } : null,
        vitals.isSwimming ? { label: 'W', title: 'Trying to swim' } : null,
        vitals.sneak ? { label: 'S', title: 'Trying to sneak' } : null,
        vitals.climb ? {
            label: vitals.climb.toLowerCase().includes('safe') ? 'c' : 'C',
            title: vitals.climb.toLowerCase().includes('safe') ? 'Climbing safely' : 'Climbing no-matter-what'
        } : null,
        vitals.isHidden ? { label: 'H', title: 'Hiding' } : null
    ].filter((indicator): indicator is { label: string; title: string } => indicator !== null);
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
                    {movementIndicators.map((indicator, index) => (
                        <React.Fragment key={indicator.label}>
                            {index > 0 && <span className="prompt-stat-divider">|</span>}
                            <PromptIndicatorButton
                                label={indicator.label}
                                title={indicator.title}
                                className="prompt-movement-indicator"
                                onClick={handleMovementClick}
                            />
                        </React.Fragment>
                    ))}
                </span>
            )}
            {movementIndicators.length > 0 && <span className="prompt-stat-divider">|</span>}
            <span className="prompt-mode-indicators" aria-label="Character settings">
                <PromptIndicatorButton
                    label={`P${positionCode}`}
                    title={`Position: ${position}`}
                    active={activeSlider === 'position'}
                    onClick={event => openSlider('position', event)}
                />
                <span className="prompt-stat-divider">|</span>
                <PromptIndicatorButton
                    label={`A${alertCode}`}
                    title={`Alertness: ${alertness || 'normal'}`}
                    onClick={event => openSlider('alert', event)}
                />
                <span className="prompt-stat-divider">|</span>
                <PromptIndicatorButton
                    label={`S${speedCode}`}
                    title={`Spell speed: ${spellSpeed || 'normal'}`}
                    onClick={event => openSlider('speed', event)}
                />
                <span className="prompt-stat-divider">|</span>
                <PromptIndicatorButton
                    label={`M${moodCode}`}
                    title={`Mood: ${mood || 'normal'}`}
                    onClick={event => openSlider('mood', event)}
                />
            </span>
            {combatStats.length > 0 && <span className="prompt-stat-divider">|</span>}
            {combatStats.length > 0 && (
                <span className="prompt-combat-stat-indicators" aria-label="Combat statistics">
                    {combatStats.map((stat, index) => (
                        <React.Fragment key={stat.label}>
                            {index > 0 && <span className="prompt-stat-divider">|</span>}
                            <span title={`${stat.name}: ${stat.description}`}>
                                {stat.label}{stat.value}%
                            </span>
                        </React.Fragment>
                    ))}
                </span>
            )}
            <span className="custom-prompt-prefix">]</span>
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
