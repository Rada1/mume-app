/**
 * @file CommandActionTargetPicker.tsx
 * @description Categorized target sections for command actions, including a live group roster.
 */
import React from 'react';
import type { CommandPracticeProps, CommandShopProps, GroupMember } from '../../../types';
import { CommandShopStock } from '../../HUD/CommandShopStock';
import { CommandPracticeTargets } from '../../HUD/CommandPracticeTargets';
import { getCommandRoomTargetGroups, type CommandActionTargetEntry } from '../../../objects/commandActionTargetModel';
import { useCommandTargetDragging } from '../../../hooks/useCommandTargetDragging';
import type { CommandTargetSelection } from '../../../hooks/useCommandTargetSelection';
import { GearSelectionCheckbox } from '../../GearSelectionCheckbox';
import { GearItemLabel } from '../../GearItemLabel';
import { OnlineCommandTargets } from './OnlineCommandTargets';
import { CommandMountTarget } from './CommandMountTarget';
import { CommandTargetKeyword } from './CommandTargetKeyword';
import { CommandActionGroupMemberDetails } from './CommandActionGroupMemberDetails';
import { getEntityHighlightKind } from '../../../utils/inlineCategoryAxes';
import { stripAnsiCodes } from '../../../utils/ansi';
import './CommandActionTargetPicker.css';
import { useGearPanelData } from '../../../hooks/useGearPanelData';
import { PanelDataEmpty } from '../../HUD/PanelDataEmpty';
import { useCommandPanelStore } from '../../../stores/useCommandPanelStore';
import { isMatchingCommandTarget } from '../../../objects/commandActionTargetMatching';
import { CommandActionSubcategoryMenu, type CommandActionSubcategory } from './CommandActionSubcategoryMenu';
import { CommandActionYouContents } from './CommandActionYouContents';

// --- Type Section ---
type ContextId = 'room' | 'self'; type TargetSectionId = 'room' | 'global';
interface CommandActionTargetPickerProps {
    entries: CommandActionTargetEntry[];
    selection: CommandTargetSelection;
    groupMembers: GroupMember[];
    shop?: CommandShopProps['shop'];
    practice?: CommandPracticeProps['practice'];
    contexts: Array<{ id: ContextId; label: string }>;
    currentEntityId?: string;
    currentCategory?: string;
    currentContext?: string;
    currentKeyword?: string;
    currentDisplayName?: string;
    inCombat?: boolean;
    opponentId?: string | null;
    opponentName?: string | null;
    prefix?: string;
    includeGroupMembers?: boolean;
    isRecipientTargeting?: boolean;
    onPreviewTarget?: (entry: CommandActionTargetEntry | null) => void;
    onPreviewContext?: (context: ContextId | null) => void;
    onSelectContext: (context: ContextId) => void;
    onSelect: (entry: CommandActionTargetEntry) => void;
}

// --- Category Helpers ---
const normalizeCombatName = (value?: string | null): string =>
    stripAnsiCodes(value).replace(/^[*-]+|[*-]+$/g, '').replace(/^\d+\./, '')
        .replace(/^(?:a|an|the)\s+/i, '').trim().toLowerCase();
const getExitDoorStatus = (entry: CommandActionTargetEntry): string | null => entry.category === 'cat-exit' ? entry.hasDoor ? `Door${entry.doorName ? `: ${entry.doorName}` : ''}` : 'No door' : null;
const getEntityTypeLabel = (entry: CommandActionTargetEntry): string | null => {
    if (entry.scope !== 'room' || entry.group === 'objects' || entry.category === 'cat-exit') return null;
    if (entry.group === 'players') return 'Player';
    const labels: Record<string, string> = {
        'cat-ally': 'Ally', 'cat-ally-remote': 'Ally', 'cat-enemy': 'Enemy',
        'cat-neutral': 'Neutral', 'cat-mount': 'Mount', 'cat-npc': 'NPC'
    };
    return labels[entry.category] || 'NPC';
};
// --- Component Section ---
export const CommandActionTargetPicker: React.FC<CommandActionTargetPickerProps> = ({
    entries, selection, groupMembers, shop, practice, contexts, currentEntityId, currentCategory, currentContext,
    currentKeyword, currentDisplayName, inCombat = false, opponentId, opponentName, includeGroupMembers = false,
    isRecipientTargeting = false,
    onPreviewTarget, onPreviewContext,
    onSelectContext, onSelect
}) => {
    const [hoveredCategory, setHoveredCategory] = React.useState<TargetSectionId | null>(null);
    const [pinnedCategory, setPinnedCategory] = React.useState<TargetSectionId | null>(null);
    const [activeRoomSection, setActiveRoomSection] = React.useState<string | null>(null);
    const [activeYouSection, setActiveYouSection] = React.useState<string | null>(null);
    const [youContentsOpen, setYouContentsOpen] = React.useState(false);
    const [activeGlobalSection, setActiveGlobalSection] = React.useState<string | null>(null);
    const [roomRequest, setRoomRequest] = React.useState<{ id: string; requestId: number } | null>(null);
    const [globalRequest, setGlobalRequest] = React.useState<{ id: string; requestId: number } | null>(null);
    const [youRequest, setYouRequest] = React.useState<{ id: string; requestId: number } | null>(null);
    const activeCategory = hoveredCategory ?? pinnedCategory;
    const targetSectionRequestId = useCommandPanelStore(state => state.targetSectionRequestId);
    const requestedTargetSection = useCommandPanelStore(state => state.requestedTargetSection);
    const handledTargetSectionRequest = React.useRef(0);
    const groupRosterEntries = entries.filter(entry => entry.group === 'group');
    const onlineExcludedNames = groupRosterEntries.flatMap(entry => entry.groupMember
        ? [entry.groupMember.name, entry.groupMember.label || ''] : []);
    const isYouOpen = activeCategory === 'room' && activeRoomSection === 'entities' && youContentsOpen;
    const isWornActive = isYouOpen && activeYouSection === 'equipment';
    const isInvActive = isYouOpen && activeYouSection === 'inventory';
    const panelData = useGearPanelData(isWornActive, isInvActive);
    const dragging = useCommandTargetDragging(selection);
    const currentTarget = { entityId: currentEntityId, category: currentCategory, context: currentContext,
        keyword: currentKeyword, displayName: currentDisplayName };
    const isCurrent = (entry: CommandActionTargetEntry) => isMatchingCommandTarget(entry, currentTarget);
    const roomContexts = contexts.filter(context => context.id === 'room');
    const selfContexts = contexts.filter(context => context.id === 'self');
    const roomCharacters = entries.filter(entry => entry.scope === 'room' && entry.group !== 'objects' && entry.group !== 'group');
    const exactOpponent = inCombat && opponentId != null
        ? roomCharacters.find(entry => entry.id.match(/^roomchars:([^#]+)/)?.[1] === String(opponentId))
        : undefined;
    const normalizedOpponentName = normalizeCombatName(opponentName);
    const nameMatches = normalizedOpponentName && !exactOpponent
        ? roomCharacters.filter(entry => [entry.label, entry.context, entry.keyword].some(value => {
            const candidate = normalizeCombatName(value);
            return candidate && (candidate === normalizedOpponentName
                || candidate.includes(normalizedOpponentName) || normalizedOpponentName.includes(candidate));
        }))
        : [];
    const combatOpponentId = exactOpponent?.id || (nameMatches.length === 1 ? nameMatches[0].id : null);

    const renderEntry = (entry: CommandActionTargetEntry) => {
        const checkbox = selection.checkboxProps(entry);
        const groupMember = entry.groupMember;
        const entityType = getEntityTypeLabel(entry);
        if (groupMember && entry.group === 'group') {
            const fighting = groupMember.fighting || (inCombat && entry.id === combatOpponentId);
            return <div key={`${entry.id}:${entry.context}`} className="command-action-target-row command-action-group-member-row"
                data-selected={checkbox?.checked || undefined}>
                <button {...dragging.entryProps(entry)} type="button" className="command-action-target-option command-action-group-member-option"
                    data-target-kind={getEntityHighlightKind(entry.category)}
                    aria-current={isCurrent(entry) ? 'true' : undefined} onMouseEnter={() => onPreviewTarget?.(entry)}
                    onClick={() => onSelect(entry)}>
                    <CommandActionGroupMemberDetails member={groupMember} label={entry.label} keyword={entry.keyword}
                        nameColor={selection.colorFor(entry.category)} fighting={Boolean(fighting)} variant="roster" />
                </button>
            </div>;
        }
        return <div key={`${entry.id}:${entry.context}`} className="command-action-target-row"
            data-selected={checkbox?.checked || undefined}>
            <button {...dragging.entryProps(entry)} type="button" className={`command-action-target-option${groupMember ? ' command-action-group-inline-option' : ''}`}
                data-target-kind={getEntityHighlightKind(entry.category)}
                aria-current={isCurrent(entry) ? 'true' : undefined} onMouseEnter={() => onPreviewTarget?.(entry)}
                onClick={() => onSelect(entry)}>
                {groupMember ? <CommandActionGroupMemberDetails member={groupMember} label={entry.label} keyword={entry.keyword}
                    nameColor={selection.colorFor(entry.category)}
                    entityTypeLabel={entityType || undefined} isRoomGroupmate={entry.scope === 'room'}
                    fighting={Boolean(groupMember.fighting || (inCombat && entry.id === combatOpponentId))} variant="inline" />
                    : entry.gearRow ? <><GearItemLabel row={entry.gearRow} category={entry.category} showSlot={entry.group === 'worn'} /><CommandTargetKeyword keyword={entry.keyword} /></>
                    : <><span className="command-action-target-label" style={{ color: selection.colorFor(entry.category) }}>{entry.label}</span>{getExitDoorStatus(entry) && <small className="command-action-target-exit-door">{getExitDoorStatus(entry)}</small>}<span className="command-action-target-meta">{entityType && <small className="command-action-target-entity-indicator" data-kind={entityType.toLowerCase()}>{entityType}</small>}{inCombat && entry.id === combatOpponentId && <small className="command-action-target-combat" aria-label="Fighting">fighting</small>}<CommandTargetKeyword keyword={entry.category === 'cat-exit' ? `exit ${entry.keyword}` : entry.keyword} /></span></>}
                {!groupMember && entry.gearRow && inCombat && entry.id === combatOpponentId && <small className="command-action-target-combat" aria-label="Fighting">fighting</small>}
            </button>
            {checkbox && <GearSelectionCheckbox {...checkbox} />}
        </div>;
    };
    const renderSelectAll = (group: CommandActionTargetEntry[], label: string) => {
        const checkbox = selection.categoryCheckboxProps(group, label);
        return checkbox ? <GearSelectionCheckbox {...checkbox} /> : null;
    };

    const roomGroups = React.useMemo(() => getCommandRoomTargetGroups(entries.filter(entry => entry.group !== 'group')), [entries]);
    const roomSectionEntries = (id: string) => roomGroups.find(section => section.id === id)?.entries ?? [];
    const roomAllyEntries = roomSectionEntries('allies');
    const enemyEntries = roomSectionEntries('enemies');
    const npcEntries = roomSectionEntries('npcs');
    const neutralEntries = roomSectionEntries('neutral');
    const mountEntries = roomSectionEntries('mounts');
    const playerEntries = roomSectionEntries('players');
    const roomObjectEntries = roomSectionEntries('objects');
    const exitEntries = roomSectionEntries('exits');
    const inventoryEntries = entries.filter(entry => entry.group === 'inventory');
    const equipmentEntries = entries.filter(entry => entry.group === 'worn');
    const renderTargetEntries = (targetEntries: CommandActionTargetEntry[]) => targetEntries.map(entry =>
        <CommandMountTarget key={entry.id} entry={entry} currentEntityId={currentEntityId} onSelect={onSelect}
            onPreviewTarget={onPreviewTarget}
            checkboxPropsForEntry={selection.checkboxProps} levelCheckboxPropsForEntries={selection.levelCheckboxProps}>
            {renderEntry(entry)}
        </CommandMountTarget>);
    const renderEntriesOrEmpty = (targetEntries: CommandActionTargetEntry[], emptyLabel: string) => targetEntries.length
        ? renderTargetEntries(targetEntries) : <p className="command-action-target-empty">{emptyLabel}</p>;
    const handleTabHover = (id: TargetSectionId) => {
        onPreviewTarget?.(null);
        setHoveredCategory(id);
    };
    const handleRoomSectionChange = React.useCallback((sectionId: string | null) => {
        onPreviewTarget?.(null);
        setActiveRoomSection(sectionId);
        if (sectionId !== 'entities') {
            setYouContentsOpen(false);
            setActiveYouSection(null);
        }
    }, [onPreviewTarget]);
    const handleTabClick = (id: TargetSectionId) => {
        const nextPinned = pinnedCategory === id ? null : id;
        setPinnedCategory(nextPinned);
    };
    const handleYouSectionChange = React.useCallback((sectionId: string | null) => {
        setActiveYouSection(sectionId);
    }, []);
    const handleYouContentsOpenChange = React.useCallback((open: boolean) => {
        setYouContentsOpen(open);
        if (!open) setActiveYouSection(null);
    }, []);
    React.useEffect(() => {
        practice?.setOpen(activeCategory === 'room' && activeRoomSection === 'entities'
            && youContentsOpen && activeYouSection === 'skills');
    }, [activeCategory, activeRoomSection, activeYouSection, practice?.setOpen, youContentsOpen]);
    React.useEffect(() => {
        if (!requestedTargetSection || handledTargetSectionRequest.current === targetSectionRequestId) return;
        handledTargetSectionRequest.current = targetSectionRequestId;
        setHoveredCategory(null);
        if (requestedTargetSection === 'communication-online') {
            setPinnedCategory('global');
            setGlobalRequest({ id: 'online', requestId: targetSectionRequestId });
        } else if (requestedTargetSection === 'communication-room') {
            setPinnedCategory('room');
            setRoomRequest({ id: 'entities', requestId: targetSectionRequestId });
        } else {
            setPinnedCategory('room');
            if (requestedTargetSection === 'shop') {
                setRoomRequest({ id: 'shop', requestId: targetSectionRequestId });
            } else {
                setRoomRequest({ id: 'entities', requestId: targetSectionRequestId });
                setYouRequest({ id: 'skills', requestId: targetSectionRequestId });
            }
        }
        useCommandPanelStore.getState().clearTargetSectionRequest();
    }, [requestedTargetSection, targetSectionRequestId]);
    const renderContext = (context: typeof contexts[number]) => {
        const selected = currentEntityId === `command-panel-${context.id}`;
        return <button data-object-drop-row={context.id === 'self' ? 'inventory' : 'room'} key={context.id}
            type="button" className="command-action-target-option" data-target-kind={context.id === 'room' ? 'room' : 'you'}
            aria-current={selected ? 'true' : undefined} onMouseEnter={() => onPreviewContext?.(context.id)}
            onClick={() => onSelectContext(context.id)}>
            <span className="command-action-target-label" style={{ color: context.id === 'self' ? '#38bdf8' : selection.colorFor('cat-room') }}>
                {context.label}
            </span>
            {context.id === 'room' && <CommandTargetKeyword keyword="null" />}
            {context.id === 'self' && <span className="command-action-target-meta">
                <small className="command-action-target-entity-indicator" data-kind="you">You</small>
                <CommandTargetKeyword keyword="self" />
            </span>}
        </button>;
    };
    const youSections: CommandActionSubcategory[] = [
        { id: 'inventory', label: 'Inventory', count: panelData.status.inventory === 'ready' ? inventoryEntries.length : undefined, showWhenEmpty: true, dropProps: dragging.categoryProps('inventory'),
            actions: renderSelectAll(inventoryEntries, 'Inventory'),
            content: panelData.status.inventory === 'ready' ? renderEntriesOrEmpty(inventoryEntries, 'Nothing in your inventory.')
                : <PanelDataEmpty kind="inventory" emptyLabel="Nothing in your inventory." /> },
        { id: 'equipment', label: 'Equipment', count: panelData.status.equipment === 'ready' ? equipmentEntries.length : undefined, showWhenEmpty: true, dropProps: dragging.categoryProps('worn'),
            actions: renderSelectAll(equipmentEntries, 'Worn equipment'),
            content: panelData.status.equipment === 'ready' ? renderEntriesOrEmpty(equipmentEntries, 'No worn equipment.')
                : <PanelDataEmpty kind="equipment" emptyLabel="No worn equipment." /> },
        ...(practice?.guild.hasGuildmaster ? [{ id: 'skills', label: 'Skills', count: practice.guild.available ? practice.skills.length : undefined,
            content: <CommandPracticeTargets practice={practice} embedded /> }] : [])
    ];
    const entityEntries = [...roomAllyEntries, ...enemyEntries, ...npcEntries, ...neutralEntries, ...mountEntries, ...playerEntries];
    const youTarget = <CommandActionYouContents
        target={selfContexts.length ? selfContexts.map(renderContext) : <p className="command-action-target-empty">You are not available as a target.</p>}
        sections={youSections} onActiveSectionChange={handleYouSectionChange}
        onOpenChange={handleYouContentsOpenChange} request={youRequest} />;
    const entityContents = <>
        {youTarget}
        {entityEntries.length ? renderTargetEntries(entityEntries)
            : <p className="command-action-target-empty">No other entities are present.</p>}
    </>;
    const roomSections: CommandActionSubcategory[] = [
        { id: 'entities', label: 'Entities', count: selfContexts.length + entityEntries.length,
            content: entityContents },
        { id: 'objects', label: 'Objects', count: roomObjectEntries.length, dropProps: dragging.categoryProps('room'),
            actions: renderSelectAll(roomObjectEntries, 'Room gear'),
            content: renderEntriesOrEmpty(roomObjectEntries, 'No room objects are present.') },
        { id: 'exits', label: 'Exits', count: exitEntries.length, dropProps: dragging.categoryProps('room'),
            content: renderEntriesOrEmpty(exitEntries, 'No exits are available.') },
        ...(shop?.available ? [{ id: 'shop', label: 'Shop', count: shop.browsing && panelData.status.shop === 'ready' ? shop.shopItems.length : undefined,
            content: <CommandShopStock shop={shop} open={activeCategory === 'room' && activeRoomSection === 'shop'}
                onOpenChange={() => undefined} /> }] : [])
    ];
    const globalSections: CommandActionSubcategory[] = [
        ...(groupRosterEntries.length ? [{ id: 'group', label: 'Group', count: groupRosterEntries.length,
            content: renderTargetEntries(groupRosterEntries) }] : []),
        { id: 'online', label: 'Online Players', content: <OnlineCommandTargets onSelect={onSelect}
            currentEntityId={currentEntityId} color={selection.colorFor('cat-ally-remote')}
            onPreviewTarget={onPreviewTarget}
            open={activeCategory === 'global' && activeGlobalSection === 'online'}
            excludedNames={includeGroupMembers ? [] : onlineExcludedNames} onOpenChange={() => undefined} /> },
        { id: 'weather', label: 'Weather', count: entries.filter(entry => entry.group === 'weather').length, content: renderTargetEntries(entries.filter(entry => entry.group === 'weather')) }
    ];
    const entityCount = selfContexts.length + entityEntries.length;
    const objectCount = roomObjectEntries.length;
    const roomCount = entityCount + objectCount + exitEntries.length + roomContexts.length + (shop?.available ? shop.shopItems.length : 0);
    const tabs: Array<{ id: TargetSectionId; label: string; count?: number }> = [
        { id: 'room', label: 'Room', count: roomCount },
        { id: 'global', label: 'Global' }
    ];

    return <div className={`command-action-target-picker${isRecipientTargeting ? ' is-recipient-targeting' : ''}`}>
        <div className="command-action-target-menu" aria-label="Choose a command target">
            <nav className="command-action-target-nav" aria-label="Target categories" role="tablist">
                {tabs.map(tab => {
                    const isActive = activeCategory === tab.id;
                    const isPinned = pinnedCategory === tab.id;
                    return <button key={tab.id} type="button" role="tab"
                        className={`command-action-target-tab${isActive ? ' is-active' : ''}${isPinned ? ' is-pinned' : ''}`}
                        data-active={isActive || undefined} data-pinned={isPinned || undefined}
                        aria-selected={isActive} aria-label={tab.label}
                        title={isPinned ? `${tab.label} (Pinned - click to unpin)` : `${tab.label} (Click to pin)`}
                        onMouseEnter={() => handleTabHover(tab.id)} onClick={() => handleTabClick(tab.id)}>
                        <span>{tab.label}</span>{tab.count !== undefined && <small>{tab.count}</small>}
                    </button>;
                })}
            </nav>
            <div className="command-action-target-options">
                {activeCategory === 'room' && <>
                    <div className="command-action-subcategory-heading"><span>Location</span></div>{roomContexts.map(renderContext)}
                    <CommandActionSubcategoryMenu label="Room categories" sections={roomSections}
                        onActiveSectionChange={handleRoomSectionChange} request={roomRequest} />
                </>}
                {activeCategory === 'global' && <CommandActionSubcategoryMenu label="Global categories"
                    sections={globalSections} onActiveSectionChange={setActiveGlobalSection} request={globalRequest} />}
            </div>
        </div>
    </div>;
};
