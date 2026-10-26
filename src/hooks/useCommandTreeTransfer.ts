/** @file useCommandTreeTransfer.ts — Give/Put items or money through staged source, amount, and destination choices. */
import { useMemo, useState } from 'react';
import type { MouseEvent } from 'react';
import type { CustomButton } from '../types';
import type { CommandTargetSuggestion } from '../objects/targetSuggestionTypes';
import { getContainerTargetSuggestions, getGearTargetSuggestions } from '../objects/gearTargetSuggestions';
import { getCommandRoomTargetGroups } from '../objects/commandActionTargetModel';
import type { useCommandTreeController } from './useCommandTreeController';
// --- Staged Transfer Logic Section ---
const GIVE_CURRENCIES = [
    {key: 'gold', label: 'Gold', value: 'gold'},
    {key: 'silver', label: 'Silver', value: 'silver'},
    {key: 'copper', label: 'Copper', value: 'copper'}
] as const;

export const useCommandTreeTransfer = (controller: ReturnType<typeof useCommandTreeController>, command: CustomButton, fixedSource?: CommandTargetSuggestion) => {
    const give = /^give\b/i.test(command.command);
    const verb = give ? 'give' : 'put';
    const label = give ? 'Give' : 'Put';
    const [sourceId, setSourceId] = useState<string | null>(null);
    const [currencyKey, setCurrencyKey] = useState<string | null>(null);
    const [amount, setAmount] = useState('1');
    const [amountSelected, setAmountSelected] = useState(false);
    const inventory = controller.ui.displayInventoryLines;
    const equipment = controller.ui.displayEqLines;
    const roomItems = controller.game.roomItems;
    const sources = useMemo(() => {
        const items = getGearTargetSuggestions(inventory || [], 'inventory');
        return items.length ? [{key: 'command-tree-all-source', label: 'All', value: 'all', meta: 'inventory'}, ...items] : items;
    }, [inventory]);
    const selected = fixedSource || sources.find(source => source.key === sourceId) || null;
    const currency = GIVE_CURRENCIES.find(option => option.key === currencyKey) || null;
    const amountValid = /^[1-9]\d*$/.test(amount);
    const containers = useMemo(() => getContainerTargetSuggestions(roomItems || [], inventory || [], equipment || [])
        .filter(container => container.meta !== 'exit'), [roomItems, inventory, equipment]);
    const containerSections = useMemo(() => [
        {label: 'Equipment containers', meta: 'worn'},
        {label: 'Inventory containers', meta: 'inventory'},
        {label: 'Room containers', meta: 'room'}
    ].map(section => ({...section, targets: containers.filter(container => container.meta === section.meta
        && container.objectId !== selected?.objectId && container.key !== selected?.key)}))
        .filter(section => section.targets.length > 0), [containers, selected]);
    const recipientSections = useMemo(() => getCommandRoomTargetGroups(controller.entries.filter(entry =>
        entry.scope === 'room' && ['players', 'npcs'].includes(entry.group)
        && entry.keyword.toLowerCase() !== 'self' && entry.label.toLowerCase() !== controller.game.characterName?.toLowerCase()
    )).filter(section => section.entries.length > 0).map(section => ({label: section.label,
        targets: section.entries.map(entry => ({key: entry.id, label: entry.label, value: entry.context, meta: entry.category}))
    })), [controller.entries, controller.game.characterName]);
    const sections = give ? recipientSections : containerSections;
    const chooseSource = (source: CommandTargetSuggestion) => {
        setCurrencyKey(null);
        setAmountSelected(false);
        setSourceId(source.key);
        controller.game.setCommandPreview?.(`${verb} ${source.value}`);
        if (source.value === 'all') { controller.previewEntity(null); return; }
        controller.previewEntity({id: source.key, label: source.label, keyword: source.value, context: source.value,
            category: 'cat-inventory-object', group: 'inventory', scope: 'self'});
    };
    const chooseCurrency = (key: string) => {
        setSourceId(null);
        setCurrencyKey(key);
        setAmount('1');
        setAmountSelected(false);
        controller.game.setCommandPreview?.(`${verb} <amount> ${key}`);
        controller.previewEntity(null);
    };
    const updateAmount = (value: string) => {
        setAmount(value);
        setAmountSelected(false);
        if (currency) controller.game.setCommandPreview?.(`${verb} ${value || '<amount>'} ${currency.value}`);
    };
    const chooseAmount = (value: string) => {
        setAmount(value);
        setAmountSelected(true);
        if (currency) controller.game.setCommandPreview?.(`${verb} ${value} ${currency.value}`);
    };
    const confirmAmount = () => {
        if (amountValid) {
            setAmountSelected(true);
            if (currency) controller.game.setCommandPreview?.(`${verb} ${amount} ${currency.value}`);
        }
    };
    const previewDestination = (destination: CommandTargetSuggestion) => {
        const prefix = currency
            ? `${verb} ${amountValid ? amount : '<amount>'} ${currency.value}`
            : `${verb} ${selected?.value || '<item>'}`;
        controller.game.setCommandPreview?.(`${prefix} ${destination.value}`);
    };
    const disabled = controller.game.gameState !== 'playing' || controller.game.isSpectateMode;
    const transfer = (destination: CommandTargetSuggestion, event: MouseEvent) => {
        if (controller.isHelpMode) { controller.executeHelp(verb); return; }
        if (disabled || (!selected && !currency) || (currency && (!amountValid || !amountSelected))
            || !sections.some(section => section.targets.some(target => target.key === destination.key))) return;
        controller.dismissOutputs();
        const syntax = currency
            ? `${verb} ${amount} ${currency.value} ${destination.value}`
            : `${verb} ${selected!.value} ${destination.value}`;
        controller.game.handleButtonClick({...command, actionType: 'command', command: syntax}, event);
    };
    return {sources, selected, sections, chooseSource, previewDestination, transfer, disabled, label, preposition: give ? 'to' : 'into',
        currencies: give ? GIVE_CURRENCIES : [], currency, chooseCurrency, amount, amountValid,
        amountSelected, updateAmount, chooseAmount, confirmAmount,
        destinationLabel: give ? 'Give recipients in this room' : 'Put destination containers',
        emptyLabel: give ? 'No recipients in this room.' : 'No destination containers available.'};
};
