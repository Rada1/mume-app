/**
 * @file useUnifiedCommandActions.ts
 * @description Resolves actions available for the active command panel context.
 */

import { useMemo } from 'react';
import type { CommunicationCommandChoice, CustomButton, GmcpOccupant, GroupMember, PopoverState } from '../types';
import { useGame, useVitals } from '../context/GameContext';
import { getResolvedTraitSections, getButtonIdsForTraits, getTraitConfig } from '../utils/inlineActionModel';
import { getInlineCategoryAxes, normalizeInlineCategoryId } from '../utils/inlineCategoryAxes';
import { getEligibleActionButtonIds, isButtonValidForEntity } from '../utils/actionUtils';
import { createLearnedInlineAbilityButtons } from '../utils/inlineAbilityActions';
import { SOCIAL_BUTTONS } from '../constants/buttons/socials';
import { DOOR_BUTTONS, EXIT_BUTTONS } from '../constants/buttons/doors';
import { WEATHER_BUTTONS } from '../constants/buttons/weather';
import { SELF_STATE_BUTTONS } from '../constants/buttons/state';
import { NPC_BUTTONS } from '../constants/buttons/inline/npcs';
import { createButton } from '../utils/buttonFactory';
import { isSelfOnlySpellCommand } from '../utils/commandTargetUtils';
import { isGroupMemberTarget } from '../utils/groupTargetSuggestions';
import { stripAnsiCodes } from '../utils/ansi';
import { useHostileCommandTarget } from './useHostileCommandTarget';
import { usePanelDataStore } from '../stores/usePanelDataStore';

// --- Type Section ---
export type UnifiedCommandActionScope = 'selected' | 'room' | 'self';
const HOSTILE_TRAITS = new Set([
    'trait-examine', 'trait-consider', 'trait-combat', 'trait-offense', 'trait-retreat',
    'trait-mage', 'trait-warrior', 'trait-ranger', 'trait-thief', 'trait-cleric',
    'trait-social', 'trait-communication'
]);
const FRIENDLY_TRAITS = new Set(['trait-buffs', 'trait-healing', 'trait-support']);
const DIRECTED_COMMUNICATION_COMMANDS = new Set(['tell', 'whisper', 'ask']);
const DISENGAGE_COMMAND_COLOR = 'var(--ansi-bright-cyan, #38bdf8)';
const MOUNT_COMMANDS_HIDDEN_WHILE_RIDING = new Set(['ride', 'saddle', 'unsaddle', 'abandon']);
const MOUNT_COMMANDS_HIDDEN_WHILE_NOT_RIDING = new Set(['dismount']);

// --- Logic Section ---
const isInformationButton = (button: CustomButton): boolean => {
    const verb = (button.command || button.label || '').trim().toLowerCase().split(/\s+/)[0];
    return ['look', 'examine', 'consider', 'con', 'whois', 'compare', 'scan', 'search', 'read', 'listen', 'smell', 'identify'].includes(verb);
};

const normalizeGroupTarget = (value: string | null | undefined): string =>
    stripAnsiCodes(value || '').trim().toLowerCase().replace(/^(?:a|an|the)\s+/, '').replace(/\s+/g, ' ');

const isGroupMemberSelection = (activeState: PopoverState, groupMembers: GroupMember[], roomCharacters: Array<string | GmcpOccupant>, characterName: string): boolean => {
    const entityId = activeState.entityId || '';
    if (entityId.startsWith('command-group-member:')) return true;
    const roomId = entityId.replace(/^roomchars:/, '');
    if (roomId && groupMembers.some(member => String(member.id) === roomId)) return true;

    const targetNames = [activeState.context, activeState.keyword, activeState.displayName]
        .map(normalizeGroupTarget).filter(Boolean);
    const namedMember = groupMembers.some(member => [member.name, member.label]
        .map(value => normalizeGroupTarget(value)).some(name => name && targetNames.includes(name)));
    if (namedMember) return true;

    const characters: GmcpOccupant[] = roomCharacters.map(character => typeof character === 'string' ? { name: character } : character);
    return targetNames.some(target => isGroupMemberTarget(target, characters, groupMembers, characterName));
};

export const useUnifiedCommandActions = (
    activeState: PopoverState,
    scope: UnifiedCommandActionScope,
    targetContext: string | null,
    communicationCommands: CommunicationCommandChoice[] = [],
    chatCommunicationCommands: CommunicationCommandChoice[] = communicationCommands,
    includeActionGroups = true
) => {
    const game = useGame();
    const skillsReady = usePanelDataStore(state => state.status.skills === 'ready');
    const vitals = useVitals();
    const groupMembers = vitals.groupMembers || [];
    const isSelectedGroupMember = useMemo(
        () => isGroupMemberSelection(activeState, groupMembers, [...(game.roomPlayers || []), ...(game.roomNpcs || [])], game.characterName || ''),
        [activeState.context, activeState.displayName, activeState.entityId, activeState.keyword, game.characterName, game.roomNpcs, game.roomPlayers, groupMembers]
    );
    const isHostile = useHostileCommandTarget(activeState);
    const categoryId = isHostile ? 'cat-enemy' : normalizeInlineCategoryId(activeState.category || activeState.setId);
    const selectedRoomId = activeState.entityId?.match(/^roomchars:([^#]+)/)?.[1];
    const selectedNames = [activeState.context, activeState.keyword, activeState.displayName].map(normalizeGroupTarget).filter(Boolean);
    const isNonGroupNpc = scope === 'selected' && !isSelectedGroupMember && (
        categoryId === 'cat-npc' || categoryId === 'cat-mount' || (game.roomNpcs || []).some(npc => {
            if (typeof npc === 'string') return selectedNames.includes(normalizeGroupTarget(npc));
            if (selectedRoomId && npc.id != null) return selectedRoomId === String(npc.id);
            return [npc.name, npc.short, npc.keyword].some(name => {
                const normalized = normalizeGroupTarget(name);
                return normalized && selectedNames.includes(normalized);
            });
        })
    );
    const learnedAbilities = useMemo(
        () => skillsReady ? createLearnedInlineAbilityButtons(game.abilities || {}, game.practice?.practiceData || null) : [],
        [game.abilities, game.practice?.practiceData, skillsReady]
    );
    const isSelfCommandContext = activeState.entityId === 'command-panel-self';
    const communicationChannelButtons = useMemo(() => chatCommunicationCommands.map(choice => {
        const command = choice.command === 'group' ? 'tell group' : choice.command;
        return createButton({
            id: `command-communication-${choice.command}`,
            label: choice.target ? `${choice.label} %n` : choice.label,
            command: choice.target ? `${command} %n` : command,
            setId: 'trait-communication',
            color: '#06b6d4',
            shape: 'rect',
            width: 140,
            height: 32
        });
    }), [chatCommunicationCommands]);
    const communicationButtons = useMemo(() => communicationChannelButtons
        .filter(button => {
            const command = button.id.replace('command-communication-', '');
            return isSelfCommandContext
                ? !DIRECTED_COMMUNICATION_COMMANDS.has(command)
                : DIRECTED_COMMUNICATION_COMMANDS.has(command) && Boolean(button.command.includes('%n'));
        }), [communicationChannelButtons, isSelfCommandContext]);
    const communicationActionGroup = useMemo(() => ({
        section: { key: 'trait-communication', label: 'Communication' },
        buttons: communicationChannelButtons,
        inspectionCommands: []
    }), [communicationChannelButtons]);
    const menuButtons = useMemo(() => {
        const byId = new Map(game.btn.buttons.map(button => [button.id, button]));
        [
            ...SOCIAL_BUTTONS.filter(button => button.command.includes('%n')),
            ...DOOR_BUTTONS,
            ...EXIT_BUTTONS,
            ...WEATHER_BUTTONS,
            ...SELF_STATE_BUTTONS,
            ...NPC_BUTTONS.filter(button => ['inline-mounts','trait-mount-object','trait-saddle'].includes(button.setId)),
            ...learnedAbilities,
            ...communicationButtons,
            createButton({ id: 'btn-disengage', label: 'Disengage', command: 'disengage', setId: 'trait-retreat', color: DISENGAGE_COMMAND_COLOR, shape: 'rect', width: 140, height: 32 }),
            createButton({ id: 'btn-flee', label: 'Flee', command: 'flee', setId: 'trait-retreat', color: '#ef4444', shape: 'rect', width: 140, height: 32 }),
            createButton({ id: 'btn-ungroup', label: 'Ungroup', command: 'group %n', setId: 'inline-ally', color: '#f59e0b', shape: 'rect', width: 140, height: 32 }),
            createButton({ id: 'btn-assist', label: 'Assist', command: 'assist %n', setId: 'inline-ally', color: '#22c55e', shape: 'rect', width: 140, height: 32 })
        ].forEach(button => {
            if (!byId.has(button.id)) byId.set(button.id, button);
        });
        const savedDisengageButton = byId.get('btn-disengage');
        if (savedDisengageButton && savedDisengageButton.color !== DISENGAGE_COMMAND_COLOR) {
            byId.set('btn-disengage', { ...savedDisengageButton, color: DISENGAGE_COMMAND_COLOR });
        }
        const savedUngroupButton = byId.get('btn-ungroup');
        if (savedUngroupButton && savedUngroupButton.command !== 'group %n') {
            byId.set('btn-ungroup', { ...savedUngroupButton, command: 'group %n' });
        }
        [
            { id: 'command-personal-info', label: 'Info', command: 'info' },
            { id: 'command-personal-stat', label: 'Stat', command: 'stat' },
            { id: 'command-personal-score', label: 'Score', command: 'score' }
        ].forEach(button => {
            if (!byId.has(button.id)) byId.set(button.id, createButton({
                ...button,
                setId: 'trait-personal-information',
                color: '#c9a84c',
                shape: 'rect',
                width: 140,
                height: 32
            }));
        });
        return [...byId.values()];
    }, [communicationButtons, game.btn.buttons, learnedAbilities]);

    const sections = useMemo(() => {
        if (!includeActionGroups) return [];
        const resolved = getResolvedTraitSections(categoryId, targetContext, game.inlineCategories || [])
            .filter(section => categoryId !== 'cat-exit' || activeState.hasDoor !== false || section.trait.id !== 'trait-door-actions');
        if (isSelectedGroupMember) {
            const withGroupActions = [...resolved];
            const addActionToSection = (traitId: string, buttonId: string) => {
                const existingIndex = withGroupActions.findIndex(section => section.trait.id === traitId);
                if (existingIndex >= 0) {
                    const section = withGroupActions[existingIndex];
                    withGroupActions[existingIndex] = {
                        ...section,
                        buttonIds: section.buttonIds.includes(buttonId) ? section.buttonIds : [...section.buttonIds, buttonId]
                    };
                    return;
                }
                const trait = getTraitConfig(traitId);
                if (trait) withGroupActions.push({ trait, buttonIds: [buttonId] });
            };
            addActionToSection('trait-combat', 'btn-assist');
            addActionToSection('trait-group', 'btn-ungroup');
            return withGroupActions;
        }
        if (activeState.entityId !== 'command-panel-self') return resolved;
        const personalInformation = getTraitConfig('trait-personal-information');
        const stateTrait = game.isSpectateMode ? null : getTraitConfig('trait-state');
        const inspectionSections = resolved.filter(section => section.trait.id === 'trait-examine' || section.trait.id === 'trait-consider');
        const otherSections = resolved.filter(section => section.trait.id !== 'trait-examine' && section.trait.id !== 'trait-consider');
        return [
            ...inspectionSections,
            ...(personalInformation ? [{ trait: personalInformation, buttonIds: personalInformation.buttonIds }] : []),
            ...(stateTrait ? [{ trait: stateTrait, buttonIds: stateTrait.buttonIds }] : []),
            ...otherSections
        ];
    }, [activeState.entityId, categoryId, game.inlineCategories, game.isSpectateMode, includeActionGroups, isSelectedGroupMember, targetContext]);
    const traitButtonIds = useMemo(
        () => new Set(getButtonIdsForTraits(sections.map(section => section.trait))),
        [sections]
    );
    const actionGroups = useMemo(() => {
        if (!includeActionGroups) return [];
        const mountButtonIds = new Set(sections
            .filter(section => section.trait.id === 'trait-mount')
            .flatMap(section => section.buttonIds));
        const isRiding = game.isRiding || ['riding', 'mounted'].includes((game.playerPosition || '').toLowerCase());
        const filterDeps = {
            buttons: menuButtons,
            inlineCategories: game.inlineCategories || [],
            roomNpcs: game.roomNpcs || [],
            entities: game.entities,
            characterInfo: vitals.characterInfo,
            currentTerrain: game.currentTerrain
        };
        const traitButtons = getEligibleActionButtonIds(categoryId,
            game.entities[activeState.entityId || '']?.name || targetContext || null, filterDeps);
        const seen = new Set<string>();
        const actions = menuButtons.filter(button => {
            if (button.id === 'btn-follow' || button.id === 'btn-unfollow' || /^follow(?:\s|$)/i.test(button.command.trim())) return false;
            if (!skillsReady && (button.requirement?.ability || /^(?:mage|cleric|warrior|ranger|thief)(?:spell|skill)list$/i.test(button.setId)
                || /^cast\s/i.test(button.command))) return false;
            const commandVerb = button.command.trim().toLowerCase().split(/\s+/)[0];
            if (isRiding && mountButtonIds.has(button.id) && MOUNT_COMMANDS_HIDDEN_WHILE_RIDING.has(commandVerb)) return false;
            if (!isRiding && mountButtonIds.has(button.id) && MOUNT_COMMANDS_HIDDEN_WHILE_NOT_RIDING.has(commandVerb)) return false;
            if (categoryId === 'cat-ally-remote' && button.id === 'btn-converse') return false;
            const isGroupOnlyAction = ['btn-assist', 'btn-ungroup'].includes(button.id);
            if (button.id === 'btn-group' && (isSelectedGroupMember || activeState.entityId === 'command-panel-self')) return false;
            if (isGroupOnlyAction && !isSelectedGroupMember) return false;
            if (seen.has(button.command) || (!traitButtonIds.has(button.id) && !isGroupOnlyAction)) return false;
            const isPersonalInformationButton = button.id.startsWith('command-personal-');
            const isSelfStateButton = button.setId === 'trait-state';
            if (isPersonalInformationButton && activeState.entityId !== 'command-panel-self') return false;
            if (isSelfStateButton && (activeState.entityId !== 'command-panel-self' || game.isSpectateMode)) return false;
            if (isSelfOnlySpellCommand(button.command) && activeState.entityId !== 'command-panel-self') return false;
            if (!isPersonalInformationButton && !isSelfStateButton && !isGroupOnlyAction
                && !isButtonValidForEntity(button, activeState.entityId || '', categoryId, filterDeps, activeState.setId, targetContext || undefined, traitButtons)) return false;
            seen.add(button.command);
            return true;
        }).filter(button => !isInformationButton(button) || /^(?:whois|examine|info|stat|score)(?:\s|$)/i.test(button.command));
        const targetAxes = getInlineCategoryAxes(categoryId);
        const canObserve = sections.some(candidate => candidate.trait.id === 'trait-observable');
        const groups = sections.map(section => {
            const buttons = actions.filter(button => section.buttonIds.includes(button.id));
            const inspectionCommands: Array<'look' | 'consider'> = [];
            if (canObserve && targetContext && section.trait.id === 'trait-examine' && scope !== 'room') inspectionCommands.push('look');
            if (canObserve && targetContext && section.trait.id === 'trait-consider' && scope === 'selected' && (targetAxes.isCharacter || targetAxes.isObject)) inspectionCommands.push('consider');
            return { section: { key: section.trait.id, label: section.trait.label }, buttons, inspectionCommands };
        }).filter(group => group.buttons.length > 0 || group.inspectionCommands.length > 0);

        if (scope === 'room') {
            const generalInformation = [
                { id: 'btn-who', label: 'Who', command: 'who' },
                { id: 'btn-where', label: 'Where', command: 'where' }
            ].map(fallback => menuButtons.find(button => button.id === fallback.id) || createButton({
                ...fallback, setId: 'info', color: '#c9a84c', shape: 'rect', width: 140, height: 32
            }));
            const roomInfo = createButton({ id: 'command-panel-room-look', label: 'Look', command: 'look', setId: 'cat-room', color: '#c9a84c', shape: 'rect', width: 140, height: 32 });
            const roomExamine = { ...roomInfo, id: 'command-panel-room-examine', label: 'Examine', command: 'examine' };
            const exits = createButton({ id: 'command-panel-room-exits', label: 'Exits', command: 'exits', setId: 'cat-room', color: '#c9a84c', shape: 'rect', width: 140, height: 32 });
            const map = createButton({ id: 'command-panel-room-map', label: 'Map', command: 'map', setId: 'cat-room', color: '#c9a84c', shape: 'rect', width: 140, height: 32 });
            groups.unshift({ section: { key: 'trait-general-information', label: 'General' }, buttons: generalInformation, inspectionCommands: [] });
            groups.unshift({ section: { key: 'trait-examine', label: 'Room' }, buttons: [roomInfo, roomExamine, exits, map], inspectionCommands: [] });
        }
        const targetGroups = isSelectedGroupMember
            ? groups.filter(group => group.section.key !== 'trait-offense')
            : groups;
        if (isHostile) return targetGroups.filter(group => HOSTILE_TRAITS.has(group.section.key));
        return isNonGroupNpc ? targetGroups.filter(group => !FRIENDLY_TRAITS.has(group.section.key)) : targetGroups;
    }, [activeState.entityId, activeState.setId, categoryId, game.currentTerrain, game.entities, game.inlineCategories, game.roomNpcs, game.isRiding, game.isSpectateMode, game.playerPosition, includeActionGroups, isHostile, isNonGroupNpc, isSelectedGroupMember, menuButtons, scope, sections, skillsReady, targetContext, traitButtonIds, vitals.characterInfo]);

    return { menuButtons, actionGroups, communicationActionGroup };
};
