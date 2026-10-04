/** @file GearPanel.tsx — Terminal equipment and inventory docked panel. */
import React, { useEffect, useState } from 'react';
import { ArrowLeft, Backpack, ChevronDown, ChevronRight, RefreshCw, ShoppingBag, X } from 'lucide-react';
import { DrawerResizeHandle } from './Drawers/DrawerResizeHandle';
import { useGearPanelStore } from '../stores/useGearPanelStore';
import { useSettingsStore } from '../stores/useSettingsStore';
import { getInlineGlowColor } from '../utils/inlineActionModel';
import { getObjectTraits } from '../objects/objectTargetModel';
import { useGearPanel } from '../hooks/useGearPanel';
import { useGearSelection } from '../hooks/useGearSelection';
import { useObjectDragCommands } from '../hooks/useObjectDragCommands';
import { useUIStore } from '../stores/useUIStore';
import { toGearRow, visibleContainerLine } from '../utils/gearPanelUtils';
import { classifyItemTier } from '../utils/itemTier';
import { getShopRoomLabel } from '../utils/shopRoomUtils';
import { useMobileGearSwipe } from '../hooks/useMobileGearSwipe';
import { useMapper } from '../context/MapperContext';
import type { DrawerLine, GearRow, GearSelectionAction, GearSelectionItem } from '../types';
import { ShopPanel } from './Shop/ShopPanel';
import { GearContainerContents } from './GearContainerContents';
import { GearSelectionCheckbox } from './GearSelectionCheckbox';
import { GearSelectionActions } from './GearSelectionActions';
import { getGearSelectionCommands, getGearScopeKey, toObjectDragItem } from '../utils/gearSelectionUtils';
import './GearPanel.css';

interface GearPanelProps { style?: React.CSSProperties }
type Section = 'worn' | 'carried' | 'room';
type SelectedGear = { id: string; row: GearRow; section: Section; parentNoun?: string };
// --- Render Section ---
const GearPanel: React.FC<GearPanelProps> = ({ style }) => {
    const setIsOpen = useGearPanelStore(state => state.setIsOpen);
    const mapper = useMapper();
    const inlineSettings = useSettingsStore();
    const gear = useGearPanel();
    const gearSwipe = useMobileGearSwipe(gear.viewport.isMobile, gear.triggerHaptic);
    const gearSelection = useGearSelection();
    const dragState = useUIStore(state => state.objectDragState);
    const isShopOpen = useUIStore(state => state.isShopOpen);
    const setIsShopOpen = useUIStore(state => state.setIsShopOpen);
    const setShopkeeperName = useUIStore(state => state.setShopkeeperName);
    const shopRoomLabel = getShopRoomLabel(
        mapper.currentRoomId,
        mapper.rooms,
        mapper.preloadedCoordsRef.current?.[String(mapper.currentRoomId || '').replace(/^m_/, '')]
    );
    const isShopRoom = Boolean(shopRoomLabel);
    const startObjectDrag = useObjectDragCommands({
        executeCommand: gear.executeCommand,
        triggerHaptic: gear.triggerHaptic,
        mouseDragOnMove: true,
        touchDragOnMove: true,
        touchDragOnHorizontalMove: false,
        onDrop: (source, target) => {
            const containerId = target.type === 'container' ? target.containerId : source.parentContainerId;
            if (containerId) gear.refreshContainer(containerId);
            if (source.selectedItems?.length) gearSelection.clear();
        },
    });
    const [expanded, setExpanded] = useState({ worn: true, carried: true, room: true });
    const [selected, setSelected] = useState<SelectedGear | null>(null);
    const [showRecipients, setShowRecipients] = useState(false);
    const [activeView, setActiveView] = useState<'gear' | 'shop'>('gear');

    useEffect(() => {
        setActiveView(isShopOpen ? 'shop' : 'gear');
    }, [isShopOpen]);

    const choose = (row: GearRow, section: Section, id: string, parentNoun?: string) => {
        gear.triggerHaptic?.(10);
        gearSelection.clear();
        setShowRecipients(false);
        setSelected(current => current?.id === id ? null : { id, row, section, parentNoun });
    };

    const renderRow = (row: GearRow, section: Section, source: DrawerLine[], id: string, parentNoun?: string, parentId?: string, levelItems: GearSelectionItem[] = []) => {
        const nested = Boolean(parentNoun);
        const selectionItem: GearSelectionItem = { id, row, section, parentNoun, parentId };
        const selectionScope = getGearScopeKey(section, parentId);
        const selectedForDrag = gearSelection.selection?.scopeKey === selectionScope && gearSelection.isSelected(id);
        const category = nested ? 'cat-container-item' : section === 'worn'
            ? 'cat-worn-object' : section === 'room' ? 'cat-room-object' : 'cat-inventory-object';
        const itemColor = getInlineGlowColor(category, inlineSettings.inlineCategories,
            { object: inlineSettings.objectColor }, inlineSettings.theme) || inlineSettings.objectColor;
        const itemTier = classifyItemTier(row.line.text);
        const conditionLabel = itemTier.stateLabel || row.condition.replace(/[()]/g, '').trim();
        const isExpanded = gear.expandedContainers.has(row.line.id);
        const contents = gear.containerContents[row.line.id]?.filter(visibleContainerLine) ?? [];
        return <React.Fragment key={id}>
            <div className={`gear-item-row${selected?.id === id || gearSelection.isSelected(id) ? ' is-selected' : ''}${nested ? ' is-nested' : ''}${row.isContainer ? ' has-container-toggle' : ''}${dragState?.target?.type === 'container' && dragState.target.containerId === row.line.id ? ' is-drop-target' : ''}`}
                data-object-drop-container={row.isContainer ? row.line.id : undefined}
                data-object-drop-noun={row.isContainer ? row.noun : undefined}
                data-object-drop-label={row.isContainer ? row.name : undefined}>
                <button className={`gear-item-select${gear.viewport.isMobile ? ' inline-btn' : ''}`} type="button"
                    onClick={() => choose(row, section, id, parentNoun)}
                    data-id={row.line.entityId || row.line.stableId || row.line.id}
                    data-cmd={nested ? 'inline-container-item' : row.line.cmd || category}
                    data-context={row.noun} data-category={category} data-action="menu"
                    data-parent-noun={parentNoun} data-menu-display="list"
                    onPointerDown={event => startObjectDrag(event, {
                        row: nested ? 'inventory' : section === 'carried' ? 'inventory' : section,
                        noun: row.noun, label: row.name, itemId: row.line.id,
                        parentContainerNoun: parentNoun,
                        parentContainerId: parentId,
                        selectedItems: selectedForDrag ? gearSelection.items.map(toObjectDragItem) : undefined,
                        sourceLevelItemIds: selectedForDrag ? gearSelection.selection?.sourceLevelItemIds : undefined,
                    })}
                    title={row.noun} aria-label={`Select ${row.name}`}>
                    {!nested && section === 'worn' && <span className="gear-slot">{row.slotLabel}</span>}
                    <span className="gear-item-text">
                        {row.article && <span className="gear-article">{row.article} </span>}
                        <span
                            className={`gear-item-name${itemTier.tier ? ` inline-item-tier-${itemTier.tier}` : ''}`}
                            style={itemTier.tier ? undefined : { color: itemColor }}
                        >{row.name}</span>
                        {row.condition && <span
                            className={`gear-condition-indicator${itemTier.state ? ` item-state-${itemTier.state}` : ' is-unknown'}`}
                            role="img"
                            aria-label={`Condition: ${conditionLabel}`}
                            title={`Condition: ${conditionLabel}`}
                        />}
                    </span>
                </button>
                {row.isContainer && <button className="gear-container-toggle" type="button"
                    onClick={() => gear.toggleContainer(row.line, source)}
                    aria-expanded={isExpanded} aria-label={`${isExpanded ? 'Close' : 'Open'} ${row.name}`}>
                    {isExpanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                </button>}
                <GearSelectionCheckbox checked={gearSelection.isSelected(id)}
                    disabled={gearSelection.isScopeLocked(section, parentId)} label={`Select ${row.name}`}
                    onChange={() => { setSelected(null); setShowRecipients(false); gearSelection.toggleItem(selectionItem, levelItems); }} />
            </div>
            {row.isContainer && isExpanded && <GearContainerContents container={row} keyPrefix={id} section={section}
                contents={contents} loaded={Boolean(gear.containerContents[row.line.id])}
                isScopeLocked={gearSelection.isScopeLocked(section, row.line.id)}
                getScopeCount={gearSelection.getScopeCount}
                onSelectAll={items => { setSelected(null); gearSelection.toggleLevel(section, row.line.id, row.noun, items); }}
                renderChild={(item, levelItems) => renderRow(item.row, section, contents, item.id, row.noun, row.line.id, levelItems)} />}
        </React.Fragment>;
    };
    const renderSection = (section: Section) => {
        const rows = section === 'worn' ? gear.worn : section === 'room' ? gear.nearby : gear.carried;
        const source = section === 'worn' ? gear.displayEqLines
            : section === 'room' ? gear.roomItemLines : gear.displayInventoryLines;
        const sectionName = section === 'worn' ? 'worn' : section === 'room' ? 'nearby' : 'inventory';
        const dropRow = section === 'carried' ? 'inventory' : section;
        const levelItems: GearSelectionItem[] = rows.map((row, index) => ({
            id: `${section}:${row.line.id}:${index}`, row, section
        }));
        const selectedCount = gearSelection.getScopeCount(levelItems);
        return <section className={`gear-section${expanded[section] ? '' : ' is-collapsed'}`} key={section}>
            <div className={`gear-section-heading${dragState?.target?.type === 'row' && dragState.target.row === dropRow ? ' is-drop-target' : ''}`}
                data-object-drop-row={dropRow}>
                <button className="gear-section-toggle" type="button"
                    onClick={() => setExpanded(previous => ({ ...previous, [section]: !previous[section] }))}
                    aria-expanded={expanded[section]}>
                    {expanded[section] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    <span>{sectionName} ({rows.length})</span>
                </button>
                <div className="gear-section-tools">
                    {section !== 'room' && <button className="gear-refresh" type="button" onClick={() => gear.refresh(section)}
                        title={`Refresh ${section === 'worn' ? 'equipment' : 'inventory'}`} aria-label={`Refresh ${sectionName}`}>
                        <RefreshCw size={13} />
                    </button>}
                    {rows.length > 0 && <GearSelectionCheckbox checked={selectedCount === rows.length}
                        mixed={selectedCount > 0 && selectedCount < rows.length}
                        size="large" visibleLabel="select all"
                        disabled={gearSelection.isScopeLocked(section)} label={`Select all ${sectionName}`}
                        onChange={() => { setSelected(null); gearSelection.toggleLevel(section, undefined, undefined, levelItems); }} />}
                </div>
            </div>
            {expanded[section] && <div className={`gear-section-body${dragState?.target?.type === 'row' && dragState.target.row === dropRow ? ' is-drop-target' : ''}`}
                data-object-drop-row={dropRow}>
                {rows.length ? rows.map((row, index) => renderRow(row, section, source, `${section}:${row.line.id}:${index}`, undefined, undefined, levelItems))
                    : <span className="gear-empty">{section === 'worn' ? 'Nothing equipped.' : section === 'room' ? 'No items nearby.' : 'Nothing carried.'}</span>}
            </div>}
        </section>;
    };
    const runAction = (command: string) => {
        gear.executeCommand(command);
        gear.triggerHaptic?.(10);
    };
    const runSelectionAction = (action: GearSelectionAction, destinationNoun?: string) => {
        const selection = gearSelection.selection;
        if (!selection) return;
        const commands = getGearSelectionCommands(selection, action, destinationNoun);
        if (!commands.length) return;
        gear.executeCommand(commands.join('; '), false, false, false, false, { fromUi: true });
        gear.triggerHaptic?.(10);
        gearSelection.clear();
        setSelected(null);
    };
    const putTargets = [...gear.carried, ...gear.worn, ...gear.nearby].filter(row => row.isContainer
        && !gearSelection.items.some(item => item.row.line.id === row.line.id));
    const isCarriedWeapon = selected?.section === 'carried'
        && getObjectTraits(selected.row.line).includes('trait-weapon');

    return <aside className="docked-panel gear-panel" style={style} aria-label="Gear and shop panel"
        onPointerDown={gearSwipe.onGearPointerDown}
        onPointerUp={gearSwipe.onGearPointerUp}
        onPointerCancel={gearSwipe.onPointerCancel}
        onTouchStartCapture={gearSwipe.onGearTouchStartCapture}
        onTouchEndCapture={gearSwipe.onGearTouchEndCapture}
        onTouchCancelCapture={gearSwipe.onTouchCancel}
        onClickCapture={gearSwipe.onClickCapture}>
        {!gear.viewport.isMobile && <DrawerResizeHandle handleType="left" widthVar="--desktop-gear-width" minWidth={18} maxWidth={60} />}
        <header className="gear-panel-header">
            <div className="gear-panel-tabs" role="tablist" aria-label="Panel">
                <button type="button" role="tab" aria-selected={activeView === 'gear'}
                    className={activeView === 'gear' ? 'is-active' : ''} onClick={() => setActiveView('gear')}>
                    <Backpack size={14} /> Gear
                </button>
                <button type="button" role="tab" aria-selected={activeView === 'shop'} disabled={!isShopRoom && !isShopOpen}
                    className={activeView === 'shop' ? 'is-active' : ''} onClick={event => {
                        event.stopPropagation();
                        setActiveView('shop');
                        if (!isShopOpen) {
                            setShopkeeperName(null);
                            setIsShopOpen(true);
                            gear.executeCommand('list');
                            gear.triggerHaptic?.(10);
                        }
                    }}>
                    <ShoppingBag size={14} /> Shop
                </button>
            </div>
            <button type="button" onClick={() => { setIsShopOpen(false); setIsOpen(false); }} title="Close panel"
                aria-label="Close panel"><X size={15} /></button>
        </header>
        {isShopOpen && <ShopPanel embedded hidden={activeView !== 'shop'} />}
        {(activeView !== 'shop' || !isShopOpen) && <>
                <div className="gear-panel-body">{renderSection('worn')}{renderSection('carried')}{renderSection('room')}</div>
                {gearSelection.selection ? <GearSelectionActions key={gearSelection.selection.scopeKey} selection={gearSelection.selection}
                    containers={putTargets} onRun={runSelectionAction} onClear={gearSelection.clear} />
                    : selected && <div className="gear-actions" aria-label={`Actions for ${selected.row.name}`}>
            {showRecipients ? <>
                <div className="gear-give-heading">
                    <button type="button" className="gear-give-back" onClick={() => setShowRecipients(false)} aria-label="Back to item actions">
                        <ArrowLeft size={14} /> Back
                    </button>
                    <span>give {selected.row.name} to…</span>
                </div>
                {gear.recipients.length ? <div className="gear-recipient-list">
                    {gear.recipients.map(recipient => {
                        const recipientColor = getInlineGlowColor(
                            recipient.kind === 'player' ? 'cat-ally' : 'cat-npc',
                            inlineSettings.inlineCategories,
                            {
                                player: inlineSettings.playerColor,
                                ally: inlineSettings.playerColor,
                                npc: inlineSettings.npcColor,
                            },
                            inlineSettings.theme
                        );
                        return <button key={recipient.id} type="button"
                            onClick={() => {
                                runAction(`give ${selected.row.noun} ${recipient.noun}`);
                                setShowRecipients(false);
                                setSelected(null);
                            }}>
                            <span style={recipientColor ? { color: recipientColor } : undefined}>{recipient.label}</span>
                            <small>{recipient.kind}</small>
                        </button>;
                    })}
                </div> : <span className="gear-empty">No eligible room entities.</span>}
            </> : <>
                <span className="gear-actions-label">&gt; {selected.row.name}</span>
                <div className="gear-action-buttons">
                    {selected.section === 'carried' && !selected.parentNoun && getObjectTraits(selected.row.line).includes('trait-fluid-container')
                        && <button type="button" onClick={() => runAction(`drink ${selected.row.noun}`)}>drink</button>}
                    {selected.section === 'carried' && !selected.parentNoun && getObjectTraits(selected.row.line).includes('trait-food')
                        && <button type="button" onClick={() => runAction(`eat ${selected.row.noun}`)}>eat</button>}
                    {selected.section === 'carried' && !selected.parentNoun && getObjectTraits(selected.row.line).includes('trait-food')
                        && /\b(?:raw\s+)?(?:meat|mutton)\b/i.test(selected.row.name)
                        && !/\b(?:cooked|roasted|fried)\b/i.test(selected.row.name)
                        && <button type="button" onClick={() => runAction(`cook ${selected.row.noun}`)}>cook</button>}
                    {selected.section === 'carried' && !selected.parentNoun && getObjectTraits(selected.row.line).includes('trait-herb')
                        && <button type="button" onClick={() => runAction(`crush ${selected.row.noun}`)}>crush</button>}
                    {selected.parentNoun || selected.section === 'room'
                        ? <button type="button" onClick={() => runAction(selected.parentNoun
                            ? `get ${selected.row.noun} ${selected.parentNoun}` : `get ${selected.row.noun}`)}>get</button>
                        : <>
                            <button type="button" onClick={() => runAction(`${selected.section === 'worn' ? 'remove' : isCarriedWeapon ? 'wield' : 'wear'} ${selected.row.noun}`)}>
                                {selected.section === 'worn' ? 'remove' : isCarriedWeapon ? 'wield' : 'wear'}
                            </button>
                            {selected.section === 'carried' && !selected.parentNoun && <>
                                {isShopRoom && <>
                                    <button type="button" onClick={() => runAction(`sell ${selected.row.noun}`)}>sell</button>
                                    <button type="button" onClick={() => runAction(`mend ${selected.row.noun}`)}>mend</button>
                                </>}
                                <button type="button" onClick={() => { setShowRecipients(true); gear.triggerHaptic?.(10); }}>give…</button>
                                <button type="button" onClick={() => runAction(`drop ${selected.row.noun}`)}>drop</button>
                            </>}
                        </>}
                </div>
            </>}
                </div>}
            </>}
    </aside>;
};

export default React.memo(GearPanel);
