/** @file commandDefaultTarget.test.ts — Defaults use only action-valid targets and preserve observation capture. */
import { expect, it, vi } from 'vitest';
import type { MouseEvent } from 'react';
import type { useCommandTreeController } from './useCommandTreeController';
import type { CommandActionTargetEntry } from '../objects/commandActionTargetModel';
import { createButton } from '../utils/buttonFactory';
vi.mock('./useCommandTreeObservation', () => ({ executeCommandTreeObservation: vi.fn() }));
import { executeCommandTreeObservation } from './useCommandTreeObservation';
import { executeDefaultCommandTarget } from './commandDefaultTarget';
// --- Execution Checks ---
const entry: CommandActionTargetEntry = { id:'orc', label:'Orc guard', category:'cat-enemy', keyword:'guard', context:'guard', group:'npcs', scope:'room' };
const event = {} as MouseEvent;
const button = createButton({id:'kick', label:'Kick', command:'kick %n', setId:'trait-warrior'});
const fixture = () => {
    const click = vi.fn();
    const controller = { isHelpMode:false, game:{gameState:'playing', isSpectateMode:false, handleButtonClick:click}, vitals:{target:'guard'} } as unknown as ReturnType<typeof useCommandTreeController>;
    return { controller, click };
};
it('executes a valid current target through normal button handling', () => {
    const {controller, click} = fixture();
    expect(executeDefaultCommandTarget(controller, button, [entry], event)).toBe(true);
    expect(click).toHaveBeenCalledWith(button, event, 'guard', undefined, undefined);
});
it('does not default to a target absent from the valid action targets', () => {
    const {controller, click} = fixture();
    expect(executeDefaultCommandTarget(controller, button, [], event)).toBe(false);
    expect(click).not.toHaveBeenCalled();
});
it('preserves help inspection and spectate restrictions', () => {
    const {controller, click} = fixture();
    controller.isHelpMode = true;
    expect(executeDefaultCommandTarget(controller, button, [entry], event)).toBe(false);
    controller.isHelpMode = false;
    controller.game.isSpectateMode = true;
    expect(executeDefaultCommandTarget(controller, button, [entry], event)).toBe(false);
    expect(click).not.toHaveBeenCalled();
});
it('routes Look through captured observation output', () => {
    const {controller, click} = fixture();
    const look = createButton({id:'v2-observation-look', label:'Look', command:'look %n', setId:'trait-utility'});
    expect(executeDefaultCommandTarget(controller, look, [entry], event)).toBe(true);
    expect(executeCommandTreeObservation).toHaveBeenCalledWith(controller, entry, 'look');
    expect(click).not.toHaveBeenCalled();
});
it.each(["cast 'cure light' %n", "cast 'shroud' %n", "cast 'strength' %n", 'bandage %n', 'protect %n'])('does not auto-aim beneficial ability %s at a combat target', command => {
    const {controller, click} = fixture();
    const friendly = createButton({id:'friendly', label:'Ability', command, setId:'trait-utility'});
    expect(executeDefaultCommandTarget(controller, friendly, [entry], event)).toBe(false);
    expect(click).not.toHaveBeenCalled();
});
it('keeps offensive energy drain aimed despite its cyan command color', () => {
    const {controller, click} = fixture();
    const offense = createButton({id:'drain', label:'Energy Drain', command:"cast 'energy drain' %n", setId:'trait-offense'});
    expect(executeDefaultCommandTarget(controller, offense, [entry], event)).toBe(true);
    expect(click).toHaveBeenCalled();
});
