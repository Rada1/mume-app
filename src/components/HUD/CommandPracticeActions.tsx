/** @file CommandPracticeActions.tsx — Skill details and guild training in the command column. */
import React from 'react';
import type { CommandPracticeActionsProps } from '../../types';
import { useCommandPracticeActions } from '../../hooks/useCommandPracticeActions';
import { InlineTraitActionGroup } from '../Popovers/StandardMenu/InlineTraitActionGroup';
import { getInlineTraitTextColor, getSwipeCommandTextColor } from '../../utils/swipeCommandColors';
import './CommandPractice.css';

// --- Render Section ---
export const CommandPracticeActions: React.FC<CommandPracticeActionsProps> = ({ practice, onRequestHelp, isHelpMode = false }) => {
    const actions = useCommandPracticeActions({ practice, onRequestHelp });
    if (!practice.selected) return null;
    return <section className="command-practice-actions" aria-label="Skill and spell commands">
        <h3>{practice.selected.name}</h3>
        <dl className="command-practice-details">
            <dt>Class</dt><dd>{practice.selected.skillClass || 'Other'}</dd>
            <dt>Knowledge</dt><dd>{practice.selected.knowledge}</dd>
            {practice.selected.sessions && <><dt>Sessions taken / limit</dt><dd>{practice.selected.sessions}</dd></>}
            {practice.selected.difficulty && <><dt>Difficulty</dt><dd>{practice.selected.difficulty}</dd></>}
            {practice.selected.mana && <><dt>Mana</dt><dd>{practice.selected.mana}</dd></>}
            {practice.selected.castingTime && <><dt>Casting time</dt><dd>{practice.selected.castingTime}</dd></>}
            {practice.training?.skill.advice && <><dt>Guildmaster advice</dt><dd>{practice.training.skill.advice}</dd></>}
        </dl>
        <div className="inline-action-groups">
            <InlineTraitActionGroup section={{ key: 'trait-guildmaster', label: 'Practice' }}
                buttons={actions.map(action => action.button)} inspectionCommands={[]} targetContext={null}
                requestInspection={() => {}} renderButton={button => {
                    const action = actions.find(entry => entry.button.id === button.id)!;
                    const handleClick = (e: React.MouseEvent) => {
                        if (isHelpMode && practice.selected) {
                            e.stopPropagation();
                            onRequestHelp(practice.selected.name);
                            return;
                        }
                        action.run();
                    };
                    return <button key={button.id} type="button" data-menu-item="true" className={`terminal-inspect-row${isHelpMode ? ' is-help-mode' : ''}`}
                        disabled={action.disabled} title={action.title} aria-label={`${button.label} <${button.command}>`}
                        onPointerDown={event => event.stopPropagation()} onClick={handleClick}>
                        <span style={{ color: getSwipeCommandTextColor(button.command) || getInlineTraitTextColor('trait-guildmaster') }}>{button.label}</span>
                        <span>&lt;{button.command}&gt;</span>
                    </button>;
                }} />
        </div>
        <p>{practice.training ? `${practice.guild.sessionsLeft} practice sessions left. Training spends one session.`
            : practice.guild.hasGuildmaster ? 'This ability is not currently offered by this guildmaster.'
                : 'Visit a guildmaster to practice this ability.'}</p>
    </section>;
};
