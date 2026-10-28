/** @file CommandPanelV2Branches.tsx — Command and target branches for the V2 popup. */
import React from 'react';
import type { useCommandTreeController } from '../../hooks/useCommandTreeController';
import type { useCommandTree } from '../../hooks/useCommandTree';
import type { CustomButton } from '../../types';
import type { CommandActionTargetEntry } from '../../objects/commandActionTargetModel';
import { getCommandActionTargetDisplayLabel, getCommandTargetSections, getObjectTargetSections } from '../../utils/commandTreeTargetSections';
import { isCommandTreeTransfer } from '../../utils/commandTreeTransfer';
import { isCommandTreeAccess } from '../../utils/commandTreeAccess';
import { isCommandTreeObservation } from '../../utils/commandTreeObservation';
import { isCommandTreeGetAction } from '../../utils/commandTreeGet';
import { isCommandTreePracticeAction } from '../../utils/commandTreePractice';
import { isCommandTreeShopAction } from '../../utils/commandTreeShop';
import { isCommandTreeMoveAction } from '../../utils/commandTreeMovement';
import { CommandTreeTransferTargets } from './CommandTreeTransferTargets';
import { CommandTreeAccessTargets } from './CommandTreeAccessTargets';
import { CommandTreeObservationTargets } from './CommandTreeObservationTargets';
import { CommandTreeGetTargets } from './CommandTreeGetTargets';
import { CommandTreePracticeTargets } from './CommandTreePracticeTargets';
import { CommandTreeShopTargets } from './CommandTreeShopTargets';
import { CommandTreeSections } from './CommandTreeSections';
import { CommandTreeMovement } from './CommandTreeMovement';
import { CommandTreeHeldTargets } from './CommandTreeHeldTargets';
import { CommandTreeHeldDirectionActions } from './CommandTreeHeldDirectionActions';
import { CommandTreeHeldMountActions } from './CommandTreeHeldMountActions';
import { CommandTreeTargetHeader } from './CommandTreeTargetHeader';
import { CommandTreeCollapsibleSection } from './CommandTreeCollapsibleSection';
import { CommandTreeAction } from './CommandTreeAction';
import { CommandPanelViews } from './CommandPanelViews';
import { OnlineCommandTargets } from '../Popovers/StandardMenu/OnlineCommandTargets';
import { getCommandTreeTargetPreview } from '../../utils/commandTreePreview';
import { isMobileCommandHoldGroup } from '../../utils/commandTreeMobileGestures';

// --- Branch Layout Section ---
type BranchListRef = React.MutableRefObject<HTMLDivElement | null>;

export const CommandPanelV2Branches = ({
    controller, tree, branchListRef, isMobile, hasDockSlots, mobileReadabilitySplit,
    menuHeaderInRootBranch, commandMenuHeader, categoryMenu, onCommandExecuted
}: {
    controller: ReturnType<typeof useCommandTreeController>;
    tree: ReturnType<typeof useCommandTree>;
    branchListRef: BranchListRef;
    isMobile: boolean;
    hasDockSlots: boolean;
    mobileReadabilitySplit: boolean;
    menuHeaderInRootBranch: boolean;
    commandMenuHeader: React.ReactNode;
    categoryMenu: React.ReactNode;
    onCommandExecuted: () => void;
}) => {
    const [heldCommand, setHeldCommand] = React.useState<CustomButton | null>(null);
    const [heldDirection, setHeldDirection] = React.useState<string | null>(null);
    const [heldMount, setHeldMount] = React.useState(false);
    React.useEffect(() => {
        setHeldCommand(null);
        setHeldDirection(null);
        setHeldMount(false);
    }, [tree.group]);
    const { game } = controller;
    const atShop = controller.shop.atShop ?? controller.shop.available;
    const isBashTargetCommand = Boolean(tree.command && /^bash\s+%n(?:\||\s|$)/i.test(tree.command.command.trim()));
    const isOnlinePlayerTargetCommand = Boolean(tree.command && /^(?:tell|whois)\b/i.test(tree.command.command.trim()));
    const isTellTargetCommand = Boolean(tree.command && /^tell\b/i.test(tree.command.command.trim()));
    const canUseTemporaryTargetMenu = mobileReadabilitySplit && isMobile && isMobileCommandHoldGroup(tree.group);
    const currentTargetEntries = tree.targets.filter(entry => entry.scope === 'global');
    const hasSelectedTargetBranch = Boolean(tree.command && (/%n/.test(tree.command.command) || currentTargetEntries.length > 0
        || isCommandTreeTransfer(tree.command) || isCommandTreeAccess(tree.command) || isCommandTreeObservation(tree.command)
        || isCommandTreeGetAction(tree.command) || isCommandTreeShopAction(tree.command) || isCommandTreePracticeAction(tree.command)));
    const showCommandMovement = canUseTemporaryTargetMenu && !heldCommand && !hasSelectedTargetBranch;
    const showMovementMap = mobileReadabilitySplit && isMobile && (showCommandMovement || Boolean(tree.command && isCommandTreeMoveAction(tree.command) && !heldCommand));
    const beginCommandHold = React.useCallback((button: CustomButton) => {
        setHeldDirection(null);
        setHeldMount(false);
        setHeldCommand(button);
    }, []);
    const endCommandHold = React.useCallback((button: CustomButton) => {
        setHeldCommand(current => current?.id === button.id && current.command === button.command ? null : current);
        tree.clearCommand();
    }, [tree.clearCommand]);
    const beginDirectionHold = React.useCallback((direction: string) => {
        setHeldCommand(null);
        setHeldMount(false);
        setHeldDirection(direction);
    }, []);
    const endDirectionHold = React.useCallback((direction: string) => {
        setHeldDirection(current => current === direction ? null : current);
    }, []);
    const beginMountHold = React.useCallback(() => {
        setHeldCommand(null);
        setHeldDirection(null);
        setHeldMount(true);
    }, []);
    const endMountHold = React.useCallback(() => setHeldMount(false), []);
    const bashTargetSections = isBashTargetCommand ? [
        ...(currentTargetEntries.length ? [{label:'Current Target',emptyLabel:'',entries:currentTargetEntries}] : []),
        {label:'Room Entities',emptyLabel:'No room entities available.',entries:tree.targets.filter(entry=>entry.scope==='room'&&['players','npcs'].includes(entry.group)&&entry.category!=='cat-exit')},
        {label:'Doors',emptyLabel:'No doors available.',entries:tree.targets.filter(entry=>entry.category==='cat-exit'&&entry.hasDoor===true)}
    ] : [];
    const objectTargetSections = tree.targets.length && tree.targets.every(entry=>['objects','inventory','worn'].includes(entry.group))
        ? getObjectTargetSections(tree.targets) : [];
    const commandTargetSections = getCommandTargetSections(tree.targets);
    const previewTarget = (entry: CommandActionTargetEntry) => {
        if (tree.command) controller.game.setCommandPreview?.(getCommandTreeTargetPreview(tree.command.command, entry.context, entry.parentNoun));
        if (entry.id === 'command-panel-self') controller.previewTargetContext('self');
        else if (entry.id === 'command-panel-room') controller.previewTargetContext('room');
        else controller.previewEntity(entry);
    };
    const renderTarget = (entry: CommandActionTargetEntry, displayLabel = entry.id === 'command-panel-self' ? 'Self' : getCommandActionTargetDisplayLabel(entry)) => <div key={entry.id}
        onPointerEnter={event => { if (event.pointerType === 'mouse') previewTarget(entry); }}
        onFocus={event => { if (event.target instanceof Element && event.target.matches(':focus-visible')) previewTarget(entry); }}>
        <CommandTreeAction targetLabel={displayLabel} targetGearRow={entry.gearRow}
            controller={controller} button={tree.command!} targetState={{x:0,y:0,type:'menu',setId:entry.category,category:entry.category,context:entry.context,keyword:entry.keyword,displayName:entry.group === 'objects' && entry.scope === 'room' ? entry.label : displayLabel,entityId:entry.id,parentNoun:entry.parentNoun,hasDoor:entry.hasDoor}}/>
    </div>;
    const targetBranches = <>
        {heldCommand && canUseTemporaryTargetMenu && <CommandTreeHeldTargets key={heldCommand.id} controller={controller}
            tree={tree} button={heldCommand} onCommandExecuted={onCommandExecuted}/>}
        {!heldCommand && !heldDirection && !heldMount && tree.command && !isCommandTreeTransfer(tree.command) && !isCommandTreeAccess(tree.command) && !isCommandTreeObservation(tree.command) && !isCommandTreeGetAction(tree.command) && !isCommandTreeShopAction(tree.command) && !isCommandTreePracticeAction(tree.command) && (/%n/.test(tree.command.command) || currentTargetEntries.length > 0 || (!mobileReadabilitySplit && tree.targets.length > 0)) && <section className={`command-tree-branch terminal-inline-popover${canUseTemporaryTargetMenu ? ' is-ability-side-branch' : ''}`} aria-label={`Targets for ${tree.command.label}`}>
            <CommandTreeTargetHeader/>
            {!isOnlinePlayerTargetCommand && (isBashTargetCommand ? bashTargetSections.map(section=><CommandTreeCollapsibleSection key={section.label} label={section.label}>
                <div className="command-tree-section-commands" role="group" aria-label={`${section.label} targets`} tabIndex={0}>
                    {section.entries.map(entry=>renderTarget(entry,entry.category==='cat-exit'?`${entry.doorName||'Door'} (${entry.label})`:entry.label))}
                    {!section.entries.length&&<p className="command-tree-section-empty">{section.emptyLabel}</p>}
                </div>
            </CommandTreeCollapsibleSection>) : objectTargetSections.length ? objectTargetSections.map(section=><CommandTreeCollapsibleSection key={section.label} label={section.label}>
                <div className="command-tree-section-commands" role="group" aria-label={`${section.label} targets`} tabIndex={0}>{section.entries.map(entry => renderTarget(entry))}</div>
            </CommandTreeCollapsibleSection>) : commandTargetSections.map(section=><CommandTreeCollapsibleSection key={section.label} label={section.label}>
                <div className="command-tree-section-commands" role="group" aria-label={`${section.label} targets`} tabIndex={0}>{section.entries.map(entry=>renderTarget(entry))}</div>
            </CommandTreeCollapsibleSection>))}
            {isTellTargetCommand && Boolean(game.groupMembers?.length) && <CommandTreeCollapsibleSection label="Group">
                <button type="button" data-menu-item="true" className="command-tree-row" onClick={() => controller.communication.handleCommand('tell group')}>Group</button>
            </CommandTreeCollapsibleSection>}
            {isOnlinePlayerTargetCommand && <CommandTreeCollapsibleSection label="Online Players">
                <OnlineCommandTargets hideHeader open namesOnly={isOnlinePlayerTargetCommand} excludedNames={isTellTargetCommand ? [game.characterName || ''] : []}
                    onPreviewTarget={entry => {
                        if (tree.command) controller.game.setCommandPreview?.(getCommandTreeTargetPreview(tree.command.command, entry.context));
                        controller.previewEntity(entry);
                    }}
                    onSelect={entry => {
                        if (isTellTargetCommand) {
                            controller.communication.handleCommand(`tell ${entry.context}`);
                            onCommandExecuted();
                            return;
                        }
                        controller.dismissOutputs();
                        controller.requestWhois(entry);
                        onCommandExecuted();
                    }}/>
            </CommandTreeCollapsibleSection>}
            {!tree.targets.length && !isBashTargetCommand && !isOnlinePlayerTargetCommand && <p>No available targets.</p>}
        </section>}
        {!heldCommand && !heldDirection && !heldMount && tree.command && isCommandTreeTransfer(tree.command) && <CommandTreeTransferTargets key={tree.command.id} controller={controller} tree={tree} command={tree.command}/>}
        {!heldCommand && !heldDirection && !heldMount && tree.command && isCommandTreeGetAction(tree.command) && <CommandTreeGetTargets key={tree.command.id} controller={controller} button={tree.command} targets={tree.targets}/>}
        {!heldCommand && !heldDirection && !heldMount && tree.command && isCommandTreeAccess(tree.command) && <CommandTreeAccessTargets controller={controller} button={tree.command} targets={tree.targets} onCommandExecuted={onCommandExecuted}/>}
        {!heldCommand && !heldDirection && !heldMount && tree.command && isCommandTreeObservation(tree.command) && <CommandTreeObservationTargets controller={controller} button={tree.command} targets={tree.targets}/>}
        {!heldCommand && !heldDirection && !heldMount && tree.command && isCommandTreePracticeAction(tree.command) && <CommandTreePracticeTargets controller={controller}/>}
        {!heldCommand && !heldDirection && !heldMount && tree.command && atShop && isCommandTreeShopAction(tree.command) && <CommandTreeShopTargets controller={controller} command={tree.command} onCommandExecuted={onCommandExecuted}/>}
    </>;
    const useLandscapeTargetLane = mobileReadabilitySplit && isMobile && game.viewport?.isLandscape === true;

    return <CommandPanelViews communication={controller.communication}>
        {controller.isHelpMode && <p className="command-tree-hint">Choose an action to inspect its help.</p>}
        <div ref={branchListRef} className="command-tree-branches" data-has-main-branch={tree.group !== null ? 'true' : 'false'} onMouseLeave={tree.cancelPreview}>
            {!isMobile && !hasDockSlots && categoryMenu}
            {tree.group !== null && (canUseTemporaryTargetMenu && heldMount
                ? <CommandTreeHeldMountActions controller={controller} tree={tree}/>
                : canUseTemporaryTargetMenu && heldDirection
                ? <CommandTreeHeldDirectionActions controller={controller} tree={tree} direction={heldDirection}/>
                : <CommandTreeSections controller={controller} tree={tree} menuHeader={menuHeaderInRootBranch ? commandMenuHeader : undefined}
                    onCommandExecuted={onCommandExecuted} mobileReadabilitySplit={mobileReadabilitySplit}
                    onCommandTouchHoldStart={canUseTemporaryTargetMenu ? beginCommandHold : undefined}
                    onCommandTouchHoldEnd={canUseTemporaryTargetMenu ? endCommandHold : undefined}/>)}
            {useLandscapeTargetLane ? <div className="command-tree-landscape-target-lane">{targetBranches}</div> : targetBranches}
            {showCommandMovement && <div className="command-tree-branch terminal-inline-popover is-movement-branch is-ability-movement-branch is-ability-side-branch" aria-label="Movement controls">
                <CommandTreeMovement controller={controller} onCommandExecuted={onCommandExecuted} onDirectionHold={beginDirectionHold}
                    onDirectionRelease={endDirectionHold} heldDirection={heldDirection} showMountShortcut
                    onMountHold={beginMountHold} onMountRelease={endMountHold} mountHeld={heldMount}/>
            </div>}
            {!heldCommand && !heldDirection && !showCommandMovement && tree.command && isCommandTreeMoveAction(tree.command) && <div className="command-tree-branch terminal-inline-popover is-movement-branch" role="group" aria-label="Direction pad">
                <CommandTreeMovement controller={controller} onCommandExecuted={onCommandExecuted}/>
            </div>}
            {mobileReadabilitySplit && isMobile && <div key="movement-map" className="command-tree-movement-map-slot"
                data-map-visible={showMovementMap ? 'true' : 'false'} aria-label="Movement minimap"
                aria-hidden={!showMovementMap} inert={!showMovementMap}/>}
        </div>
    </CommandPanelViews>;
};
