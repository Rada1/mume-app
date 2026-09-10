import { describe, it, expect } from 'vitest';
import { computeDockedRight, computeDockedTop, getMobilePanelHeight, computeDockedPanelStyle, DockedPanelId } from './dockedPanelUtils';

describe('computeDockedRight', () => {
    it('returns 10px for the rightmost open panel', () => {
        const active: DockedPanelId[] = ['chat', 'players', 'help'];
        expect(computeDockedRight('chat', active)).toBe('10px');
    });

    it('returns offset calculated from preceding panel for the second open panel', () => {
        const active: DockedPanelId[] = ['chat', 'players'];
        expect(computeDockedRight('players', active)).toBe('calc(10px + var(--desktop-chat-width, 24vw) + 8px)');
    });

    it('returns 10px if only help is open', () => {
        const active: DockedPanelId[] = ['help'];
        expect(computeDockedRight('help', active)).toBe('10px');
    });

    it('slides help over when chat and players are both open', () => {
        const active: DockedPanelId[] = ['chat', 'players', 'help'];
        expect(computeDockedRight('help', active)).toBe('calc(10px + var(--desktop-chat-width, 24vw) + 8px + var(--desktop-players-width, 24vw) + 8px)');
    });

    it('slides archive and editor to the left of help', () => {
        const active: DockedPanelId[] = ['chat', 'help', 'archive', 'editor'];
        expect(computeDockedRight('chat', active)).toBe('10px');
        expect(computeDockedRight('help', active)).toBe('calc(10px + var(--desktop-chat-width, 24vw) + 8px)');
        expect(computeDockedRight('archive', active)).toBe('calc(10px + var(--desktop-chat-width, 24vw) + 8px + var(--desktop-help-width, 28vw) + 8px)');
        expect(computeDockedRight('editor', active)).toBe('calc(10px + var(--desktop-chat-width, 24vw) + 8px + var(--desktop-help-width, 28vw) + 8px + var(--desktop-archive-width, 34vw) + 8px)');
    });
});

describe('mobile docking and stacking', () => {
    it('calculates dynamic mobile height based on active panel count', () => {
        expect(getMobilePanelHeight(1)).toBe('38vh');
        expect(getMobilePanelHeight(2)).toBe('30vh');
        expect(getMobilePanelHeight(3)).toBe('24vh');
    });

    it('stacks panels downward from the top on mobile', () => {
        const active: DockedPanelId[] = ['chat', 'players'];
        expect(computeDockedTop('chat', active)).toBe('calc(env(safe-area-inset-top, 0px) + 50px)');
        expect(computeDockedTop('players', active)).toBe('calc(calc(env(safe-area-inset-top, 0px) + 50px) + 1 * (var(--mobile-docked-height, 30vh) + 8px))');
    });

    it('generates mobile-specific docked style with full width and top positioning', () => {
        const active: DockedPanelId[] = ['chat'];
        const style = computeDockedPanelStyle('chat', active, true);
        expect(style.left).toBe('8px');
        expect(style.right).toBe('8px');
        expect(style.width).toBe('calc(100% - 16px)');
        expect(style.bottom).toBe('auto');
        expect(style.top).toBe('calc(env(safe-area-inset-top, 0px) + 50px)');
    });

    it('generates desktop-specific docked style with right-docked offset', () => {
        const active: DockedPanelId[] = ['chat', 'players'];
        const style = computeDockedPanelStyle('chat', active, false);
        expect(style.right).toBe('10px');
        expect(style.left).toBeUndefined();
        expect(style.top).toBe('calc(env(safe-area-inset-top, 0px) + 52px)');
        expect(style.bottom).toBe('calc(env(safe-area-inset-bottom, 0px) + 10px)');
    });
});

