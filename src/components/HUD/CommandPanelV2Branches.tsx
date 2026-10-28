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
import { isCommandTreeReciteAction } from '../../utils/commandTreeRecite';
import { isCommandTreeShopAction } from '../../utils/commandTreeShop';
import { COMMAND_TREE_FOLLOW_BUTTON, isCommandTreeMoveAction } from '../../utils/commandTreeMovement';
import { executeDefaultCommandTarget } from '../../hooks/commandDefaultTarget';
import { CommandTreeTransferTargets } from './CommandTreeTransferTargets';
import { CommandTreeAccessTargets } from './CommandTreeAccessTargets';
import { CommandTreeObservationTargets } from './CommandTreeObservationTargets';
import { CommandTreeGetTargets } from './CommandTreeGetTargets';
import { CommandTreePracticeTargets } from './CommandTreePracticeTargets';
import { CommandTreeReciteTargets } from './CommandTreeReciteTargets';
import { CommandTreeShopTargets } from './CommandTreeShopTargets';
import { MobileCommandTiles } from './MobileCommandTiles';
import { MobileShopCommandMenu } from './MobileShopCommandMenu';
import { DesktopCommandCategoryCommands } from './DesktopCommandCategoryCommands';
import { isMobileCommandTargetless } from '../../utils/mobileCommandTiles';
import { useHeldCommandExecution } from '../../hooks/useHeldCommandExecution';
import { useHeldTargetFeedback } from '../../hooks/useHeldTargetFeedback';
import { parseKeyedSpellCommand } from '../../utils/magicKeyUtils';
import { CommandTreeMagicKeyTargets } from './CommandTreeMagicKeyTargets';
import { CommandTreeMovement } from './CommandTreeMovement';
import { CommandTreeHeldTargets } from './CommandTreeHeldTargets';
import { CommandTreeHeldDirectionActions } from './CommandTreeHeldDirectionActions';
import { CommandTreeTargetHeader } from './CommandTreeTargetHeader';
import { CommandTreeCollapsibleSection } from './CommandTreeCollapsibleSection';
import { CommandTreeAction } from './CommandTreeAction';
import { CommandPanelViews } from './CommandPanelViews';
import { OnlineCommandTargets } from '../Popovers/StandardMenu/OnlineCommandTargets';
import { getCommandTreeTargetPreview } from '../../utils/commandTreePreview';
import { CommandTargetMenuContext } from '../../context/CommandTargetMenuContext';
import { isCommandTreeSocial } from '../../utils/commandTreeSocial';
import { CommandTreeSocialTargets } from './CommandTreeSocialTargets';

// --- Branch Layout Section ---
type BranchListRef = React.MutableRefObject<HTMLDivElement | null>;

export const CommandPanelV2Branches = ({
    controller, tree, branchListRef, isMobile, mobileReadabilitySplit, desktopCategoryId, atShop,
    menuHeader, onCommandExecuted
}: {
    controller: ReturnType<typeof useCommandTreeController>;
    tree: ReturnType<typeof useCommandTree>;
    branchListRef: BranchListRef;
    isMobile: boolean;
    mobileReadabilitySplit: boolean;
    desktopCategoryId:string|null;
    atShop:boolean;
    menuHeader?:React.ReactNode;
    onCommandExecuted: () => void;
}) => {
    const [heldCommand, setHeldCommand] = React.useState<CustomButton | null>(null);
    const [followTargetsOpen, setFollowTargetsOpen] = React.useState(false);
    const [mobileArranging,setMobileArranging] = React.useState(false);
    const [mobileCloseRequest,setMobileCloseRequest] = React.useState(0);
    const heldCommandSent = React.useRef(false);
    const targetFeedback = useHeldTargetFeedback(controller.game.triggerHaptic);
    const heldController = useHeldCommandExecution(controller,heldCommand,heldCommandSent,targetFeedback.sent);
    const followController = useHeldCommandExecution(controller, COMMAND_TREE_FOLLOW_BUTTON, heldCommandSent, alreadyHaptic => {
        targetFeedback.sent(alreadyHaptic);
        setFollowTargetsOpen(false);
        controller.game.setCommandPreview?.(null);
        onCommandExecuted();
    });
    const [heldDirection, setHeldDirection] = React.useState<string | null>(null);
    React.useEffect(() => {
        setHeldCommand(null);
        setHeldDirection(null);
        setFollowTargetsOpen(false);
    }, [tree.group]);
    const { game } = controller;
    const mobileShopOpen = isMobile && atShop && Boolean(tree.command && isCommandTreeShopAction(tree.command));
    const isBashTargetCommand = Boolean(tree.command && /^bash\s+%n(?:\||\s|$)/i.test(tree.command.command.trim()));
    const isOnlinePlayerTargetCommand = Boolean(tree.command && /^(?:tell|whois)\b/i.test(tree.command.command.trim()));
    const isTellTargetCommand = Boolean(tree.command && /^tell\b/i.test(tree.command.command.trim()));
    const canUseTemporaryTargetMenu = mobileReadabilitySplit && isMobile;
    const currentTargetEntries = tree.targets.filter(entry => entry.scope === 'global');
    const hasSelectedTargetBranch = Boolean(tree.command && (parseKeyedSpellCommand(tree.command.command) || /%n/.test(tree.command.command) || currentTargetEntries.length > 0
        || isCommandTreeTransfer(tree.command) || isCommandTreeAccess(tree.command) || isCommandTreeObservation(tree.command)
        || isCommandTreeGetAction(tree.command) || isCommandTreeShopAction(tree.command) || isCommandTreePracticeAction(tree.command)
        || isCommandTreeReciteAction(tree.command) || isCommandTreeSocial(tree.command)));
    const heldTargetlessCommand = Boolean(heldCommand && isMobileCommandTargetless(heldCommand));
    const showCommandMovement = canUseTemporaryTargetMenu && (!heldCommand || heldTargetlessCommand)
        && (mobileArranging || heldTargetlessCommand || !hasSelectedTargetBranch);
    const showMovementMap = mobileReadabilitySplit && isMobile && (showCommandMovement || Boolean(tree.command && isCommandTreeMoveAction(tree.command) && !heldCommand));
    const beginDirectionHold = React.useCallback((direction: string) => {
        setHeldCommand(null);
        setHeldDirection(direction);
    }, []);
    const endDirectionHold = React.useCallback((direction: string) => {
        setHeldDirection(current => current === direction ? null : current);
    }, []);
    const beginFollowHold = React.useCallback(() => {
        if (!canUseTemporaryTargetMenu) return;
        heldCommandSent.current = false;
        setHeldDirection(null);
        setHeldCommand(null);
        setFollowTargetsOpen(true);
        controller.game.setCommandPreview?.('follow');
    }, [canUseTemporaryTargetMenu, controller.game]);
    const endFollowHold = React.useCallback(() => {
        setFollowTargetsOpen(false);
        controller.game.setCommandPreview?.(null);
    }, [controller.game]);
    const followClick = React.useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
        if (followTargetsOpen) {
            setFollowTargetsOpen(false);
            controller.game.setCommandPreview?.(null);
            return;
        }
        if (controller.isHelpMode) {
            controller.executeHelp('follow');
            return;
        }
        if (executeDefaultCommandTarget(controller, COMMAND_TREE_FOLLOW_BUTTON,
            tree.targetsFor(COMMAND_TREE_FOLLOW_BUTTON) || [], event)) onCommandExecuted();
    }, [controller, followTargetsOpen, onCommandExecuted, tree.targetsFor]);
    const bashTargetSections = isBashTargetCommand ? [
        ...(currentTargetEntries.length ? [{label:'Current Target',emptyLabel:'',entries:currentTargetEntries}] : []),
        {label:'Room Entities',emptyLabel:'No room entities available.',entries:tree.targets.filter(entry=>entry.scope==='room'&&['players','npcs'].includes(entry.group)&&entry.category!=='cat-exit')},
        {label:'Doors',emptyLabel:'No doors available.',entries:tree.targets.filter(entry=>entry.category==='cat-exit'&&entry.hasDoor===true)}
    ] : [];
    const objectTargetSections = tree.targets.length && tree.targets.every(entry=>['objects','inventory','worn'].includes(entry.group))
        ? getObjectTargetSections(tree.targets) : [];
    const commandTargetSections = getCommandTargetSections(tree.targets, true);
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
    const targetBranches = <CommandTargetMenuContext.Provider value={true}>
        {!heldCommand && !heldDirection && tree.command && parseKeyedSpellCommand(tree.command.command)
            && <CommandTreeMagicKeyTargets controller={controller} button={tree.command} onCommandExecuted={onCommandExecuted}/>}
        {heldCommand && canUseTemporaryTargetMenu && <CommandTreeHeldTargets key={heldCommand.id} controller={heldController}
            tree={tree} button={heldCommand} onCommandExecuted={() => {heldCommandSent.current=true;targetFeedback.sent();setMobileCloseRequest(value=>value+1);onCommandExecuted();}}/>}
        {!heldCommand && !heldDirection && tree.command && !isCommandTreeSocial(tree.command) && !parseKeyedSpellCommand(tree.command.command) && !isCommandTreeTransfer(tree.command) && !isCommandTreeAccess(tree.command) && !isCommandTreeObservation(tree.command) && !isCommandTreeGetAction(tree.command) && !isCommandTreeShopAction(tree.command) && !isCommandTreePracticeAction(tree.command) && !isCommandTreeReciteAction(tree.command) && (/%n/.test(tree.command.command) || currentTargetEntries.length > 0 || (!mobileReadabilitySplit && tree.targets.length > 0)) && <section className={`command-tree-branch terminal-inline-popover${canUseTemporaryTargetMenu ? ' is-ability-side-branch' : ''}`} aria-label={`Targets for ${tree.command.label}`}>
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
        {!heldCommand && !heldDirection && tree.command && isCommandTreeSocial(tree.command) && <CommandTreeSocialTargets key={tree.command.id} controller={controller} button={tree.command} targets={tree.targets} onCommandExecuted={onCommandExecuted} desktopPin={!isMobile && desktopCategoryId==='social'}/>}
        {!heldCommand && !heldDirection && tree.command && isCommandTreeTransfer(tree.command) && <CommandTreeTransferTargets key={tree.command.id} controller={controller} tree={tree} command={tree.command}/>}
        {!heldCommand && !heldDirection && tree.command && isCommandTreeReciteAction(tree.command) && <CommandTreeReciteTargets key={tree.command.id} controller={controller} tree={tree} command={tree.command} targets={tree.targets} onCommandExecuted={onCommandExecuted}/>}
        {!heldCommand && !heldDirection && tree.command && isCommandTreeGetAction(tree.command) && <CommandTreeGetTargets key={tree.command.id} controller={controller} button={tree.command} targets={tree.targets}/>}
        {!heldCommand && !heldDirection && tree.command && isCommandTreeAccess(tree.command) && <CommandTreeAccessTargets controller={controller} button={tree.command} targets={tree.targets} onCommandExecuted={onCommandExecuted}/>}
        {!heldCommand && !heldDirection && tree.command && isCommandTreeObservation(tree.command) && <CommandTreeObservationTargets controller={controller} button={tree.command} targets={tree.targets}/>}
        {!heldCommand && !heldDirection && tree.command && isCommandTreePracticeAction(tree.command) && <CommandTreePracticeTargets controller={controller}/>}
        {!heldCommand && !heldDirection && tree.command && atShop && isCommandTreeShopAction(tree.command) && <CommandTreeShopTargets controller={controller} command={tree.command} onCommandExecuted={mobileShopOpen ? undefined : onCommandExecuted}/>}
    </CommandTargetMenuContext.Provider>;
    const useLandscapeTargetLane = mobileReadabilitySplit && isMobile && game.viewport?.isLandscape === true
        && !isCommandTreeSocial(heldCommand || tree.command);

    return <CommandPanelViews communication={controller.communication}>
        {controller.isHelpMode && <p className="command-tree-hint">Choose an action to inspect its help.</p>}
        <div ref={branchListRef} className="command-tree-branches" onClickCapture={isMobile ? targetFeedback.recordClick : undefined} data-mobile-tile-target-lane={isMobile || undefined} data-has-main-branch={isMobile || tree.group !== null ? 'true' : 'false'} onMouseLeave={tree.cancelPreview}>
            {(isMobile || tree.group !== null) && (followTargetsOpen && canUseTemporaryTargetMenu
                ? <CommandTreeHeldTargets key="follow-targets" controller={followController} tree={tree}
                    button={COMMAND_TREE_FOLLOW_BUTTON} onCommandExecuted={() => setFollowTargetsOpen(false)}/>
                : canUseTemporaryTargetMenu && heldDirection
                ? <CommandTreeHeldDirectionActions controller={controller} tree={tree} direction={heldDirection}/>
                : mobileShopOpen ? <MobileShopCommandMenu selected={tree.command!} onSelect={tree.chooseCommand}
                    onClose={()=>{tree.clearCommand();controller.shop.closeWorkspace();}}/>
                : isMobile ? <MobileCommandTiles controller={controller} tree={tree} commandSent={heldCommandSent} onArrangeChange={setMobileArranging} closeRequest={mobileCloseRequest}
                    onTargetCommand={setHeldCommand}/>
                : desktopCategoryId === 'social' ? null
                : <DesktopCommandCategoryCommands categoryId={desktopCategoryId} atShop={atShop} controller={controller} tree={tree} onCommandExecuted={onCommandExecuted} menuHeader={menuHeader}/>)}
            {useLandscapeTargetLane ? <div className="command-tree-landscape-target-lane">{!mobileArranging && targetBranches}</div> : !mobileArranging && targetBranches}
            {showCommandMovement && <div className="command-tree-branch terminal-inline-popover is-movement-branch is-ability-movement-branch is-ability-side-branch" aria-label="Movement controls" inert={mobileArranging}>
                <CommandTreeMovement controller={controller} onCommandExecuted={onCommandExecuted} onDirectionHold={beginDirectionHold}
                    onDirectionRelease={endDirectionHold} heldDirection={heldDirection} onFollowClick={followClick}
                    onFollowHold={canUseTemporaryTargetMenu ? beginFollowHold : undefined}
                    onFollowRelease={canUseTemporaryTargetMenu ? endFollowHold : undefined} followTargetsOpen={followTargetsOpen}/>
            </div>}
            {!heldCommand && !heldDirection && !showCommandMovement && tree.command && isCommandTreeMoveAction(tree.command) && <div className="command-tree-branch terminal-inline-popover is-movement-branch" role="group" aria-label="Direction pad">
                <CommandTreeMovement controller={controller} onCommandExecuted={onCommandExecuted} onFollowClick={followClick}
                    onFollowHold={canUseTemporaryTargetMenu ? beginFollowHold : undefined}
                    onFollowRelease={canUseTemporaryTargetMenu ? endFollowHold : undefined} followTargetsOpen={followTargetsOpen}/>
            </div>}
            {mobileReadabilitySplit && isMobile && <div key="movement-map" className="command-tree-movement-map-slot"
                data-map-visible={showMovementMap ? 'true' : 'false'} aria-label="Movement minimap"
                aria-hidden={!showMovementMap} inert={mobileArranging || !showMovementMap}/>}
        </div>
    </CommandPanelViews>;
};
