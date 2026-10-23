/** @file useCommandPractice.ts — Browses known abilities and the current guildmaster's training catalog in the command workspace. */
import { useEffect, useMemo, useState } from 'react';
import type { CustomButton, PopoverState, PracticeSkill } from '../types';
import { EntityCapability } from '../types';
import { useGame, useUI } from '../context/GameContext';
import { useActiveRoom } from '../stores/useActiveGameState';
import { useCommandPracticeStore } from '../stores/useCommandPracticeStore';
import { usePanelData } from './usePanelData';
import { useGuildPracticeActions } from './useGuildPracticeActions';
import { getPracticeClassLabel } from '../utils/practiceClassCatalog';
import { getResolvedTraitSections } from '../utils/inlineActionModel';

// --- Selection and Training Logic ---
export const useCommandPractice = (activeState: PopoverState, visible: boolean, activate: () => void) => {
    const game = useGame();
    const ui = useUI();
    const room = useActiveRoom();
    const report = useCommandPracticeStore();
    const data = game.practice?.practiceData;
    const panelData = usePanelData();
    const hasTrainingTrait = getResolvedTraitSections(activeState.category || activeState.setId, activeState.context, game.inlineCategories || [])
        .some(section => section.buttonIds.includes('btn-guildmaster-practice'));
    const detectedGuildmaster = hasTrainingTrait || (game.roomNpcs || []).some(npc => {
        const entity = game.entities?.[`roomchars:${npc.id}`] || game.entities?.[String(npc.id)];
        return entity?.capabilities.includes(EntityCapability.Guildmaster)
            || getResolvedTraitSections('cat-npc', npc.name, game.inlineCategories || [])
                .some(section => section.buttonIds.includes('btn-guildmaster-practice'));
    });
    const [open, setOpen] = useState(false);
    const guild = useGuildPracticeActions(game.gameState === 'playing', room.roomNum, game.roomNpcs || [], data,
        game.executeCommand, detectedGuildmaster, open);
    const [search, setSearch] = useState('');
    const [outputOpen, setOutputOpen] = useState(false);
    const roomKey = `${room.mapId ?? room.roomNum}:${room.roomName}`;
    useEffect(() => {
        setOutputOpen(false); setSearch('');
        if (activeState.entityId?.startsWith('command-ability:')) ui.setPopoverState({
            x: 0, y: 0, type: 'menu', entityId: 'command-panel-room', category: 'cat-room', setId: 'cat-room',
            isRoomDescription: true, context: room.roomName, displayName: room.roomName || 'Room'
        });
    }, [roomKey]);
    useEffect(() => {
        if (open && !guild.hasGuildmaster) panelData.request('skills', true);
    }, [open, guild.hasGuildmaster, roomKey, panelData.request]);
    const skills = useMemo(() => ((guild.hasGuildmaster ? guild.available : !data?.isAtGuildmaster) ? [...(data?.skills || [])] : [])
        .sort((a, b) => a.name.localeCompare(b.name)), [data, guild.available, guild.hasGuildmaster]);
    const isAbilitySelected = Boolean(activeState.entityId?.startsWith('command-ability:'));
    const selected = isAbilitySelected
        ? skills.find(skill => skill.name.toLowerCase() === activeState.context?.toLowerCase()) || null : null;
    const groups = useMemo(() => {
        const query = search.trim().toLowerCase();
        const classes = ['Ranger', 'Thief', 'Warrior', 'Mage', 'Cleric', 'Other'];
        return classes.map(label => ({
            label, skills: skills.filter(skill => {
                const skillClass = getPracticeClassLabel(skill.name) || skill.skillClass || 'Other';
                const group = classes.find(value => value.toLowerCase() === skillClass.toLowerCase()) || 'Other';
                return group === label && (!query || skill.name.toLowerCase().includes(query));
            })
        })).filter(group => group.skills.length);
    }, [skills, search]);
    const training = selected ? guild.trainingFor(selected.name) : null;
    const outputVisible = visible && outputOpen && Boolean(selected || report.skillName);
    useEffect(() => {
        document.body.classList.toggle('has-unified-command-practice', outputVisible);
        return () => document.body.classList.remove('has-unified-command-practice');
    }, [outputVisible]);
    const browse = () => {
        activate(); setOpen(true);
        if (open && panelData.enabled && !report.pendingCommand) {
            panelData.request('skills', true);
        }
    };
    const selectSkill = (skill: PracticeSkill) => {
        if (!skills.some(known => known.name === skill.name)) return;
        activate(); game.clearObjectSelection();
        ui.setPopoverState({ x: 0, y: 0, type: 'menu', category: 'command-ability', setId: 'command-ability',
            entityId: `command-ability:${skill.name.toLowerCase()}`, context: skill.name, displayName: skill.name });
    };
    const train = () => {
        if (!guild.hasGuildmaster || !guild.available || !selected || !training?.enabled || report.pendingCommand || game.gameState !== 'playing') return;
        game.practice?.setLastPracticedSkill(selected.name);
        const command = `practice ${selected.name.toLowerCase()}`;
        report.begin(command, selected.name); activate(); setOutputOpen(true);
        game.executeCommand(command, true, true, false, true, { fromUi: true, shouldFocus: false });
    };
    const handleButton = (button: CustomButton) => {
        if (button.id !== 'btn-guildmaster-practice') return false;
        browse(); return true;
    };
    return { open, setOpen, search, setSearch, groups, skills, selected, isAbilitySelected, guild, training, report,
        canRequest: panelData.enabled, outputVisible, setOutputOpen, browse, selectSkill, train, handleButton };
};
