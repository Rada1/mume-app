/** @file CommandTreeSocialTargets.tsx — Social theme → social → target columns beside the command list. */
import React from 'react';
import type { CustomButton } from '../../types';
import type { CommandActionTargetEntry } from '../../objects/commandActionTargetModel';
import type { useCommandTreeController } from '../../hooks/useCommandTreeController';
import { executeCommandPanelInput } from '../../hooks/executeCommandPanelInput';
import { getCommandActionTargetDisplayLabel } from '../../utils/commandTreeTargetSections';
import {
    COMMAND_TREE_SOCIAL_THEMES, createSocialEmoteButton, type CommandTreeSocialEntry
} from '../../utils/commandTreeSocial';
import { useSecondaryTouchActivation } from '../../hooks/useSecondaryTouchActivation';
import { CommandTreeAction } from './CommandTreeAction';
import { CommandTreeCollapsibleSection } from './CommandTreeCollapsibleSection';
import { CommandTreeTargetHeader } from './CommandTreeTargetHeader';
import { DesktopCommandPin } from './DesktopCommandPin';
import { useDesktopCommandDefaults } from '../../hooks/useDesktopCommandDefaults';
import { DESKTOP_SOCIAL_COMMANDS } from '../../utils/desktopSocialCommands';
import './CommandTreeSocialTargets.css';

// --- Render Section ---
const Chevron = () => <span className="command-tree-row-chevron" aria-hidden="true">&#8249;</span>;
const POINT_DIRECTIONS = ['north', 'east', 'south', 'west', 'up', 'down'];

export const CommandTreeSocialTargets = ({controller, button, targets, onCommandExecuted, heldMenu = false, desktopPin = false, heldSocialRelease}: {
    controller: ReturnType<typeof useCommandTreeController>; button: CustomButton; targets: CommandActionTargetEntry[];
    onCommandExecuted?: () => void; heldMenu?: boolean; desktopPin?: boolean;
    heldSocialRelease?: React.MutableRefObject<(() => void) | null>;
}) => {
    const [themeId, setThemeId] = React.useState<string | null>(null);
    const [selected, setSelected] = React.useState<CommandTreeSocialEntry | null>(null);
    const touchActivation = useSecondaryTouchActivation();
    const defaults = useDesktopCommandDefaults(controller.game.characterName);
    const defaultSocial = defaults.resolve('social', DESKTOP_SOCIAL_COMMANDS);
    const theme = COMMAND_TREE_SOCIAL_THEMES.find(entry => entry.id === themeId) ?? null;
    const isPoint = selected?.command === 'point';
    const roomTargets = isPoint
        ? controller.entries.filter(entry => entry.scope === 'room' && entry.category !== 'cat-exit'
            && ['players', 'npcs', 'objects'].includes(entry.group))
        : targets.filter(entry => entry.id !== 'command-panel-self');
    const branchClass = `command-tree-branch terminal-inline-popover is-social-branch${heldMenu ? ' is-ability-side-branch command-tree-held-command-targets' : ''}`;
    const chooseTheme = (id: string) => { if (heldSocialRelease) heldSocialRelease.current = null; setThemeId(id); setSelected(null); };
    const sendBare = (entry: CommandTreeSocialEntry) => {
        executeCommandPanelInput(controller.game, entry.command);
        onCommandExecuted?.();
    };
    const chooseSocial = (entry: CommandTreeSocialEntry) => {
        if (heldSocialRelease) heldSocialRelease.current = () => sendBare(entry);
        setSelected(entry);
    };
    React.useEffect(() => () => { if (heldSocialRelease) heldSocialRelease.current = null; }, [heldSocialRelease]);
    return <>
        <section className={branchClass} aria-label={`Themes for ${button.label}`} {...touchActivation}>
            <CommandTreeTargetHeader/>
            <div className="command-tree-section-commands" role="group" aria-label="Social themes" tabIndex={0}>
                {COMMAND_TREE_SOCIAL_THEMES.map(entry => <button key={entry.id} type="button" data-menu-item="true" className="command-tree-row"
                    aria-expanded={themeId === entry.id} onClick={() => chooseTheme(entry.id)}
                    onPointerEnter={event => { if (event.pointerType === 'mouse') chooseTheme(entry.id); }}>
                    <span className="command-tree-row-label">{entry.label}</span><Chevron/>
                </button>)}
            </div>
        </section>
        {theme && <section className={branchClass} aria-label={`${theme.label} socials`} {...touchActivation}>
            <CommandTreeCollapsibleSection label={theme.label}>
                <div className="command-tree-section-commands" role="group" aria-label={`${theme.label} socials`} tabIndex={0}>
                    {theme.socials.map(entry => {
                        const row = <button key={entry.command} type="button" data-menu-item="true" className="command-tree-row"
                        aria-expanded={entry.targeted ? selected?.command === entry.command : undefined}
                        onClick={() => entry.targeted ? chooseSocial(entry) : sendBare(entry)}
                        onPointerEnter={event => { if (event.pointerType === 'mouse' && entry.targeted) chooseSocial(entry); }}>
                        <span className="command-tree-row-label">{entry.label}</span>{entry.targeted && <Chevron/>}
                    </button>;
                        return desktopPin && !entry.targetOptions ? <DesktopCommandPin key={entry.command} label={entry.label}
                            selected={defaultSocial?.command === entry.command}
                            onSelect={() => defaults.setDefault('social', createSocialEmoteButton(entry, false))}>{row}</DesktopCommandPin> : row;
                    })}
                </div>
            </CommandTreeCollapsibleSection>
        </section>}
        {theme && selected && <section className={branchClass} aria-label={`Targets for ${selected.label}`} {...touchActivation}>
            <CommandTreeCollapsibleSection label={selected.label}>
                <div className="command-tree-section-commands" role="group" aria-label={`${selected.label} targets`} tabIndex={0}>
                    {selected.targetOptions?.map(option => {
                        const command = `${selected.command} ${option}`;
                        const label = `${selected.label} ${option}`;
                        const row = <button key={option} type="button" data-menu-item="true" className="command-tree-row"
                            onClick={() => { executeCommandPanelInput(controller.game, command); onCommandExecuted?.(); }}>
                            <span className="command-tree-row-label">{option[0].toUpperCase() + option.slice(1)}</span>
                        </button>;
                        return desktopPin ? <DesktopCommandPin key={option} label={label} selected={defaultSocial?.command === command}
                            onSelect={() => defaults.setDefault('social', createSocialEmoteButton({...selected, command, label}, false))}>{row}</DesktopCommandPin> : row;
                    })}
                    {!selected.targetOptions && <button type="button" data-menu-item="true" className="command-tree-row" onClick={() => sendBare(selected)}>
                        <span className="command-tree-row-label">No target</span>
                    </button>}
                    {isPoint && POINT_DIRECTIONS.map(direction => <button key={direction} type="button" data-menu-item="true" className="command-tree-row"
                        onClick={() => { executeCommandPanelInput(controller.game, `point ${direction}`); onCommandExecuted?.(); }}>
                        <span className="command-tree-row-label">{direction[0].toUpperCase() + direction.slice(1)}</span>
                    </button>)}
                    {!selected.targetOptions && roomTargets.map(entry => {
                        const label = getCommandActionTargetDisplayLabel(entry);
                        return <div key={entry.id} onClick={() => onCommandExecuted?.()}>
                            <CommandTreeAction controller={controller} button={createSocialEmoteButton(selected, true)} targetLabel={label}
                                targetState={{x: 0, y: 0, type: 'menu', setId: entry.category, category: entry.category, context: entry.context,
                                    keyword: entry.keyword, displayName: label, entityId: entry.id}}/>
                        </div>;
                    })}
                    {!selected.targetOptions && !isPoint && !roomTargets.length && <p className="command-tree-section-empty">No one else is here.</p>}
                </div>
            </CommandTreeCollapsibleSection>
        </section>}
    </>;
};
