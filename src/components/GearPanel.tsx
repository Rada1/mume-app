/** @file GearPanel.tsx — Terminal equipment and inventory docked panel. */
import React, { useState } from 'react';
import { Backpack, ChevronDown, ChevronRight, RefreshCw, X } from 'lucide-react';
import { DrawerResizeHandle } from './Drawers/DrawerResizeHandle';
import { useGearPanelStore } from '../stores/useGearPanelStore';
import { useSettingsStore } from '../stores/useSettingsStore';
import { getInlineGlowColor } from '../utils/inlineActionModel';
import { useGearPanel } from '../hooks/useGearPanel';
import { useObjectDragCommands } from '../hooks/useObjectDragCommands';
import { useUIStore } from '../stores/useUIStore';
import { toGearRow, visibleContainerLine, type GearRow } from '../utils/gearPanelUtils';
import type { DrawerLine } from '../types';
import './GearPanel.css';

interface GearPanelProps { style?: React.CSSProperties }
type Section = 'worn' | 'carried';

// --- Render Section ---
const GearPanel: React.FC<GearPanelProps> = ({ style }) => {
    const setIsOpen = useGearPanelStore(state => state.setIsOpen);
    const inlineSettings = useSettingsStore();
    const gear = useGearPanel();
    const dragState = useUIStore(state => state.objectDragState);
    const startObjectDrag = useObjectDragCommands({
        executeCommand: gear.executeCommand,
        triggerHaptic: gear.triggerHaptic,
        mouseDragOnMove: true,
        onDrop: (source, target) => {
            const containerId = target.type === 'container' ? target.containerId : source.parentContainerId;
            if (containerId) gear.refreshContainer(containerId);
        },
    });
    const [expanded, setExpanded] = useState({ worn: true, carried: true });
    const [selected, setSelected] = useState<{ id: string; row: GearRow; section: Section; parentNoun?: string } | null>(null);

    const choose = (row: GearRow, section: Section, id: string, parentNoun?: string) => {
        gear.triggerHaptic?.(10);
        setSelected(current => current?.id === id ? null : { id, row, section, parentNoun });
    };

    const renderRow = (row: GearRow, section: Section, source: DrawerLine[], id: string, parentNoun?: string, parentId?: string) => {
        const nested = Boolean(parentNoun);
        const category = nested ? 'cat-container-item' : section === 'worn' ? 'cat-worn-object' : 'cat-inventory-object';
        const itemColor = getInlineGlowColor(category, inlineSettings.inlineCategories,
            { object: inlineSettings.objectColor }, inlineSettings.theme) || inlineSettings.objectColor;
        const isExpanded = gear.expandedContainers.has(row.line.id);
        const contents = gear.containerContents[row.line.id]?.filter(visibleContainerLine) ?? [];
        return <React.Fragment key={id}>
            <div className={`gear-item-row${selected?.id === id ? ' is-selected' : ''}${nested ? ' is-nested' : ''}${dragState?.target?.type === 'container' && dragState.target.containerId === row.line.id ? ' is-drop-target' : ''}`}
                data-object-drop-container={row.isContainer ? row.line.id : undefined}
                data-object-drop-noun={row.isContainer ? row.noun : undefined}
                data-object-drop-label={row.isContainer ? row.name : undefined}>
                <button className="gear-item-select" type="button" onClick={() => choose(row, section, id, parentNoun)}
                    onPointerDown={event => startObjectDrag(event, {
                        row: nested ? 'inventory' : section === 'worn' ? 'worn' : 'inventory',
                        noun: row.noun, label: row.name, itemId: row.line.id,
                        parentContainerNoun: parentNoun,
                        parentContainerId: parentId,
                    })}
                    title={row.noun} aria-label={`Select ${row.name}`}>
                    {!nested && section === 'worn' && <span className="gear-slot">{row.slot}</span>}
                    <span className="gear-item-text">
                        {row.article && <span className="gear-article">{row.article} </span>}
                        <span className="gear-item-name" style={{ color: itemColor }}>{row.name}</span>
                        {row.condition && <span className="gear-condition"> {row.condition}</span>}
                    </span>
                </button>
                {row.isContainer && <button className="gear-container-toggle" type="button"
                    onClick={() => gear.toggleContainer(row.line, source)}
                    aria-expanded={isExpanded} aria-label={`${isExpanded ? 'Close' : 'Open'} ${row.name}`}>
                    {isExpanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                </button>}
            </div>
            {row.isContainer && isExpanded && <div className="gear-container-contents"
                data-object-drop-container={row.line.id} data-object-drop-noun={row.noun} data-object-drop-label={row.name}>
                {contents.length ? contents.map((line, index) => {
                    const child = toGearRow(line);
                    if (child) return renderRow(child, section, contents, `${id}:${line.id}:${index}`, row.noun, row.line.id);
                    return <div className="gear-container-note" key={`${id}:note:${index}`}>{line.text}</div>;
                }) : <span className="gear-container-note">{gear.containerContents[row.line.id] ? 'empty' : 'looking inside...'}</span>}
            </div>}
        </React.Fragment>;
    };

    const renderSection = (section: Section) => {
        const rows = section === 'worn' ? gear.worn : gear.carried;
        const source = section === 'worn' ? gear.displayEqLines : gear.displayInventoryLines;
        return <section className="gear-section" key={section}>
            <div className={`gear-section-heading${dragState?.target?.type === 'row' && dragState.target.row === (section === 'worn' ? 'worn' : 'inventory') ? ' is-drop-target' : ''}`}
                data-object-drop-row={section === 'worn' ? 'worn' : 'inventory'}>
                <button className="gear-section-toggle" type="button"
                    onClick={() => setExpanded(previous => ({ ...previous, [section]: !previous[section] }))}
                    aria-expanded={expanded[section]}>
                    {expanded[section] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    <span>{section === 'worn' ? 'worn' : 'inventory'}</span>
                </button>
                <button className="gear-refresh" type="button" onClick={() => gear.refresh(section)}
                    title={`Refresh ${section === 'worn' ? 'equipment' : 'inventory'}`} aria-label={`Refresh ${section}`}>
                    <RefreshCw size={13} />
                </button>
            </div>
            {expanded[section] && <div className={`gear-section-body${dragState?.target?.type === 'row' && dragState.target.row === (section === 'worn' ? 'worn' : 'inventory') ? ' is-drop-target' : ''}`}
                data-object-drop-row={section === 'worn' ? 'worn' : 'inventory'}>
                {rows.length ? rows.map((row, index) => renderRow(row, section, source, `${section}:${row.line.id}:${index}`))
                    : <span className="gear-empty">{section === 'worn' ? 'Nothing equipped.' : 'Nothing carried.'}</span>}
            </div>}
        </section>;
    };

    const runAction = (command: string) => {
        gear.executeCommand(command);
        gear.triggerHaptic?.(10);
    };

    return <aside className="docked-panel gear-panel" style={style} aria-label="Equipment and inventory panel">
        {!gear.viewport.isMobile && <DrawerResizeHandle handleType="left" widthVar="--desktop-gear-width" minWidth={18} maxWidth={60} />}
        <header className="gear-panel-header">
            <span><Backpack size={14} /> equipment / inventory</span>
            <button type="button" onClick={() => setIsOpen(false)} title="Close equipment and inventory"
                aria-label="Close equipment and inventory"><X size={15} /></button>
        </header>
        <div className="gear-panel-body">{renderSection('worn')}{renderSection('carried')}</div>
        {selected && <div className="gear-actions" aria-label={`Actions for ${selected.row.name}`}>
            <span className="gear-actions-label">&gt; {selected.row.name}</span>
            <div className="gear-action-buttons">
                <button type="button" onClick={() => runAction(`examine ${selected.row.noun}`)}>examine</button>
                {selected.parentNoun
                    ? <button type="button" onClick={() => runAction(`get ${selected.row.noun} ${selected.parentNoun}`)}>get</button>
                    : <>
                        <button type="button" onClick={() => runAction(`${selected.section === 'worn' ? 'remove' : 'wear'} ${selected.row.noun}`)}>
                            {selected.section === 'worn' ? 'remove' : 'wear'}
                        </button>
                        {selected.section === 'carried' && <button type="button" onClick={() => runAction(`drop ${selected.row.noun}`)}>drop</button>}
                    </>}
            </div>
        </div>}
    </aside>;
};

export default React.memo(GearPanel);
