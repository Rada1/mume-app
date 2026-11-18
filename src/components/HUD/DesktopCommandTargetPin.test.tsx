/** @file DesktopCommandTargetPin.test.tsx — Remember and clear a per-command target. */
// @vitest-environment jsdom
import React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import type { CommandActionTargetEntry } from '../../objects/commandActionTargetModel';
import { useDesktopCommandDefaultsStore } from '../../stores/useDesktopCommandDefaultsStore';
import { DesktopCommandTargetPin } from './DesktopCommandTargetPin';
import { executeDesktopRememberedTarget, resolveDesktopRememberedTarget } from '../../hooks/desktopRememberedTarget';
import type { useCommandTreeController } from '../../hooks/useCommandTreeController';
import { createButton } from '../../utils/buttonFactory';
import { DesktopCommandCategoryNav } from './DesktopCommandCategoryNav';
import { useMobileCommandTiles } from '../../hooks/useMobileCommandTiles';
import { MOBILE_COMMAND_TILES } from '../../utils/mobileCommandTiles';
import type { useCommandTree } from '../../hooks/useCommandTree';

vi.mock('../../hooks/useMobileCommandTiles', () => ({useMobileCommandTiles:vi.fn()}));

const target:CommandActionTargetEntry = { id:'room:1', label:'a guard', keyword:'guard', context:'2.guard', category:'cat-npc', group:'npcs', scope:'room' };
afterEach(() => { cleanup(); useDesktopCommandDefaultsStore.setState({ characters:{}, targets:{} }); });

// --- Remember, clear, and resolve ---
it('toggles the target without activating the command row', () => {
 const action = vi.fn();
 render(<DesktopCommandTargetPin characterName="Tester" command="follow %n" entry={target}><button onClick={action}>Follow guard</button></DesktopCommandTargetPin>);
 fireEvent.click(screen.getByRole('button', {name:'Remember a guard as target for follow'}));
 expect(action).not.toHaveBeenCalled();
 expect(useDesktopCommandDefaultsStore.getState().targets.tester['follow %n'].context).toBe('2.guard');
 fireEvent.click(screen.getByRole('button', {name:'Forget a guard as target for follow'}));
 expect(useDesktopCommandDefaultsStore.getState().targets.tester['follow %n']).toBeUndefined();
});

it('uses the remembered target for the category click and opens the menu if it is absent', () => {
 const button=createButton({id:'follow', label:'Follow', command:'follow %n', setId:'combat'});
 const handleButtonClick=vi.fn(), open=vi.fn(), execute=vi.fn();
 vi.mocked(useMobileCommandTiles).mockReturnValue({tiles:[{id:'combat',commands:[button],button}], execute, usesTargetChip:()=>false} as unknown as ReturnType<typeof useMobileCommandTiles>);
 const controller={game:{characterName:'Tester', gameState:'playing', isSpectateMode:false, handleButtonClick, whoList:[]}, entries:[target]} as unknown as ReturnType<typeof useCommandTreeController>;
 const tree={grouped:[], targetsFor:()=>[target]} as unknown as ReturnType<typeof useCommandTree>;
 useDesktopCommandDefaultsStore.getState().toggleTarget('tester', button.command, target);
 const category=MOBILE_COMMAND_TILES.find(tile=>tile.id==='combat')!;
 const view=render(<DesktopCommandCategoryNav categories={[category]} selectedId={null} onSelect={open} onPointerEnter={vi.fn()} onPointerLeave={vi.fn()} controller={controller} tree={tree}/>);
 fireEvent.click(screen.getByRole('button',{name:/Combat: Follow/}));
 expect(handleButtonClick).toHaveBeenCalledWith(expect.objectContaining({command:'follow %n'}), expect.anything(), '2.guard', undefined, undefined);
 view.rerender(<DesktopCommandCategoryNav categories={[category]} selectedId={null} onSelect={open} onPointerEnter={vi.fn()} onPointerLeave={vi.fn()} controller={{...controller, entries:[]}} tree={{...tree, targetsFor:()=>[]}}/>);
 fireEvent.click(screen.getByRole('button',{name:/Combat: Follow/}));
 expect(open).toHaveBeenCalledOnce();
 expect(handleButtonClick).toHaveBeenCalledOnce();
});

it('requires both remembered item and destination before executing a transfer', () => {
 const button=createButton({id:'give', label:'Give', command:'give %n', setId:'combat'});
 const item:CommandActionTargetEntry={id:'item', label:'a flask', keyword:'flask', context:'flask', category:'cat-inventory-object', group:'inventory', scope:'self'};
 const handleButtonClick=vi.fn(), open=vi.fn();
 vi.mocked(useMobileCommandTiles).mockReturnValue({tiles:[{id:'combat',commands:[button],button}], execute:vi.fn(), usesTargetChip:()=>false} as unknown as ReturnType<typeof useMobileCommandTiles>);
 const controller={game:{characterName:'Tester',gameState:'playing',isSpectateMode:false,handleButtonClick,whoList:[]}, entries:[item,target]} as unknown as ReturnType<typeof useCommandTreeController>;
 const tree={grouped:[], targetsFor:()=>[]} as unknown as ReturnType<typeof useCommandTree>;
 useDesktopCommandDefaultsStore.getState().toggleTarget('tester', `${button.command}::source`, item);
 const category=MOBILE_COMMAND_TILES.find(tile=>tile.id==='combat')!;
 render(<DesktopCommandCategoryNav categories={[category]} selectedId={null} onSelect={open} onPointerEnter={vi.fn()} onPointerLeave={vi.fn()} controller={controller} tree={tree}/>);
 fireEvent.click(screen.getByRole('button',{name:/Combat: Give/}));
 expect(open).toHaveBeenCalledOnce();
 expect(handleButtonClick).not.toHaveBeenCalled();
 act(() => useDesktopCommandDefaultsStore.getState().toggleTarget('tester', `${button.command}::destination`, target));
 fireEvent.click(screen.getByRole('button',{name:/Combat: Give/}));
 expect(handleButtonClick).toHaveBeenCalledWith(expect.objectContaining({command:'give flask 2.guard'}), expect.anything());
});

it('resolves only a live matching target and sends the exact current selector', () => {
 const current = {...target, id:'room:updated'};
 expect(resolveDesktopRememberedTarget(target, [])).toBeUndefined();
 expect(resolveDesktopRememberedTarget(target, [current])).toEqual(current);
 expect(resolveDesktopRememberedTarget(target, [current, {...current, id:'another'}])).toBeUndefined();
 const handleButtonClick=vi.fn();
 const controller={game:{handleButtonClick}} as unknown as ReturnType<typeof useCommandTreeController>;
 const button=createButton({id:'follow', label:'Follow', command:'follow %n', setId:'combat'});
 const event={} as React.MouseEvent;
 executeDesktopRememberedTarget(controller, button, current, event);
 expect(handleButtonClick).toHaveBeenCalledWith(expect.objectContaining({command:'follow %n'}), event, '2.guard', undefined, undefined);
});
