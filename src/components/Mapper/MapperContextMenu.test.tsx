/** @file MapperContextMenu.test.tsx — Mobile room selection must not activate newly opened actions. */
// @vitest-environment jsdom
import React, {act} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {afterEach, beforeEach, expect, it, vi} from 'vitest';
import {MapperContextMenu} from './MapperContextMenu';

// --- Menu Setup Section ---
let host: HTMLDivElement;
let root: Root;
const onInfo = vi.fn();
const onWalkStart = vi.fn();
const onFind = vi.fn();
const onClose = vi.fn();
beforeEach(() => {
    vi.clearAllMocks();
    host = document.createElement('div');
    host.className = 'app-container';
    document.body.append(host);
    root = createRoot(host);
});
afterEach(async () => {
    await act(async () => root.unmount());
    host.remove();
});
const renderMenu = async (isMobile = true) => {
    await act(async () => root.render(<MapperContextMenu x={100} y={200} roomId="room-1"
        mode="play" isMobile={isMobile} isDarkMode onInfo={onInfo} onClose={onClose}
        onWalkStart={onWalkStart} onFind={onFind} onDelete={vi.fn()} onAddMarker={vi.fn()}
        onAddRoom={vi.fn()} onSyncLocation={vi.fn()}/>));
};
const buttonFor = (label: string) => Array.from(host.querySelectorAll('button'))
    .find(button => button.textContent?.trim() === label)!;
const send = async (button: HTMLButtonElement, type: string, detail = 1) => {
    await act(async () => { button.dispatchEvent(new MouseEvent(type, {bubbles: true, cancelable: true, detail})); });
};

// --- Opening Tap and Deliberate Actions Section ---
it('ignores the opening tap click, then accepts a separate tap on each action', async () => {
    await renderMenu();
    for (const label of ['Room Info', 'Walk Here', 'Find']) await send(buttonFor(label), 'click');
    expect(onInfo).not.toHaveBeenCalled();
    expect(onWalkStart).not.toHaveBeenCalled();
    expect(onFind).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();

    for (const label of ['Room Info', 'Walk Here', 'Find']) {
        const button = buttonFor(label);
        await send(button, 'pointerdown');
        await send(button, 'pointerup');
        await send(button, 'click');
    }
    expect(onInfo).toHaveBeenCalledTimes(1);
    expect(onWalkStart).toHaveBeenCalledExactlyOnceWith('room-1');
    expect(onFind).toHaveBeenCalledTimes(1);
});

it('rejects a cancelled press and a click on a different action', async () => {
    await renderMenu();
    await send(buttonFor('Room Info'), 'pointerdown');
    await send(buttonFor('Room Info'), 'pointercancel');
    await send(buttonFor('Room Info'), 'click');
    await send(buttonFor('Room Info'), 'pointerdown');
    await send(buttonFor('Walk Here'), 'click');
    expect(onInfo).not.toHaveBeenCalled();
    expect(onWalkStart).not.toHaveBeenCalled();
});

it('preserves keyboard activation and desktop click behavior', async () => {
    await renderMenu();
    await send(buttonFor('Room Info'), 'click', 0);
    expect(onInfo).toHaveBeenCalledTimes(1);
    await renderMenu(false);
    await send(buttonFor('Walk Here'), 'click');
    expect(onWalkStart).toHaveBeenCalledExactlyOnceWith('room-1');
});
