/** @file ParleyChannelChip.docked.test.tsx — Desktop command-bar history and floating channels. */
// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { ParleyChannelChip } from './ParleyChannelChip';

vi.mock('../../context/GameContext', () => ({ useGame: () => ({ viewport: { isMobile: false }, roomPlayers: [], roomNpcs: [], groupMembers: [] }) }));
vi.mock('../../stores/useSettingsStore', () => ({ useSettingsStore: () => ({}) }));
vi.mock('../../hooks/useParleyMobileBounds', () => ({ useParleyMobileBounds: () => null }));
vi.mock('../../utils/inlineActionModel', async importOriginal => ({ ...await importOriginal<typeof import('../../utils/inlineActionModel')>(), getInlineGlowColor: () => '#fff' }));
vi.mock('./ParleyHistory', () => ({ ParleyHistory: ({ onClose }: { onClose: () => void }) => <section aria-label="All communication history"><button onClick={onClose}>Close history</button></section> }));
afterEach(() => { cleanup(); document.getElementById('desktop-map-chat-history-slot')?.remove(); });

// --- Docked history lifecycle ---
it('keeps history under the map after dismissing the floating channel menu', () => {
    const slot = document.createElement('div');
    slot.id = 'desktop-map-chat-history-slot';
    document.body.appendChild(slot);
    render(<div className="message-log-docked-input"><ParleyChannelChip command="none" target={null} whoList={[]} iconOnly requestWhoList={vi.fn()} onChoose={vi.fn()} /></div>);
    fireEvent.click(screen.getByRole('button', { name: 'Choose chat channel' }));
    expect(slot.querySelector('[aria-label="All communication history"]')).toBeTruthy();
    expect(screen.getByRole('dialog', { name: 'Communication' }).contains(slot)).toBe(false);
    fireEvent.pointerDown(document.body);
    expect(screen.queryByRole('dialog', { name: 'Communication' })).toBeNull();
    expect(slot.querySelector('[aria-label="All communication history"]')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Close history' }));
    expect(slot.children.length).toBe(0);
});

it('keeps directed channel recipient selection working in the compact picker', () => {
    const slot = document.createElement('div'); slot.id = 'desktop-map-chat-history-slot'; document.body.appendChild(slot);
    const onChoose = vi.fn(), requestWhoList = vi.fn();
    render(<div className="message-log-docked-input"><ParleyChannelChip command="none" target={null} whoList={['Elena']} iconOnly requestWhoList={requestWhoList} onChoose={onChoose} /></div>);
    fireEvent.click(screen.getByRole('button', { name:'Choose chat channel' }));
    expect(screen.getByRole('dialog', { name:'Communication' }).style.width).toBe('300px');
    fireEvent.click(screen.getByRole('button', { name:'tell' }));
    expect(requestWhoList).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole('button', { name:'Elena' }));
    expect(onChoose).toHaveBeenCalledWith('tell', 'Elena');
});
