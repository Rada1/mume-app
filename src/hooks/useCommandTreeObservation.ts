/** @file useCommandTreeObservation.ts — Explicit observation targets and shared detail capture. */
import { useEffect, useMemo, useState } from 'react';
import type { CustomButton } from '../types';
import type { CommandActionTargetEntry } from '../objects/commandActionTargetModel';
import type { useCommandTreeController } from './useCommandTreeController';
import { getLookInTargetSections, getLookInTargets, getObservationTargetSections, LOOK_IN_TARGET_ID } from '../utils/commandTreeObservation';
import { getCommandTreeBasePreview, getCommandTreeTargetPreview } from '../utils/commandTreePreview';
import { executeCommandPanelInput } from './executeCommandPanelInput';
// --- Observation Logic Section ---
export const executeCommandTreeObservation = (controller: ReturnType<typeof useCommandTreeController>, entry: CommandActionTargetEntry, verb: string) => {
        if (controller.isHelpMode) { controller.executeHelp(verb); return; }
        if (controller.game.gameState !== 'playing' || controller.game.isSpectateMode) return;
        controller.dismissOutputs();
        controller.previewEntity(null);
        const room = entry.id === 'command-panel-room';
        const consider = verb === 'consider';
        controller.ui.setPopoverState({
            x: 0, y: 0, type: 'menu', commandPanelCapture: true,
            entityId: entry.id, category: entry.category, setId: entry.category,
            context: entry.context, keyword: entry.keyword,
            displayName: entry.id === 'command-panel-self' ? 'Self' : entry.label, parentNoun: entry.parentNoun,
            isRoomDescription: room, hasInspectionCard: true, isCapturingExamine: !consider,
            examineMode: consider ? undefined : verb === 'look' ? 'look' : 'examine', isCapturingConsider: consider
        });
        const command = verb === 'look in' ? `${verb} ${entry.context}` : `${consider ? 'con' : verb}${room ? '' : ` ${entry.context}`}`;
        executeCommandPanelInput(controller.game, command, false, false, false, false, {shouldFocus: false, fromUi: true});
        controller.game.setCommandPreview?.(null);
    };
export const useCommandTreeObservation = (controller: ReturnType<typeof useCommandTreeController>, button: CustomButton, targets: CommandActionTargetEntry[]) => {
    const [lookInOpen, setLookInOpen] = useState(false);
    const [sectionLabel, setSectionLabel] = useState('Room');
    const sections = useMemo(() => getObservationTargetSections(targets), [targets]);
    const selectedSection = sections.find(section => section.label === sectionLabel) || sections[0];
    useEffect(() => { setSectionLabel('Room'); setLookInOpen(false); }, [button.id, button.command]);
    const chooseSection = (label: string) => {
        setSectionLabel(label);
        setLookInOpen(false);
        controller.previewEntity(null);
        controller.game.setCommandPreview?.(getCommandTreeBasePreview(button.command));
    };
    const containers = useMemo(() => getLookInTargets(targets, controller.game.entities, controller.game.inlineCategories || []),
        [targets, controller.game.entities, controller.game.inlineCategories]);
    const containerSections = useMemo(() => getLookInTargetSections(containers), [containers]);
    const preview = (entry: CommandActionTargetEntry) => {
        if (entry.id === LOOK_IN_TARGET_ID) {
            controller.game.setCommandPreview?.('look in <container>');
            setLookInOpen(true);
            return;
        }
        setLookInOpen(false);
        controller.game.setCommandPreview?.(entry.id === 'command-panel-room'
            ? getCommandTreeBasePreview(button.command)
            : getCommandTreeTargetPreview(button.command, entry.context, entry.parentNoun));
        if (entry.id === 'command-panel-room') controller.previewTargetContext('room');
        else if (entry.id === 'command-panel-self') controller.previewTargetContext('self');
        else controller.previewEntity(entry);
    };

    const observe = (entry: CommandActionTargetEntry) => {
        if (entry.id === LOOK_IN_TARGET_ID) { setLookInOpen(true); return; }
        executeCommandTreeObservation(controller, entry, button.command.split(' ')[0]);
    };
    const lookIn = (entry: CommandActionTargetEntry) => executeCommandTreeObservation(controller, entry, 'look in');
    const previewContainer = (entry: CommandActionTargetEntry) => {
        controller.game.setCommandPreview?.(`look in ${entry.context}`);
        controller.previewEntity(entry);
    };
    return {sections, selectedSection, chooseSection, containerSections, containers, lookInOpen, observe, lookIn, preview, previewContainer,
        disabled: controller.game.gameState !== 'playing' || controller.game.isSpectateMode};
};
