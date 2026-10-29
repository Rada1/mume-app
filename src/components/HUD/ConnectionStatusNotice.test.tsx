/** @file ConnectionStatusNotice.test.tsx — Connection feedback and reconnect behavior. */
// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ConnectionStatusNotice } from './ConnectionStatusNotice';

const connection = vi.hoisted(() => ({
    status: 'disconnected',
    sessionMode: 'live',
    telnet: { connect: vi.fn() },
}));
vi.mock('../../context/GameContext', () => ({ useGame: () => connection }));

// --- Connection state and actions ---
afterEach(() => { cleanup(); vi.clearAllMocks(); connection.status = 'disconnected'; connection.sessionMode = 'live'; });

describe('ConnectionStatusNotice', () => {
    it('shows the disconnected state and reconnects on request', () => {
        render(<ConnectionStatusNotice />);
        expect(screen.getByText('Disconnected')).toBeTruthy();
        expect(connection.telnet.connect).not.toHaveBeenCalled();
        fireEvent.click(screen.getByRole('button', { name: /reconnect/i }));
        expect(connection.telnet.connect).toHaveBeenCalledOnce();
    });

    it('shows connecting feedback, then disappears on connection', () => {
        connection.status = 'connecting';
        const { rerender } = render(<ConnectionStatusNotice />);
        expect(screen.getByText('Connecting to MUME…')).toBeTruthy();
        expect(screen.queryByRole('button')).toBeNull();
        connection.status = 'connected';
        rerender(<ConnectionStatusNotice />);
        expect(screen.queryByRole('status')).toBeNull();
    });

    it('does not show a disconnected warning during replay', () => {
        connection.sessionMode = 'replay';
        render(<ConnectionStatusNotice />);
        expect(screen.queryByRole('status')).toBeNull();
    });
});
