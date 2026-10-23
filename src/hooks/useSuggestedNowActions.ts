/** @file useSuggestedNowActions.ts — Builds the desktop command panel's contextual command shortcuts. */

// --- Logic Section ---
import { useMemo } from 'react';
import type { CommandTargetSuggestion } from '../utils/commandSuggestionUtils';

export interface SuggestedNowSkill {
    name: string;
    syntax: string;
    pct: number | null;
    isKnown: boolean;
    isPassive?: boolean;
}

export interface SuggestedNowAction {
    id: string;
    label: string;
    command: string;
    description: string;
    target?: string | null;
    isDanger?: boolean;
    onActivate: () => void;
}

export interface SuggestedNowModel {
    situation: string;
    actions: SuggestedNowAction[];
}

interface UseSuggestedNowActionsArgs {
    inCombat: boolean;
    opponentName: string | null;
    isRiding: boolean;
    globalTarget: string | null;
    mounts: CommandTargetSuggestion[];
    skills: SuggestedNowSkill[];
    isSpellClass: boolean;
    onRunCommand: (command: string) => void;
    onAttack: (target: string | null) => void;
    onUseSkill: (name: string, isSpell: boolean) => void;
    onMountCommand: (verb: 'ride' | 'lead' | 'dismount', target: string | null) => void;
}

const OFFENSIVE_SKILL_ORDER = [
    'bash', 'kick', 'charge', 'backstab', 'attack', 'magic missile', 'chill touch',
    'burning hands', 'shocking grasp', 'lightning bolt', 'colour spray', 'fireball',
    'magic blast', 'poison', 'curse', 'energy drain', 'fear', 'harm', 'hold',
    'black breath', 'dispel evil'
];

export function useSuggestedNowActions({
    inCombat,
    opponentName,
    isRiding,
    globalTarget,
    mounts,
    skills,
    isSpellClass,
    onRunCommand,
    onAttack,
    onUseSkill,
    onMountCommand
}: UseSuggestedNowActionsArgs): SuggestedNowModel {
    return useMemo(() => {
        if (inCombat) {
            const actions: SuggestedNowAction[] = [
                {
                    id: 'flee', label: 'Flee', command: 'flee',
                    description: 'Try to escape combat.', isDanger: true,
                    onActivate: () => onRunCommand('flee')
                },
                {
                    id: 'attack', label: 'Attack', command: opponentName ? `kill ${opponentName}` : 'kill <choose target>',
                    description: opponentName ? 'Start attacking your engaged opponent.' : 'Choose an opponent before attacking.',
                    target: opponentName,
                    onActivate: () => onAttack(opponentName)
                }
            ];
            const knownOffensiveSkills = skills
                .filter(skill => skill.isKnown && !skill.isPassive && OFFENSIVE_SKILL_ORDER.includes(skill.name.toLowerCase()))
                .sort((left, right) => OFFENSIVE_SKILL_ORDER.indexOf(left.name.toLowerCase())
                    - OFFENSIVE_SKILL_ORDER.indexOf(right.name.toLowerCase()))
                .slice(0, 2);

            knownOffensiveSkills.forEach(skill => {
                const isSpell = isSpellClass;
                const target = opponentName || '<choose target>';
                actions.push({
                    id: `skill-${skill.name.toLowerCase().replace(/\s+/g, '-')}`,
                    label: skill.name,
                    command: skill.syntax.replace('<target>', target),
                    description: isSpell
                        ? `Cast ${skill.name} at your engaged opponent.`
                        : `Use your learned ${skill.name} skill on your engaged opponent.`,
                    target: opponentName,
                    onActivate: () => onUseSkill(skill.name, isSpell)
                });
            });

            return {
                situation: opponentName ? `Fighting ${opponentName}` : 'In combat · choose an opponent',
                actions
            };
        }

        const actions: SuggestedNowAction[] = [
            {
                id: 'look', label: 'Look', command: 'look',
                description: 'See the room and its exits.', onActivate: () => onRunCommand('look')
            },
            {
                id: 'score', label: 'Score', command: 'score',
                description: 'Check your character and condition.', onActivate: () => onRunCommand('score')
            },
            {
                id: 'inventory', label: 'Inventory', command: 'inventory',
                description: 'See what you are carrying.', onActivate: () => onRunCommand('inventory')
            }
        ];

        if (globalTarget) {
            actions.splice(1, 0, {
                id: 'examine-target', label: 'Examine', command: `examine ${globalTarget}`,
                description: 'Inspect your current global target.', target: globalTarget,
                onActivate: () => onRunCommand(`examine ${globalTarget}`)
            });
        }

        if (isRiding) {
            const mount = mounts.length === 1 ? mounts[0] : null;
            actions.unshift({
                id: 'dismount', label: 'Dismount', command: 'dismount mount',
                description: 'Get down from your mount.', target: 'mount',
                onActivate: () => onMountCommand('dismount', 'mount')
            }, {
                id: 'lead-mount', label: 'Lead', command: mount ? `lead ${mount.value}` : 'lead <choose mount>',
                description: mount ? 'Lead this mount beside you.' : 'Choose which mount to lead.', target: mount?.label || 'Choose a mount',
                onActivate: () => onMountCommand('lead', mount?.value || null)
            });
        } else if (mounts.length > 0) {
            const mount = mounts.length === 1 ? mounts[0] : null;
            actions.unshift({
                id: 'ride-mount', label: 'Ride', command: mount ? `ride ${mount.value}` : 'ride <choose mount>',
                description: mount ? 'Get on this mount.' : 'Choose which mount to ride.', target: mount?.label || 'Choose a mount',
                onActivate: () => onMountCommand('ride', mount?.value || null)
            }, {
                id: 'lead-mount', label: 'Lead', command: mount ? `lead ${mount.value}` : 'lead <choose mount>',
                description: mount ? 'Lead this mount beside you.' : 'Choose which mount to lead.', target: mount?.label || 'Choose a mount',
                onActivate: () => onMountCommand('lead', mount?.value || null)
            });
        }

        return {
            situation: isRiding ? 'Riding' : mounts.length > 0 ? 'A mount is nearby' : 'Exploring',
            actions
        };
    }, [inCombat, opponentName, isRiding, globalTarget, mounts, skills, isSpellClass, onRunCommand, onAttack, onUseSkill, onMountCommand]);
}
