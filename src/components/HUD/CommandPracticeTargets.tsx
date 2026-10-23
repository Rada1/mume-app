/** @file CommandPracticeTargets.tsx — Known skills and guild training in the selection column. */
import React from 'react';
import { ChevronRight, GraduationCap } from 'lucide-react';
import type { CommandPracticeProps } from '../../types';
import './CommandPractice.css';
import {useCommandPracticeGroups} from '../../hooks/useCommandPracticeGroups';

// --- Render Section ---
interface CommandPracticeTargetsProps {
    practice: CommandPracticeProps['practice'];
    embedded?: boolean;
}

export const CommandPracticeTargets: React.FC<CommandPracticeTargetsProps> = ({ practice, embedded = false }) => {
    const {openGroups,setGroupOpen}=useCommandPracticeGroups();
    const contents = <>
        <div className="command-practice-tools">
            <span>{!practice.guild.hasGuildmaster ? 'Known skills and spells · Visit a guildmaster to train'
                : practice.guild.available ? `${practice.guild.sessionsLeft} practice sessions left` : 'Checking guild training…'}</span>
        </div>
        {practice.guild.hasGuildmaster && <input type="search" value={practice.search} onChange={event => practice.setSearch(event.target.value)}
            placeholder="Find skills and spells…" aria-label="Search skills and spells" />}
        {practice.groups.map(group => {
            const skills = group.skills.map(skill => <button key={skill.name} type="button" className="command-action-target-option"
                aria-current={practice.selected?.name === skill.name ? 'true' : undefined} onClick={() => practice.selectSkill(skill)}>
                <span>{skill.name}</span><small>{skill.sessions && `${skill.sessions} · `}{skill.knowledge}</small>
            </button>);
            if (!practice.guild.hasGuildmaster) return <section key={group.label}
                className="command-action-target-subgroup command-practice-expanded-group" aria-label={group.label}>
                <div className="command-practice-group-heading"><span>{group.label}</span><small>{group.skills.length}</small></div>
                {skills}
            </section>;
            const expanded = Boolean(openGroups[group.label]);
            return <details key={group.label} open={expanded}
            onMouseEnter={() => setGroupOpen(group.label,true)}
            onMouseLeave={() => setGroupOpen(group.label,false)}
            onToggle={event => setGroupOpen(group.label,event.currentTarget.open)}
            className="command-action-target-subgroup" aria-label={group.label}>
            <summary><ChevronRight className="command-action-target-chevron" size={11} aria-hidden="true" /><span>{group.label}</span><small>{group.skills.length}</small></summary>
            {skills}
        </details>;
        })}
        {!practice.groups.length && <p className="command-action-target-empty">{!practice.guild.hasGuildmaster ? 'No known skills returned.' : practice.guild.available
            ? 'No matching training offered by this guildmaster.' : 'Waiting for this guildmaster’s practice listing.'}</p>}
    </>;
    if (embedded) return <div className="command-action-target-group command-practice-targets" aria-label="Practice Skills and Spells">
        {contents}
    </div>;
    return <details className="command-action-target-group command-practice-targets" open={practice.open}
        onMouseEnter={() => practice.setOpen(true)} onMouseLeave={() => practice.setOpen(false)}
        onToggle={event => practice.setOpen(event.currentTarget.open)} aria-label="Practice Skills and Spells">
        <summary><ChevronRight className="command-action-target-chevron" size={12} aria-hidden="true" />
            <GraduationCap size={12} aria-hidden="true" /><span>Practice Skills and Spells</span><small>{practice.skills.length}</small></summary>
        {contents}
    </details>;
};
