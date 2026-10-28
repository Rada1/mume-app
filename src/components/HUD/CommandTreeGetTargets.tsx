/** @file CommandTreeGetTargets.tsx — Get room objects or items from a container/corpse. */
import React from 'react';
import { ChevronRight } from 'lucide-react';
import type { CustomButton } from '../../types';
import type { CommandActionTargetEntry } from '../../objects/commandActionTargetModel';
import type { useCommandTreeController } from '../../hooks/useCommandTreeController';
import { useCommandTreeGetFrom } from '../../hooks/useCommandTreeGetFrom';
import { getCommandActionTargetDisplayLabel } from '../../utils/commandTreeTargetSections';
import { CommandTreeAction } from './CommandTreeAction';
import { CommandTreeObjectTargetLabel } from './CommandTreeObjectTargetLabel';
import { CommandTreeCollapsibleSection } from './CommandTreeCollapsibleSection';
import { CommandTreeTargetHeader } from './CommandTreeTargetHeader';
import { useSecondaryTouchActivation } from '../../hooks/useSecondaryTouchActivation';
import { MobileCommandTargetSections } from './MobileCommandTargetSections';
import { heldTargetPreviewRef } from '../../utils/heldTargetPreview';
import { CommandTargetMenuContext } from '../../context/CommandTargetMenuContext';

// --- Render Section ---
export const CommandTreeGetTargets = ({controller, button, targets, heldMenu = false}: {
    controller: ReturnType<typeof useCommandTreeController>;
    button: CustomButton; targets: CommandActionTargetEntry[]; heldMenu?: boolean;
}) => {
    const getFrom = useCommandTreeGetFrom(controller);
    const touchActivation = useSecondaryTouchActivation();
    const flatTargets = React.useContext(CommandTargetMenuContext);
    const isMobile = controller.game.viewport?.isMobile === true || flatTargets;
    const branchClass = `command-tree-branch terminal-inline-popover${heldMenu ? ' command-tree-held-command-targets' : ''}`;
    const contentsIdPrefix = React.useId();
    const roomContainers = getFrom.fromSections.find(section => section.meta === 'room')?.targets || [];
    const roomContainerIds = new Set(roomContainers.flatMap(target => [target.objectId, target.containerId, target.key]).filter((id): id is string => Boolean(id)));
    const getRoomContainer = (entry: CommandActionTargetEntry) => {
        const matchingId = [entry.id, entry.gearRow?.line.id].find(id => id && roomContainerIds.has(id));
        if (matchingId) return roomContainers.find(target => [target.objectId, target.containerId, target.key].includes(matchingId));
        const entryKeywords = [entry.keyword, entry.context].map(value => value.replace(/^\d+\./, '').trim().toLowerCase());
        return roomContainers.find(target => entryKeywords.includes(target.value.replace(/^\d+\./, '').trim().toLowerCase()));
    };
    const targetState = (entry: CommandActionTargetEntry) => ({x: 0, y: 0, type: 'menu' as const,
        setId: entry.category, category: entry.category, context: entry.context, keyword: entry.keyword,
        displayName: entry.label, entityId: entry.id, parentNoun: entry.parentNoun});
    const renderContents = () => getFrom.loading ? <p className="command-tree-section-empty">Loading contents…</p>
        : getFrom.items.length ? getFrom.items.map(item => <button key={item.key} type="button" data-menu-item="true" className="command-tree-row"
            ref={heldTargetPreviewRef(() => getFrom.previewItem(item))}
            disabled={getFrom.disabled} title={item.label} onPointerEnter={event => { if (event.pointerType === 'mouse') getFrom.previewItem(item); }}
            onFocus={event => { if (event.currentTarget.matches(':focus-visible')) getFrom.previewItem(item); }} onClick={() => getFrom.getItem(item)}>
            <span className={`command-tree-row-label${item.value === 'all' ? '' : ' is-gear-target'}`}>{item.value === 'all'
                ? item.label : <CommandTreeObjectTargetLabel label={item.keyword || item.value} location={item.objectLocation || item.meta}/>}</span>
        </button>) : <p className="command-tree-section-empty">Nothing to get.</p>;
    const renderContainerTarget = (target: typeof roomContainers[number]) => {
        const keyword = target.keyword?.trim() || target.value.replace(/^\d+\./, '');
        const expanded = getFrom.selected?.key === target.key;
        const contentsId = `${contentsIdPrefix}-contents-${encodeURIComponent(target.key)}`;
        const getButton = <button key={target.key} type="button" data-menu-item="true" className="command-tree-row" disabled={getFrom.disabled} title={`Get ${keyword}`}
            ref={heldTargetPreviewRef(() => controller.game.setCommandPreview?.(`get ${target.value}`))}
            onPointerEnter={event => { if (event.pointerType === 'mouse') controller.game.setCommandPreview?.(`get ${target.value}`); }}
            onFocus={event => { if (event.currentTarget.matches(':focus-visible')) controller.game.setCommandPreview?.(`get ${target.value}`); }}
            onClick={() => getFrom.getContainer(target)}>
            <span className="command-tree-row-label is-gear-target"><CommandTreeObjectTargetLabel label={keyword} location={target.meta}/></span>
        </button>;
        if (isMobile) return getButton;
        return <div key={target.key} className="command-tree-get-container-option">
            <div className="command-tree-get-target-row" role="group" aria-label={keyword}>
                {getButton}
                <button type="button" className="command-tree-row command-tree-get-expand" aria-label={`${expanded ? 'Hide' : 'Show'} contents of ${keyword}`}
                    aria-expanded={expanded} aria-controls={heldMenu ? `${contentsIdPrefix}-held-contents` : contentsId} disabled={getFrom.disabled}
                    onClick={event => { event.stopPropagation(); expanded ? getFrom.clearSelection() : getFrom.selectContainer(target); }}>
                    <ChevronRight size={14} aria-hidden="true"/>
                </button>
            </div>
            {expanded && !heldMenu && <div id={contentsId} className="command-tree-get-contents" role="group" aria-label={`Contents of ${target.label}`}>
                {renderContents()}
            </div>}
        </div>;
    };
    const renderedRoomContainers = new Set<string>();
    const roomObjectTargets = targets.map(entry => {
        const container = getRoomContainer(entry);
        if (container) {
            renderedRoomContainers.add(container.key);
            return renderContainerTarget(container);
        }
        return <div key={entry.id} ref={heldTargetPreviewRef(() => controller.game.setCommandPreview?.(`get ${entry.context}`))} onPointerEnter={event => {
            if (event.pointerType !== 'mouse') return;
            getFrom.clearSelection();
            controller.game.setCommandPreview?.(`get ${entry.keyword.toLowerCase() === 'all' ? 'all' : entry.context}`.trim());
            if (entry.id.startsWith('command-tree-all:')) controller.previewEntity(null);
            else controller.previewEntity(entry);
        }}>
            <CommandTreeAction targetLabel={getCommandActionTargetDisplayLabel(entry)} targetGearRow={entry.gearRow} controller={controller} button={button} targetState={targetState(entry)}/>
        </div>;
    });
    const additionalRoomContainers = roomContainers.filter(target => !renderedRoomContainers.has(target.key)).map(renderContainerTarget);
    const roomHasTargets = roomObjectTargets.length > 0 || additionalRoomContainers.length > 0;
    const inventoryTargets = getFrom.fromSections.find(section => section.meta === 'inventory')?.targets || [];
    const equipmentTargets = getFrom.fromSections.find(section => section.meta === 'worn')?.targets || [];
    const locationOptions = [
        {key: 'room' as const, label: 'Room', available: roomHasTargets},
        {key: 'inventory' as const, label: 'Inventory', available: inventoryTargets.length > 0},
        {key: 'worn' as const, label: 'Equipment', available: equipmentTargets.length > 0}
    ];
    const renderLocationContent = (selectedLocation: (typeof locationOptions)[number]['key']) => selectedLocation === 'room' ? <div className="command-tree-location-content" role="group" aria-label="Room objects">
                {roomObjectTargets}{additionalRoomContainers}
                {!roomHasTargets && <p className="command-tree-section-empty">No room objects available.</p>}
            </div> : <div className="command-tree-location-content command-tree-section-commands" role="group"
                aria-label={`${selectedLocation === 'worn' ? 'Equipment' : 'Inventory'} containers`} tabIndex={0}>
                {(selectedLocation === 'worn' ? equipmentTargets : inventoryTargets).map(renderContainerTarget)}
                {!(selectedLocation === 'worn' ? equipmentTargets : inventoryTargets).length && <p className="command-tree-section-empty">No containers available.</p>}
            </div>;
    const mobileContainers = getFrom.fromSections.flatMap(section => section.targets);
    if (isMobile) return <MobileCommandTargetSections label="Get targets" heldMenu={heldMenu}
        options={[{key: 'room', label: 'Room'}, ...mobileContainers.map(target => ({key: `container:${target.key}`,
            label: <CommandTreeObjectTargetLabel label={target.label} location={target.meta}/>}))]}
        selectedKey={getFrom.selected ? `container:${getFrom.selected.key}` : 'room'}
        onSelect={key => {
            if (key === 'room') { getFrom.clearSelection(); return; }
            const container = mobileContainers.find(target => `container:${target.key}` === key);
            if (container) getFrom.selectContainer(container);
        }}>
        {getFrom.selected ? <div className="command-tree-get-contents" role="group" aria-label={`Contents of ${getFrom.selected.label}`}>
            {renderContents()}
        </div> : renderLocationContent('room')}
    </MobileCommandTargetSections>;
    return <>
        <section className={branchClass} aria-label="Get targets" {...touchActivation}>
            <CommandTreeTargetHeader/>
            {locationOptions.filter(option => option.available).map(option =>
                <CommandTreeCollapsibleSection key={option.key} label={option.label}>{renderLocationContent(option.key)}</CommandTreeCollapsibleSection>)}
        </section>
        {heldMenu && getFrom.selected && <section className={branchClass} aria-label={`Contents of ${getFrom.selected.label}`} {...touchActivation}>
            <CommandTreeTargetHeader/>
            <div id={`${contentsIdPrefix}-held-contents`} className="command-tree-get-contents" role="group" aria-label="Container contents">
                {renderContents()}
            </div>
        </section>}
    </>;
};
