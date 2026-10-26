/**
 * @file StandardMenuPopover.tsx
 * @description Main orchestrator for entity and action popovers.
 */

import React from 'react';
import { CharacterInfo, CustomButton, MessageType, PopoverState, InlineCategoryConfig, GameEntity, ParleyState, GmcpOccupant, CharacterEntry, CustomTraitConfig, PracticeData } from '../../types';
import { isButtonValidForEntity } from '../../utils/actionUtils';
import { getButtonIdsForTraits, getCategoryConfig, getResolvedTraitSections, getTraitsForCategoryWithOverrides, getTraitsForName as getInlineActionTraits } from '../../utils/inlineActionModel';
import { getInlineCategoryAxes, getInlineCategoryLabel, normalizeInlineCategoryId } from '../../utils/inlineCategoryAxes';
import { formatMumeTarget, sanitizeGameTarget } from '../../utils/gameUtils';
import { User, Users, Skull, GraduationCap, Store, Coins, Sword, Trash2, Package, Utensils, Droplets, Flame, BookOpen, Shield, Box, Pencil, Settings } from 'lucide-react';

// --- Sub-components ---
import { TraitToggleSection } from './StandardMenu/TraitToggleSection';
import { PopoverActionButton } from './StandardMenu/PopoverActionButton';
import { ParleySection } from './StandardMenu/ParleySection';
import { CapturedDetailsCard } from './StandardMenu/CapturedDetailsCard';
import { CapturedDetailsSidePanel } from './StandardMenu/CapturedDetailsSidePanel';
import { AccountCharacterCard } from './StandardMenu/AccountCharacterCard';
import { AccountStatPopover } from './StandardMenu/AccountStatPopover';
import { InlineActionDeck } from './StandardMenu/InlineActionDeck';
import { InlineLookAction } from './StandardMenu/InlineLookAction';
import { InlineContainerGetAction } from './StandardMenu/InlineContainerGetAction';
import type { InlineCommandDisplayParts } from './StandardMenu/inlineCommandDisplay';
import { RoomEntityPicker } from './StandardMenu/RoomEntityPicker';
import { useRoomEntityMenu } from '../../hooks/useRoomEntityMenu';
import { createLearnedInlineAbilityButtons } from '../../utils/inlineAbilityActions';
import { SOCIAL_BUTTONS } from '../../constants/buttons/socials';
import { DOOR_BUTTONS } from '../../constants/buttons/doors';
import type { SelectedTargetInfo } from '../../stores/useUIStore';
import { useVitals } from '../../context/GameContext';

interface StandardMenuProps {
    popoverState: PopoverState;
    buttons: CustomButton[];
    availableSets: string[];
    setPopoverState: React.Dispatch<React.SetStateAction<PopoverState | null>>;
    setButtons: React.Dispatch<React.SetStateAction<CustomButton[]>>;
    handleButtonClick: (button: CustomButton, e: any, context?: string, isContainer?: boolean, parentNoun?: string, direction?: string) => void;
    setTarget: (target: string | null) => void;
    addMessage: (type: MessageType, content: string) => void;
    themeColor?: string;
    favorites: string[];
    setFavorites: (val: string[] | ((prev: string[]) => string[])) => void;
    keywordOverrides?: Record<string, string>;
    parley: ParleyState;
    setParley: (val: ParleyState) => void;
    whoList: string[];
    executeCommand: (cmd: string, silent?: boolean, isSystem?: boolean, isHistorical?: boolean, fromDrawer?: boolean, options?: { shouldFocus?: boolean, fromUi?: boolean }) => void;
    inlineCategories?: InlineCategoryConfig[];
    customTraits?: CustomTraitConfig[];
    setCustomTraits?: (val: CustomTraitConfig[] | ((prev: CustomTraitConfig[]) => CustomTraitConfig[])) => void;
    isMendingMode?: boolean;
    setIsMendingMode?: (val: boolean) => void;
    setMendingTarget?: (val: string | null) => void;
    handleTabClick: (drawer: 'character' | 'equipment') => void;
    setGearTab: (tab: 'worn' | 'inv' | 'vicinity') => void;
    setCharTab: (tab: 'info' | 'quests' | 'skills') => void;
    refreshLogHighlights?: () => void;
    triggerHaptic?: (ms: number) => void;
    openKeywordEdit?: (context: string, displayText: string) => void;
    roomPlayers?: (string | GmcpOccupant)[];
    roomNpcs?: (string | GmcpOccupant)[];
    roomItems?: (string | GmcpOccupant)[];
    inventoryLines?: import('../../types').DrawerLine[];
    equipmentLines?: import('../../types').DrawerLine[];
    entities: Record<string, GameEntity>;
    registerEntity: (id: string, name: string, location: import('../../types').EntityLocation, category?: string) => import('../../types').GameEntity;
    selectedObjectIds: Set<string>;
    toggleObjectSelection: (info: SelectedTargetInfo) => void;
    clearObjectSelection: () => void;
    accountCharacters?: CharacterEntry[];
    accountState?: import('../../types').AccountState;
    setAccountState?: React.Dispatch<React.SetStateAction<import('../../types').AccountState>>;
    direction?: string;
    characterInfo?: CharacterInfo;
    currentTerrain?: string;
    abilities?: Record<string, number>;
    practiceData?: PracticeData | null;
}

const formatSetLabel = (id: string): string => {
    const category = getCategoryConfig(id);
    if (category) return category.label;
    return id.replace(/^(inline|cat)-/, '').replace(/-/g, ' ').toUpperCase();
};

const stripAnsiCodes = (text: string): string => {
    if (!text) return '';
    return text.replace(/[\u001b\x1b\u2190]\[[0-9;]*[a-zA-Z]/g, '');
};

// Inspect commands are safe, descriptive reads. Everything else is presented
// as a world-changing action, even when it is harmless, so the distinction is
// immediately understandable in an inline card.
const isInformationButton = (button: CustomButton): boolean => {
    const verb = (button.command || button.label || '').trim().toLowerCase().split(/\s+/)[0];
    return ['look', 'examine', 'consider', 'con', 'whois', 'compare', 'scan', 'search', 'read', 'listen', 'smell', 'identify'].includes(verb);
};

const isContainerLookInButton = (button: CustomButton): boolean => (
    button.id === 'btn-container-look-in' || button.id === 'btn-fluid-look-in'
);

const resolveEntityCategoryIcon = (categoryId: string, resolvedTraitIds: string[]) => {
    // Look at traits first as they are more specific (e.g. guildmaster, weapon)
    if (resolvedTraitIds.includes('trait-guildmaster')) return GraduationCap;
    if (resolvedTraitIds.includes('trait-shopkeeper') || resolvedTraitIds.includes('trait-innkeeper')) return Store;
    if (resolvedTraitIds.includes('trait-mount')) return Coins;
    if (resolvedTraitIds.includes('trait-weapon')) return Sword;
    if (resolvedTraitIds.includes('trait-corpse') || resolvedTraitIds.includes('trait-darkie-corpse')) return Trash2;
    if (resolvedTraitIds.includes('trait-container')) return Package;
    if (resolvedTraitIds.includes('trait-food')) return Utensils;
    if (resolvedTraitIds.includes('trait-water') || resolvedTraitIds.includes('trait-fluid-container') || resolvedTraitIds.includes('trait-quaffable')) return Droplets;
    if (resolvedTraitIds.includes('trait-poison')) return Skull;
    if (resolvedTraitIds.includes('trait-lightsource') || resolvedTraitIds.includes('trait-lantern-worn')) return Flame;
    if (resolvedTraitIds.includes('trait-book') || resolvedTraitIds.includes('trait-reciteable')) return BookOpen;
    if (resolvedTraitIds.includes('trait-sheath')) return Shield;

    // Then check categoryId
    if (categoryId === 'cat-ally' || categoryId === 'cat-ally-remote') return User;
    if (categoryId === 'cat-enemy') return Skull;
    if (categoryId === 'cat-npc' || categoryId === 'cat-neutral') return Users;
    if (categoryId === 'cat-container-item') return Package;
    if (categoryId === 'cat-worn-object') return Shield;
    if (categoryId === 'cat-object' || categoryId === 'cat-room-object') return Box;

    return null;
};

export const StandardMenuPopover: React.FC<StandardMenuProps> = (props) => {
    const {
        popoverState, buttons, availableSets, setPopoverState, setButtons, handleButtonClick, setTarget, addMessage, favorites,
        setFavorites, keywordOverrides, parley, setParley, whoList, executeCommand, inlineCategories, customTraits, setCustomTraits,
        handleTabClick, setGearTab, setCharTab,
        refreshLogHighlights, triggerHaptic, openKeywordEdit, roomPlayers, roomNpcs, roomItems, inventoryLines, equipmentLines,
        entities, selectedObjectIds, toggleObjectSelection, clearObjectSelection, accountCharacters, accountState, setAccountState, direction, characterInfo,
        themeColor
    } = props;
    const { target: currentTarget } = useVitals();
    const learnedInlineAbilityButtons = React.useMemo(
        () => createLearnedInlineAbilityButtons(props.abilities || {}, props.practiceData || null),
        [props.abilities, props.practiceData]
    );
    const inlineMenuButtons = React.useMemo(() => {
        const availableById = new Map(buttons.map(button => [button.id, button]));
        const supplementalButtons = [
            ...SOCIAL_BUTTONS.filter(button => button.command.includes('%n')),
            ...DOOR_BUTTONS,
            ...learnedInlineAbilityButtons
        ];
        supplementalButtons.forEach(button => {
            if (!availableById.has(button.id)) availableById.set(button.id, button);
        });
        return [...buttons, ...Array.from(availableById.values()).filter(button => !buttons.some(existing => existing.id === button.id))];
    }, [buttons, learnedInlineAbilityButtons]);
    const { entries: roomEntityEntries, selectEntity: selectRoomEntity } = useRoomEntityMenu({
        players: roomPlayers || [],
        npcs: roomNpcs || [],
        objects: roomItems || [],
        characterName: characterInfo?.name || '',
        inventoryLines: inventoryLines || [],
        equipmentLines: equipmentLines || [],
        selectedObjectIds,
        toggleObjectSelection,
        setTarget,
        setPopoverState,
        currentTarget,
        triggerHaptic
    });

    const [isChoosingCategory, setIsChoosingCategory] = React.useState(!!popoverState.isChoosingCategory);
    const menuRootRef = React.useRef<HTMLDivElement>(null);
    React.useEffect(() => {
        setIsChoosingCategory(!!popoverState.isChoosingCategory);
    }, [popoverState.isChoosingCategory, popoverState.context, popoverState.setId]);
    const safeSetId = popoverState.setId ?? '';
    const isSetManager = safeSetId === 'setmanager';
    
    const categoryId = normalizeInlineCategoryId(popoverState.category || safeSetId);
    const categoryAxes = getInlineCategoryAxes(categoryId);
    const resolvedTraitSections = getResolvedTraitSections(
        categoryId,
        popoverState.context || null,
        inlineCategories || []
    );
    const defaultKeywordTraitIds = popoverState.context
        ? getInlineActionTraits(popoverState.context, (inlineCategories || []).map(config => ({ ...config, excludedKeywords: [] }))).map(trait => trait.id)
        : [];
    const defaultCategoryTraitIds = getTraitsForCategoryWithOverrides(categoryId, inlineCategories || []).map(trait => trait.id);
    const defaultTraitIds = Array.from(new Set([...defaultCategoryTraitIds, ...defaultKeywordTraitIds]));
    const resolvedTraitIds = resolvedTraitSections.map(section => section.trait.id);
    const resolvedTraitButtonIds = new Set(getButtonIdsForTraits(resolvedTraitSections.map(section => section.trait)));
    const canObserve = resolvedTraitIds.includes('trait-observable');

    // Build action sections from resolved traits only.
    const entity = popoverState.entityId ? entities[popoverState.entityId] : null;
    const shouldUseEntityFilter = !!(popoverState.entityId && entity);
    const sectionDefs = React.useMemo(() => {
        const sections: Array<{ key: string; label: string; buttonIds: string[] }> = [];
        const seen = new Set<string>();

        resolvedTraitSections.forEach(section => {
            if (seen.has(section.trait.id)) return;
            seen.add(section.trait.id);
            sections.push({
                key: section.trait.id,
                label: section.trait.label,
                buttonIds: section.buttonIds
            });
        });

        return sections;
    }, [resolvedTraitSections]);
    const isTacticalSet = ['warriorskilllist', 'rangerskilllist', 'clericspelllist', 'thiefskilllist', 'magespelllist', 'doors'].includes(safeSetId);
    const targetContext = formatMumeTarget(popoverState.context) || popoverState.context || null;
    const containerLookTraitKey = sectionDefs.find(section => (
        section.key === 'trait-container' || section.key === 'trait-fluid-container'
    ))?.key;
    const hasContainerLook = Boolean(containerLookTraitKey && targetContext);
    const lookStateKey = `${popoverState.entityId || ''}:${targetContext || ''}`;
    const [lookInSelection, setLookInSelection] = React.useState<{key: string; selected: boolean}>({key: '', selected: false});
    const lookInSelected = lookInSelection.key === lookStateKey && lookInSelection.selected;
    const toggleLookIn = () => setLookInSelection({key: lookStateKey, selected: !lookInSelected});
    const toggleFavorite = (e: React.MouseEvent, command: string) => {
        e.stopPropagation();
        setFavorites(prev => prev.includes(command) ? prev.filter(id => id !== command) : [...prev, command]);
    };

    const renderContainerGet = (
        button: CustomButton,
        renderButton: (button: CustomButton, displayParts?: InlineCommandDisplayParts) => React.ReactNode,
        displayParts?: InlineCommandDisplayParts
    ) => {
        if (!hasContainerLook || !targetContext || button.id !== 'btn-get'
            || !/^get\s+%n(?:\|[^\s]+)?$/i.test(button.command.trim()) || popoverState.assignSourceId) {
            return renderButton(button, displayParts);
        }
        return <InlineContainerGetAction key={`container-get-${button.id}`} button={button}
            entityId={popoverState.entityId || ''} targetContext={targetContext} renderGet={renderButton} />;
    };

    let seenCommandsSize = 0;
    const isInlineMenu = !isTacticalSet && (
        categoryAxes.isInlineAction ||
        ['inventorylist', 'equipmentlist', 'roomitems', 'roomnpcs', 'selection'].includes(safeSetId) ||
        safeSetId.startsWith('object') ||
        safeSetId.startsWith('npc')
    );
    const hasCapturedDetails = !!(
        popoverState.hasInspectionCard || popoverState.isCapturingExamine || popoverState.isCapturingConsider ||
        popoverState.capturedExamineLines || popoverState.capturedConsiderLines || popoverState.isCapturingWhois ||
        popoverState.capturedWhoisLines || popoverState.isCapturingWho || popoverState.capturedWhoLines ||
        popoverState.isCapturingWhere || popoverState.capturedWhereLines || popoverState.isCapturingRoomAction || popoverState.capturedRoomActionLines
    );
    // Inline entities use a terminal command list, with explicit inspection replies
    // captured into the detail card while remaining visible in the log.
    // The compact chip strip remains available to specialised callers.
    const [isCompactInline, setIsCompactInline] = React.useState(false);

    React.useEffect(() => {
        setIsCompactInline(false);
    }, [isInlineMenu, popoverState.context, popoverState.setId, popoverState.isChoosingCategory]);

    const openInlineSettings = (event: React.MouseEvent) => {
        event.stopPropagation();
        triggerHaptic?.(20);
        setIsCompactInline(false);
    };

    const requestInspection = (kind: 'look' | 'examine' | 'consider', commandOverride?: string) => {
        if (!targetContext) return;
        const capturesExamine = kind === 'look' || kind === 'examine';
        setIsChoosingCategory(false);
        setPopoverState(current => current ? ({
            ...current,
            isChoosingCategory: false,
            hasInspectionCard: true,
            isCapturingExamine: capturesExamine,
            capturedExamineLines: capturesExamine ? undefined : current.capturedExamineLines,
            examineMode: kind === 'look' || kind === 'examine' ? kind : current.examineMode,
            isCapturingConsider: !capturesExamine,
            capturedConsiderLines: capturesExamine ? current.capturedConsiderLines : undefined,
            isCapturingWhois: false,
            capturedWhoisLines: undefined,
            whoisTarget: undefined,
            isCapturingWho: false,
            capturedWhoLines: undefined,
            isCapturingWhere: false,
            capturedWhereLines: undefined,
            isCapturingRoomAction: false,
            roomActionKind: undefined,
            capturedRoomActionLines: undefined
        }) : null);
        const command = commandOverride || `${kind === 'look' ? 'look' : kind === 'examine' ? 'examine' : 'con'} ${targetContext}`;
        executeCommand(command, false, false, false, false, { shouldFocus: false, fromUi: true });
    };

    const requestInlineExamine = (commandTemplate: string) => {
        const resolvedCommand = commandTemplate
            .replace(/%n/g, targetContext || '')
            .replace(/%p/g, sanitizeGameTarget(popoverState.parentNoun || ''))
            .trim();
        requestInspection('examine', /^examine$/i.test(resolvedCommand)
            ? `${resolvedCommand} ${targetContext}`
            : resolvedCommand);
    };

    const requestWhois = () => {
        if (!targetContext) return;
        setIsChoosingCategory(false);
        setIsCompactInline(false);
        setPopoverState(current => current ? ({
            ...current,
            isChoosingCategory: false,
            hasInspectionCard: true,
            isCapturingWhois: true,
            capturedWhoisLines: undefined,
            whoisTarget: targetContext,
            isCapturingExamine: false,
            isCapturingConsider: false,
            capturedExamineLines: undefined,
            capturedConsiderLines: undefined,
            isCapturingWho: false,
            capturedWhoLines: undefined,
            isCapturingWhere: false,
            capturedWhereLines: undefined,
            isCapturingRoomAction: false,
            roomActionKind: undefined,
            capturedRoomActionLines: undefined
        }) : null);
        executeCommand(`whois ${targetContext}`, true, true, false, false, { shouldFocus: false, fromUi: true });
    };

    const requestRoomReport = (kind: 'who' | 'where' | 'exits' | 'map' | 'weather local') => {
        if (categoryId !== 'cat-room') return;
        setIsChoosingCategory(false);
        setIsCompactInline(false);
        const roomActionKind = kind === 'exits' || kind === 'map' || kind === 'weather local' ? kind : undefined;
        setPopoverState(current => current ? ({
            ...current,
            isChoosingCategory: false,
            hasInspectionCard: true,
            isCapturingExamine: false,
            isCapturingConsider: false,
            isCapturingWhois: false,
            isCapturingWho: kind === 'who',
            isCapturingWhere: kind === 'where',
            isCapturingRoomAction: roomActionKind !== undefined,
            roomActionKind,
            capturedExamineLines: undefined,
            capturedConsiderLines: undefined,
            capturedWhoisLines: undefined,
            capturedWhoLines: undefined,
            capturedWhereLines: undefined,
            capturedRoomActionLines: undefined,
            whoisTarget: undefined
        }) : null);
        executeCommand(kind, false, false, false, false, { shouldFocus: false, fromUi: true });
    };

    const closeCapturedDetails = () => {
        setPopoverState(current => current ? ({
            ...current,
            hasInspectionCard: false,
            isCapturingExamine: false,
            isCapturingConsider: false,
            isCapturingWhois: false,
            isCapturingWho: false,
            isCapturingWhere: false,
            capturedExamineLines: undefined,
            capturedConsiderLines: undefined,
            capturedWhoisLines: undefined,
            capturedWhoLines: undefined,
            capturedWhereLines: undefined,
            isCapturingRoomAction: false,
            roomActionKind: undefined,
            capturedRoomActionLines: undefined,
            whoisTarget: undefined
        }) : null);
    };

    const renderActionButtons = () => {
        const seenCommands = new Set<string>();
        const filterDeps = { buttons: inlineMenuButtons, inlineCategories: inlineCategories || [], roomNpcs, entities, characterInfo, currentTerrain: props.currentTerrain };

        if (isCompactInline) {
            return (
                <div className="inline-action-chips" data-inline-action-chips="true">
                    {hasContainerLook && <InlineLookAction targetContext={targetContext!} lookInSelected={lookInSelected}
                        onToggleLookIn={toggleLookIn}
                        onLook={lookIn => requestInspection('look', lookIn ? `look in ${targetContext}` : undefined)} />}
                    {inlineMenuButtons.map(button => {
                        if (hasContainerLook && isContainerLookInButton(button)) return null;
                        if (favorites.includes(button.command) || seenCommands.has(button.command)) return null;
                        const isValid = isButtonValidForEntity(button, popoverState.entityId || '', categoryId, filterDeps, safeSetId, popoverState.context);
                        if (!isValid || !resolvedTraitButtonIds.has(button.id)) return null;
                        seenCommands.add(button.command);
                        return renderContainerGet(button, (actionButton, displayParts) => <PopoverActionButton key={actionButton.id} button={actionButton} {...props} toggleFavorite={toggleFavorite} onRequestWhois={requestWhois} onRequestRoomReport={requestRoomReport} onRequestExamine={requestInlineExamine} compact terminal={hasContainerLook && actionButton.id === 'btn-get'} inlineCommandOnly={hasContainerLook && actionButton.id === 'btn-get'} inlineCommandParts={displayParts} showFavorite={false} glowDelay="0s" />);
                    })}
                    {favorites.map(command => {
                        const button = inlineMenuButtons.find(candidate => candidate.command === command);
                        if (hasContainerLook && button && isContainerLookInButton(button)) return null;
                        if (!button || seenCommands.has(button.command)) return null;
                        const isValid = isButtonValidForEntity(button, popoverState.entityId || '', categoryId, filterDeps, safeSetId, popoverState.context);
                        if (!isValid || !resolvedTraitButtonIds.has(button.id)) return null;
                        seenCommands.add(button.command);
                        return renderContainerGet(button, (actionButton, displayParts) => <PopoverActionButton key={actionButton.id} button={actionButton} {...props} toggleFavorite={toggleFavorite} onRequestWhois={requestWhois} onRequestRoomReport={requestRoomReport} onRequestExamine={requestInlineExamine} compact terminal={hasContainerLook && actionButton.id === 'btn-get'} inlineCommandOnly={hasContainerLook && actionButton.id === 'btn-get'} inlineCommandParts={displayParts} showFavorite={false} glowDelay="0s" />);
                    })}
                    <button
                        type="button"
                        className="inline-action-settings"
                        aria-label="Open inline action settings"
                        title="Open inline action settings"
                        onPointerDown={(event) => event.stopPropagation()}
                        onClick={openInlineSettings}
                    >
                        <Settings size={15} />
                    </button>
                </div>
            );
        }

        // Inline entity actions are grouped by the traits that provide them.
        if (isInlineMenu) {
            const actionButtons = inlineMenuButtons.filter(button => {
                if (seenCommands.has(button.command)) return false;
                const isValid = isButtonValidForEntity(button, popoverState.entityId || '', categoryId, filterDeps, safeSetId, popoverState.context);
                if (!isValid || !resolvedTraitButtonIds.has(button.id)) return false;
                seenCommands.add(button.command);
                return true;
            });
            seenCommandsSize = actionButtons.length;
            const manipulationButtons = actionButtons.filter(button =>
                !isInformationButton(button) || /^(?:whois|examine)(?:\s|$)/i.test(button.command)
            );
            const groupedCommands = new Set<string>();
            const lookTraitKey = sectionDefs.some(section => section.key === 'trait-examine')
                ? 'trait-examine'
                : sectionDefs.some(section => section.key === 'trait-observable')
                    ? 'trait-observable'
                    : containerLookTraitKey;
            const actionGroups = sectionDefs.map(section => {
                const sectionButtons = manipulationButtons.filter(button =>
                    section.buttonIds.includes(button.id) && !groupedCommands.has(button.command)
                    && !(hasContainerLook && isContainerLookInButton(button))
                );
                sectionButtons.forEach(button => groupedCommands.add(button.command));
                const inspectionCommands: Array<'look' | 'consider'> = [];
                if ((canObserve || hasContainerLook) && targetContext && section.key === lookTraitKey) inspectionCommands.push('look');
                if (canObserve && targetContext && section.key === 'trait-consider') inspectionCommands.push('consider');
                return { section, buttons: sectionButtons, inspectionCommands };
            }).filter(group => group.buttons.length > 0 || group.inspectionCommands.length > 0)
                .sort((left, right) => {
                    const priority = (key: string) => key === lookTraitKey ? 0 : key === 'trait-consider' ? 1 : 2;
                    return priority(left.section.key) - priority(right.section.key);
                });
            return (
                <InlineActionDeck
                    key={`${popoverState.entityId || ''}:${targetContext || ''}`}
                    groups={actionGroups}
                    requestInspection={(kind, lookIn) => requestInspection(kind,
                        lookIn && targetContext ? `look in ${targetContext}` : undefined)}
                    lookInAvailable={hasContainerLook}
                    lookInSelected={lookInSelected}
                    onToggleLookIn={toggleLookIn}
                    targetContext={targetContext || undefined}
                    renderButton={(button, displayParts) => renderContainerGet(button, (actionButton, actionDisplayParts) => (
                        <PopoverActionButton
                            key={actionButton.id}
                            button={actionButton}
                            {...props}
                            toggleFavorite={toggleFavorite}
                            onRequestWhois={requestWhois}
                            onRequestRoomReport={requestRoomReport}
                            onRequestExamine={requestInlineExamine}
                            compact
                            terminal
                            inlineCommandOnly
                            inlineCommandParts={actionDisplayParts}
                            glowDelay="0s"
                        />
                    ), displayParts)}
                />
            );
        }

        const favoritedButtons = buttons.filter(b => {
            const isValid = isButtonValidForEntity(b, popoverState.entityId || '', categoryId, filterDeps, safeSetId, popoverState.context);
            if (!isValid) return false;
            return resolvedTraitButtonIds.has(b.id) && favorites.includes(b.command);
        });

        const rendered = (
            <>
                {isInlineMenu ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'max-content 1fr', padding: '2px 0' }}>
                        {favoritedButtons.length > 0 && (<>
                            <div style={{ fontSize: '0.58rem', opacity: 0.6, textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700, color: '#ffd700', padding: '5px 8px 5px 8px', textAlign: 'right', borderRight: '1px solid rgba(255,255,255,0.12)', alignSelf: 'flex-start' }}>★ Favs</div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', padding: '4px 8px', alignSelf: 'flex-start' }}>
                                {favoritedButtons.map(b => <PopoverActionButton key={b.id} button={b} {...props} toggleFavorite={toggleFavorite} onRequestWhois={requestWhois} onRequestRoomReport={requestRoomReport} compact glowDelay="0s" />)}
                            </div>
                        </>)}
                        {(() => {
                            let rowIndex = favoritedButtons.length > 0 ? 1 : 0;
                            return sectionDefs.map((section) => {
                            const sectionButtons = buttons.filter(b => {
                                if (!section.buttonIds.includes(b.id) || favorites.includes(b.command) || seenCommands.has(b.command)) return false;
                                const isValid = isButtonValidForEntity(b, popoverState.entityId || '', categoryId, filterDeps, safeSetId, popoverState.context);
                                if (isValid) seenCommands.add(b.command);
                                return isValid;
                            });
                            if (sectionButtons.length === 0 && section.key !== 'trait-consider') return null;
                            const delay = `${(rowIndex++) * 0.3}s`;
                            return (<React.Fragment key={section.key}>
                                <div style={{ fontSize: '0.58rem', opacity: 0.4, textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700, color: 'var(--accent)', padding: '5px 8px 5px 8px', textAlign: 'right', borderRight: '1px solid rgba(255,255,255,0.12)', alignSelf: 'flex-start' }}>
                                    {section.label}
                                </div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', padding: '4px 8px', alignSelf: 'flex-start', width: '100%', alignItems: 'center' }}>
                                    {sectionButtons.map(b => <PopoverActionButton key={b.id} button={b} {...props} toggleFavorite={toggleFavorite} onRequestWhois={requestWhois} onRequestRoomReport={requestRoomReport} handleTabClick={handleTabClick} setGearTab={setGearTab} compact glowDelay={delay} />)}
                                    {section.key === 'trait-consider' && ['cat-npc', 'cat-enemy', 'cat-neutral', 'cat-ally'].includes(categoryId) && (
                                        <button
                                            className="popover-action-chip fight-btn"
                                            onPointerDown={(e) => e.stopPropagation()}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                triggerHaptic?.(30);
                                                const target = sanitizeGameTarget(popoverState.context || '');
                                                executeCommand(`kill ${target}`, false, false);
                                                setPopoverState(null);
                                            }}
                                            style={{
                                                marginLeft: 'auto',
                                                background: 'linear-gradient(180deg, rgba(220, 38, 38, 0.45), rgba(153, 27, 27, 0.35))',
                                                borderColor: 'rgba(239, 68, 68, 0.6)',
                                                color: '#fee2e2',
                                                fontWeight: 800,
                                                fontSize: '0.78rem',
                                                padding: '4px 10px',
                                                borderRadius: '4px',
                                                border: '1px solid rgba(239, 68, 68, 0.6)',
                                                cursor: 'pointer',
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '3px',
                                                boxShadow: '0 0 8px rgba(220, 38, 38, 0.35)',
                                                userSelect: 'none',
                                                textTransform: 'uppercase',
                                                letterSpacing: '0.5px'
                                            }}
                                        >
                                            ⚔ Fight
                                        </button>
                                    )}
                                </div>
                            </React.Fragment>);
                        })})()}
                    </div>
                ) : (
                    buttons.filter(b => b.setId === safeSetId && !favorites.includes(b.command)).map(b => {
                        seenCommands.add(b.command);
                        return <PopoverActionButton key={b.id} button={b} {...props} toggleFavorite={toggleFavorite} onRequestWhois={requestWhois} onRequestRoomReport={requestRoomReport} handleTabClick={handleTabClick} setGearTab={setGearTab} />;
                    })
                )}
            </>
        );

        seenCommandsSize = seenCommands.size + favoritedButtons.length;
        return rendered;
    };

    // --- Special Cases ---

    const headerContext = categoryAxes.isCharacter ? targetContext : popoverState.context;
    const cleanHeaderContext = headerContext ? stripAnsiCodes(headerContext) : null;
    const cleanDisplayName = popoverState.displayName
        ? stripAnsiCodes(popoverState.displayName)
        : (entity?.name ? stripAnsiCodes(entity.name) : cleanHeaderContext);
    const cleanKeyword = popoverState.keyword
        ? stripAnsiCodes(popoverState.keyword)
        : cleanHeaderContext;
    const shouldShowKeyword = !!(
        cleanDisplayName &&
        cleanKeyword &&
        cleanDisplayName.toLowerCase() !== cleanKeyword.toLowerCase()
    );
    const stopKeywordEvent = (event: React.SyntheticEvent) => {
        event.stopPropagation();
    };

    const editKeyword = (event: React.MouseEvent | React.KeyboardEvent) => {
        stopKeywordEvent(event);
        if (!openKeywordEdit || !popoverState.context) return;
        triggerHaptic?.(20);
        openKeywordEdit(popoverState.context, cleanDisplayName || popoverState.context);
        setPopoverState(null);
    };

    const renderHeaderSubtitle = () => {
        if (popoverState.executeAndAssign) return 'select action to fire and remap button';
        return (
            <>
                {shouldShowKeyword && (
                    <button
                        type="button"
                        data-keyword-editor="true"
                        aria-label={`Edit command keyword for ${cleanDisplayName || popoverState.context}`}
                        onPointerDown={editKeyword}
                        onClick={editKeyword}
                        className="popover-keyword-edit"
                    >
                        ({cleanKeyword} <Pencil size={10} style={{ opacity: 0.8 }} />)
                    </button>
                )}
            </>
        );
    };

    const isParleyType = popoverState.type === 'select-parley-command' || popoverState.type === 'select-parley-target';
    const isAccountType = popoverState.type === 'account-character' || popoverState.type === 'account-stat-edit';
    const CategoryIcon = !isSetManager ? resolveEntityCategoryIcon(categoryId, resolvedTraitIds) : null;

    return (
        <div
            ref={menuRootRef}
            className={`standard-menu-popover${isCompactInline ? ' inline-action-compact' : ''}${isInlineMenu && !isCompactInline ? ' terminal-inline-popover' : ''}`}
            onPointerDownCapture={event => {
                const input = document.querySelector('.input-field');
                const target = event.target;
                const targetIsEditor = target instanceof Element && !!target.closest('input, textarea, select, [contenteditable="true"]');
                if (input && document.activeElement === input && !targetIsEditor) event.preventDefault();
            }}
            style={{ '--accent': themeColor || 'var(--accent)', '--set-accent': themeColor || 'var(--accent)' } as any}
        >
            {!isParleyType && !isAccountType && !isCompactInline && (
                <div className="popover-header" onPointerDown={(e) => { e.stopPropagation(); }} style={{ cursor: !isSetManager && !isInlineMenu ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color, rgba(255, 255, 255, 0.1))', marginBottom: '3px', paddingBottom: '3px', color: 'var(--accent)', fontWeight: 'bold', textTransform: 'none' }} onClick={(event) => { if (event.target instanceof HTMLElement && event.target.closest('[data-keyword-editor="true"]')) return; if (!isInlineMenu && !isSetManager) { triggerHaptic?.(20); setPopoverState({ ...popoverState, setId: 'setmanager' }); } }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: isInlineMenu ? 'visible' : 'hidden', flex: 1 }}>
                        {CategoryIcon && <CategoryIcon className="popover-category-icon" size={16} style={{ flexShrink: 0, opacity: 0.8 }} />}
                        <div style={{ display: 'flex', flexDirection: 'column', overflow: isInlineMenu ? 'visible' : 'hidden', flex: 1 }}>
                            {isInlineMenu ? (
                                <span className="inline-action-target-title">
                                    {cleanDisplayName || cleanHeaderContext || formatSetLabel(safeSetId).toUpperCase()}
                                </span>
                            ) : (
                                <span style={{ fontSize: '0.78rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {isSetManager ? 'Main Menu' : (cleanDisplayName ? cleanDisplayName : (popoverState.direction ? `${formatSetLabel(safeSetId).toUpperCase()} (${popoverState.direction.toUpperCase()})` : formatSetLabel(safeSetId).toUpperCase()))}
                                </span>
                            )}
                            <span style={{ fontSize: '0.58rem', opacity: 0.58, fontWeight: 'normal', marginTop: '2px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>{renderHeaderSubtitle()}</span>
                        </div>
                    </div>
                    {isInlineMenu && <div className="terminal-inline-header-actions">
                        <span className="terminal-inline-category">{categoryAxes.family === 'object' ? 'item' : categoryAxes.family === 'character' ? 'character' : getInlineCategoryLabel(categoryId).toLowerCase()}</span>
                        <button type="button" className="terminal-header-trait" onPointerDown={event => event.stopPropagation()} onClick={event => { event.stopPropagation(); setIsChoosingCategory(!isChoosingCategory); }}>trait</button>
                    </div>}
                </div>
            )}

            {!isCompactInline && isChoosingCategory && setCustomTraits && (
                <TraitToggleSection popoverState={popoverState} customTraits={customTraits || []} setCustomTraits={setCustomTraits} activeTraits={resolvedTraitIds} defaultTraitIds={defaultTraitIds} triggerHaptic={triggerHaptic} addMessage={addMessage} refreshLogHighlights={refreshLogHighlights} characterInfo={characterInfo} />
            )}

            {isSetManager ? (
                availableSets.map(setName => <div key={setName} className="popover-item" data-menu-item="true" data-is-menu="true" onPointerDown={(e) => { e.stopPropagation(); }} onClick={() => setPopoverState({ ...popoverState, setId: setName })}>{setName}</div>)
            ) : (
                <>
                    {popoverState.type === 'menu' || !popoverState.type ? (
                        <>
                            {!isTacticalSet && popoverState.assignSourceId && (
                                <div className="popover-item" data-menu-item="true" onPointerDown={(e) => { e.stopPropagation(); }} style={{ borderBottom: '1px solid var(--border-color, rgba(255, 255, 255, 0.1))', color: 'var(--accent)', fontWeight: 'bold' }} onClick={() => { const setName = safeSetId; const dir = popoverState.assignSwipeDir; setButtons(prev => prev.map(b => b.id === popoverState.assignSourceId ? (dir ? { ...b, swipeCommands: { ...b.swipeCommands, [dir]: setName }, swipeActionTypes: { ...b.swipeActionTypes, [dir]: 'menu' } } : { ...b, command: setName, label: setName, actionType: 'menu' }) : b)); setPopoverState(null); addMessage('system', `Assigned sub-menu '${setName}'${dir ? ` to swipe ${dir}` : ''}.`); }}>Assign {safeSetId.toUpperCase()} as Menu</div>
                            )}
                            {!isCompactInline && !isInlineMenu && (
                                <CapturedDetailsCard
                                    examineLines={popoverState.capturedExamineLines}
                                    examineMode={popoverState.examineMode}
                                    considerLines={popoverState.capturedConsiderLines}
                                    isCapturingExamine={popoverState.isCapturingExamine}
                                    isCapturingConsider={popoverState.isCapturingConsider}
                                    whoisLines={popoverState.capturedWhoisLines}
                                    isCapturingWhois={popoverState.isCapturingWhois}
                                    whoLines={popoverState.capturedWhoLines}
                                    isCapturingWho={popoverState.isCapturingWho}
                                    whereLines={popoverState.capturedWhereLines}
                                    isCapturingWhere={popoverState.isCapturingWhere}
                                    roomActionLines={popoverState.capturedRoomActionLines}
                                    roomActionKind={popoverState.roomActionKind}
                                    isCapturingRoomAction={popoverState.isCapturingRoomAction}
                                />
                            )}
                            {isInlineMenu && !isCompactInline && hasCapturedDetails && (
                                <CapturedDetailsSidePanel
                                    examineLines={popoverState.capturedExamineLines}
                                    examineMode={popoverState.examineMode}
                                    considerLines={popoverState.capturedConsiderLines}
                                    isCapturingExamine={popoverState.isCapturingExamine}
                                    isCapturingConsider={popoverState.isCapturingConsider}
                                    whoisLines={popoverState.capturedWhoisLines}
                                    isCapturingWhois={popoverState.isCapturingWhois}
                                    whoLines={popoverState.capturedWhoLines}
                                    isCapturingWho={popoverState.isCapturingWho}
                                    whereLines={popoverState.capturedWhereLines}
                                    isCapturingWhere={popoverState.isCapturingWhere}
                                    roomActionLines={popoverState.capturedRoomActionLines}
                                    roomActionKind={popoverState.roomActionKind}
                                    isCapturingRoomAction={popoverState.isCapturingRoomAction}
                                    onClose={closeCapturedDetails}
                                />
                            )}
                            {isInlineMenu && !isCompactInline ? (
                                <div className="inline-command-target-layout">
                                    <section className="inline-command-pane" aria-label={`Commands for ${cleanDisplayName || targetContext || 'target'}`}>
                                        {renderActionButtons()}
                                        {seenCommandsSize === 0 && !/sack|satchel|pouch|pack|quiver/i.test(popoverState.context || '') && popoverState.setId !== 'npc-shopkeeper' && (
                                            <div className="popover-empty inline-command-empty">No commands available</div>
                                        )}
                                        {openKeywordEdit && popoverState.context && (
                                            <div className="popover-item inline-keyword-edit" data-menu-item="true" onPointerDown={(e) => { e.stopPropagation(); }} onClick={() => { triggerHaptic?.(20); openKeywordEdit(popoverState.context!, cleanDisplayName || popoverState.context!); setPopoverState(null); }}>✏ Edit keyword "{stripAnsiCodes(popoverState.context)}"</div>
                                        )}
                                    </section>
                                    <RoomEntityPicker
                                        entries={roomEntityEntries}
                                        currentEntityId={popoverState.entityId}
                                        currentContext={popoverState.context}
                                        currentCategory={categoryId}
                                        currentTarget={currentTarget}
                                        onSelect={selectRoomEntity}
                                    />
                                </div>
                            ) : (
                                <>
                                    {renderActionButtons()}
                                    {!isCompactInline && seenCommandsSize === 0 && isInlineMenu && !/sack|satchel|pouch|pack|quiver/i.test(popoverState.context || '') && popoverState.setId !== 'npc-shopkeeper' && (
                                        <div className="popover-empty" style={{ padding: '8px', textAlign: 'center', opacity: 0.5, fontSize: '0.75rem' }}>No buttons available for this category</div>
                                    )}
                                    {!isCompactInline && openKeywordEdit && isInlineMenu && popoverState.context && (
                                        <div className="popover-item" data-menu-item="true" onPointerDown={(e) => { e.stopPropagation(); }} style={{ borderTop: '1px solid rgba(255,255,255,0.07)', marginTop: 4, opacity: 0.6, fontSize: '0.82rem' }} onClick={() => { triggerHaptic?.(20); openKeywordEdit(popoverState.context!, cleanDisplayName || popoverState.context!); setPopoverState(null); }}>✏ Edit keyword "{stripAnsiCodes(popoverState.context)}"</div>
                                    )}
                                </>
                            )}
                        </>
                    ) : (popoverState.type === 'select-parley-command' || popoverState.type === 'select-parley-target') ? (
                        <ParleySection type={popoverState.type === 'select-parley-command' ? 'command' : 'target'} parley={parley} setParley={setParley} favorites={favorites} setFavorites={setFavorites} whoList={whoList} triggerHaptic={triggerHaptic} setPopoverState={setPopoverState} />
                    ) : popoverState.type === 'account-character' ? (
                        <AccountCharacterCard character={accountCharacters?.find(c => c.name === (popoverState.accountCharName || popoverState.context)) || { name: popoverState.accountCharName || popoverState.context || '', race: '', level: '', logon: '', area: '', rent: '' }} accountState={accountState} setAccountState={setAccountState} executeCommand={executeCommand} triggerHaptic={triggerHaptic} onClose={() => setPopoverState(null)} />
                    ) : popoverState.type === 'account-stat-edit' && accountState ? (
                        <AccountStatPopover accountState={accountState} executeCommand={executeCommand} triggerHaptic={triggerHaptic} onClose={() => setPopoverState(null)} />
                    ) : null}
                </>
            )}
        </div>
    );
};
