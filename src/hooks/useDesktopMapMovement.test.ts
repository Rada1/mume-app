// @vitest-environment jsdom
/** @file useDesktopMapMovement.test.ts — Desktop-only map commands use the shared command path. */
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { useDesktopMapMovement } from './useDesktopMapMovement';
import { useTacticalCommandPrefixStore } from '../stores/useTacticalCommandPrefixStore';
import { createElement } from 'react';
import { render, screen } from '@testing-library/react';
import { DesktopMapMovementPad } from '../components/Mapper/DesktopMapMovementPad';

// --- Game context fixture ---
const game = vi.hoisted(() => ({gameState:'playing', viewport:{isMobile:false}, isSpectateMode:false,
    executeCommand:vi.fn(), setCommandPreview:vi.fn()}));
vi.mock('../context/GameContext', () => ({useGame: () => game, useVitals: () => ({target:null})}));
afterEach(() => {
    cleanup(); vi.clearAllMocks(); useTacticalCommandPrefixStore.getState().clearPrefix();
    game.gameState='playing'; game.viewport.isMobile=false; game.isSpectateMode=false;
});

// --- Visibility and execution ---
it('renders the mobile menu variant with direction, Follow and Flee buttons', () => {
    render(createElement(DesktopMapMovementPad));
    const pad=screen.getByRole('group', {name:'Desktop map movement'});
    expect(pad.classList.contains('movement-pad-menu')).toBe(true);
    expect(pad.classList.contains('movement-pad-map')).toBe(false);
    expect(screen.getByRole('button', {name:/North/i})).toBeTruthy();
    expect(screen.getByRole('button', {name:/Follow a room entity/i})).toBeTruthy();
    expect(screen.getByRole('button', {name:'Flee'})).toBeTruthy();
});

it('places the movement pad in the desktop command dock when a slot is available', async () => {
    const app = document.createElement('div');
    app.className = 'app-container';
    const slot = document.createElement('div');
    slot.id = 'desktop-movement-pad-slot';
    app.append(slot);
    document.body.append(app);
    const view = render(createElement(DesktopMapMovementPad));
    const pad = screen.getByRole('group', {name:'Desktop map movement'});
    expect(slot.contains(pad)).toBe(true);
    expect(pad.closest('.desktop-map-movement-pad')?.classList.contains('is-docked')).toBe(true);
    view.unmount();
    app.remove();
});

it('sends a desktop movement button through the command executor and clears its preview', () => {
    const {result} = renderHook(() => useDesktopMapMovement());
    expect(result.current.visible).toBe(true);
    act(() => result.current.preview('n'));
    expect(game.setCommandPreview).toHaveBeenLastCalledWith('n');
    useTacticalCommandPrefixStore.getState().armFollowers();
    act(() => result.current.move('n'));
    expect(game.executeCommand).toHaveBeenCalledWith('order followers n', false, false, false, false,
        {fromUi:true, shouldFocus:false});
    expect(game.setCommandPreview).toHaveBeenLastCalledWith(null);
});

it.each(['mobile','spectate','login'])('hides and ignores commands during %s', mode => {
    game.viewport.isMobile=mode==='mobile'; game.isSpectateMode=mode==='spectate';
    game.gameState=mode==='login'?'account':'playing';
    const {result} = renderHook(() => useDesktopMapMovement());
    expect(result.current.visible).toBe(false);
    act(() => result.current.move('n'));
    expect(game.executeCommand).not.toHaveBeenCalled();
});
