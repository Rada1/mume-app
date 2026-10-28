/** @file DesktopCommandPin.test.tsx — Desktop pins select defaults without executing actions. */
// @vitest-environment jsdom
import React from 'react';
import {act, cleanup, fireEvent, render, renderHook} from '@testing-library/react';
import {afterEach, expect, it, vi} from 'vitest';
import {DesktopCommandPin} from './DesktopCommandPin';
import {useDesktopCommandDefaults} from '../../hooks/useDesktopCommandDefaults';
import {useDesktopCommandDefaultsStore} from '../../stores/useDesktopCommandDefaultsStore';
import {useMobileCommandTilesStore} from '../../stores/useMobileCommandTilesStore';
import {createButton} from '../../utils/buttonFactory';
import {CommandTreeSocialTargets} from './CommandTreeSocialTargets';
import {CommandTargetMenuContext} from '../../context/CommandTargetMenuContext';
import {COMMAND_TREE_SOCIAL_BUTTON} from '../../utils/commandTreeSocial';
import type {useCommandTreeController} from '../../hooks/useCommandTreeController';
import type {useCommandTree} from '../../hooks/useCommandTree';
import {useMobileCommandTiles} from '../../hooks/useMobileCommandTiles';
import {DesktopCommandCategoryNav} from './DesktopCommandCategoryNav';
import {MOBILE_COMMAND_TILES} from '../../utils/mobileCommandTiles';

vi.mock('../../hooks/useMobileCommandTiles', () => ({useMobileCommandTiles:vi.fn()}));

// --- Independent pin and per-character default ---
afterEach(() => {
 cleanup();
 useDesktopCommandDefaultsStore.setState({characters:{}});
 useMobileCommandTilesStore.setState({characters:{},customized:{},socialDefaultUpdated:{}});
});

it('sets a default without executing the command row', () => {
 const select=vi.fn(), execute=vi.fn(), parent=vi.fn();
 const view=render(<div onClick={parent}><DesktopCommandPin label="Look" selected={false} onSelect={select}>
  <button onClick={execute}>Look</button>
 </DesktopCommandPin></div>);
 fireEvent.click(view.getByRole('button',{name:'Set Look as click action'}));
 expect(select).toHaveBeenCalledOnce();
 expect(execute).not.toHaveBeenCalled();
 expect(parent).not.toHaveBeenCalled();
 fireEvent.click(view.getByRole('button',{name:'Look'}));
 expect(execute).toHaveBeenCalledOnce();
});

it('saves desktop defaults per character without changing mobile gestures and falls back when unavailable', () => {
 const hit=createButton({id:'hit',label:'Hit',command:'hit',setId:'combat'});
 const kick=createButton({id:'kick',label:'Kick',command:'kick',setId:'combat'});
 const mobile={...hit,id:'mobile-tile-combat',swipeCommands:{up:'kick'}};
 useMobileCommandTilesStore.setState({characters:{tester:[mobile]}});
 const {result,rerender}=renderHook(({name}) => useDesktopCommandDefaults(name),{initialProps:{name:'Tester'}});
 expect(result.current.resolve('combat',[hit,kick])?.command).toBe('hit');
 act(() => result.current.setDefault('combat',kick));
 expect(result.current.resolve('combat',[hit,kick])?.command).toBe('kick');
 expect(result.current.resolve('combat',[hit])?.command).toBe('hit');
 expect(useMobileCommandTilesStore.getState().characters.tester[0]).toEqual(mobile);
 rerender({name:'Other'});
 expect(result.current.resolve('combat',[hit,kick])).toBeUndefined();
 rerender({name:'Tester'});
 expect(result.current.resolve('combat',[hit,kick])?.command).toBe('kick');
});

it('pins required social options without sending a command', () => {
 const executeCommand=vi.fn();
 const controller={game:{characterName:'Tester',executeCommand},entries:[]} as unknown as ReturnType<typeof useCommandTreeController>;
 const view=render(<CommandTargetMenuContext.Provider value={true}>
  <CommandTreeSocialTargets controller={controller} button={COMMAND_TREE_SOCIAL_BUTTON} targets={[]} desktopPin/>
 </CommandTargetMenuContext.Provider>);
 fireEvent.click(view.getByRole('button',{name:'Signals'}));
 fireEvent.click(view.getByRole('button',{name:'Raise'}));
 expect(view.queryByRole('button',{name:'Set Raise as click action'})).toBeNull();
 fireEvent.click(view.getByRole('button',{name:'Set Raise hand as click action'}));
 expect(useDesktopCommandDefaultsStore.getState().characters.tester.social).toBe('raise hand');
 expect(executeCommand).not.toHaveBeenCalled();
});

it('updates the desktop category label and executes the pinned command on click', () => {
 const hit=createButton({id:'hit',label:'Hit',command:'hit',setId:'combat'});
 const kick=createButton({id:'kick',label:'Kick',command:'kick',setId:'combat'});
 const execute=vi.fn();
 vi.mocked(useMobileCommandTiles).mockReturnValue({tiles:[{id:'combat',commands:[hit,kick],button:hit}],
  execute,usesTargetChip:()=>false} as unknown as ReturnType<typeof useMobileCommandTiles>);
 const controller={game:{characterName:'Tester'}} as unknown as ReturnType<typeof useCommandTreeController>;
 const tree={grouped:[]} as unknown as ReturnType<typeof useCommandTree>;
 const combat=MOBILE_COMMAND_TILES.find(tile=>tile.id==='combat')!;
 const view=render(<DesktopCommandCategoryNav categories={[combat]} selectedId={null} onSelect={vi.fn()}
  onPointerEnter={vi.fn()} onPointerLeave={vi.fn()} controller={controller} tree={tree}/>);
 act(() => useDesktopCommandDefaultsStore.getState().setDefault('tester','combat','kick'));
 fireEvent.click(view.getByRole('button',{name:/Combat: Kick/}));
 expect(execute).toHaveBeenCalledWith(kick,expect.anything());
});
