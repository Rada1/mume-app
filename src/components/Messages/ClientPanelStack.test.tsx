/** @file ClientPanelStack.test.tsx — Verifies panel resizing when single or paired panels are open. */
// @vitest-environment jsdom
import React, { act } from 'react';
import { render, cleanup, fireEvent } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ClientPanelStack } from './ClientPanelStack';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { useHelpStore } from '../../stores/useHelpStore';
import { useClientPanelStackStore } from '../../stores/useClientPanelStackStore';

vi.mock('../Drawers/DrawerResizeHandle', () => ({
    DrawerResizeHandle: () => <div data-testid="drawer-resize-handle" />
}));

vi.mock('./GroupStatusWindow', () => ({
    default: () => <div data-testid="group-status-window">Group Window</div>
}));

vi.mock('./ChatTranscriptWindow', () => ({
    default: () => <div data-testid="chat-transcript-window">Chat Window</div>
}));

vi.mock('../Help/HelpPanel', () => ({
    default: () => <div data-testid="help-panel">Help Panel</div>
}));

describe('ClientPanelStack', () => {
    beforeEach(() => {
        useSettingsStore.setState({ showGroupPanel: false, showChatWindow: false });
        useHelpStore.setState({ isOpen: false });
        useClientPanelStackStore.setState({
            order: ['entities', 'chat', 'details', 'help'],
            weights: { entities: 1.2, chat: 1.15, details: 1.45, help: 1.4 },
            singleHeights: { entities: 1, chat: 1, details: 1, help: 1 },
            detailsOpen: true,
            detailsEnabled: true
        });
    });

    afterEach(() => {
        cleanup();
    });

    it('renders a resize handle when details is the only open panel', () => {
        const { container } = render(<ClientPanelStack />);
        const handles = container.querySelectorAll('.client-panel-stack-resize-handle');
        expect(handles.length).toBe(1);
        expect(handles[0].getAttribute('aria-label')).toBe('Resize details panel height');
    });

    it('adjusts single panel height via arrow keys on the resize handle', () => {
        const { container } = render(<ClientPanelStack />);
        const handle = container.querySelector('.client-panel-stack-resize-handle') as HTMLElement;
        expect(handle).not.toBeNull();

        // Mock getBoundingClientRect
        const stack = container.querySelector('.client-panels-stack') as HTMLElement;
        const detailsSlot = container.querySelector('[data-client-panel-id="details"]') as HTMLElement;
        vi.spyOn(stack, 'getBoundingClientRect').mockReturnValue({ height: 1000 } as DOMRect);
        vi.spyOn(detailsSlot, 'getBoundingClientRect').mockReturnValue({ height: 988 } as DOMRect);

        act(() => {
            fireEvent.keyDown(handle, { key: 'ArrowUp' });
        });

        const storeRatio = useClientPanelStackStore.getState().singleHeights.details;
        expect(storeRatio).toBeLessThan(1);
    });

    it('renders handles between adjacent panels when multiple panels are open', () => {
        useSettingsStore.setState({ showGroupPanel: true, showChatWindow: true });
        const { container } = render(<ClientPanelStack />);
        const handles = container.querySelectorAll('.client-panel-stack-resize-handle');
        // entities, chat, details are open => 2 handles between the 3 panels
        expect(handles.length).toBe(2);
        expect(handles[0].getAttribute('aria-label')).toContain('entities and chat');
        expect(handles[1].getAttribute('aria-label')).toContain('chat and details');
    });
});
