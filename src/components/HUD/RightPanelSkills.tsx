/**
 * @file RightPanelSkills.tsx
 * @description Class skills with guildmaster training actions in the command panel.
 */

import React from 'react';
import type { CommandTargetSuggestion } from '../../utils/commandSuggestionUtils';
import type { PracticeClassKey } from '../../utils/practiceClassCatalog';
import { TARGETED_SKILLS } from '../../utils/practiceClassCatalog';
import { SkillTile, SkillTileItem } from './SkillTile';
import { CLASS_KEYS } from './rightActionData';

type Training = { enabled: boolean; reason: string } | null;
type RightPanelSkillsProps = {
    items: SkillTileItem[];
    selectedClass: PracticeClassKey;
    onSelectClass: (key: PracticeClassKey) => void;
    isSpellClass: boolean;
    pressedLabel: string | null;
    guildAvailable: boolean;
    sessionsLeft: number;
    trainingFor: (name: string) => Training;
    onPractice: (name: string) => void;
    onFire: (name: string, isSpell: boolean) => void;
    targetFor: (name: string) => string | null;
    choicesFor: (name: string) => CommandTargetSuggestion[];
    onChooseTarget: (name: string, value: string) => void;
    onTypeTarget: (name: string) => void;
};

// --- Render Section ---
export const RightPanelSkills: React.FC<RightPanelSkillsProps> = props => (
    <>
        <div className="right-panel-class-chips">
            {CLASS_KEYS.map(key => <button key={key} type="button"
                className={`right-panel-class-chip${props.selectedClass === key ? ' is-active' : ''}`}
                onClick={() => props.onSelectClass(key)}>{key}</button>)}
        </div>
        {props.guildAvailable && <div className="right-panel-guild-note" role="status">
            <strong>● Guildmaster available</strong><span>{props.sessionsLeft} session{props.sessionsLeft === 1 ? '' : 's'} left</span>
        </div>}
        <div className="right-panel-grid" aria-label={`${props.selectedClass} skills`}>
            {props.items.map(item => {
                const targeted = TARGETED_SKILLS.has(item.name.toLowerCase());
                const training = props.trainingFor(item.name);
                return <SkillTile key={item.name} item={item} isSpellClass={props.isSpellClass}
                    isPressed={props.pressedLabel === item.name}
                    onClick={() => props.onFire(item.name, props.isSpellClass)}
                    target={targeted ? props.targetFor(item.name) : null}
                    targetChoices={targeted ? props.choicesFor(item.name) : []}
                    onChooseTarget={value => props.onChooseTarget(item.name, value)}
                    onTypeTarget={() => props.onTypeTarget(item.name)}
                    practice={training ? { enabled: training.enabled, label: training.reason,
                        onClick: () => props.onPractice(item.name) } : undefined} />;
            })}
        </div>
    </>
);
