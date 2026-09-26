import { describe, it, expect } from 'vitest';
import { computeDockedRight, computeDockedTop, getMobilePanelHeight, computeDockedPanelStyle, getDockedWidth, DockedPanelId } from './dockedPanelUtils';

describe('computeDockedRight', () => {
    it('places the rightmost open panel flush with the edge', () => {
        const active: DockedPanelId[] = ['chat', 'players', 'help'];
        expect(computeDockedRight('chat', active)).toBe('0px');
    });

    it('returns offset calculated from preceding panel for the second open panel', () => {
        const active: DockedPanelId[] = ['chat', 'players'];
        expect(computeDockedRight('players', active)).toBe(`calc(${getDockedWidth('chat')})`);
    });

    it('places a lone help pane flush with the edge', () => {
        const active: DockedPanelId[] = ['help'];
        expect(computeDockedRight('help', active)).toBe('0px');
    });

    it('slides help over when chat and players are both open', () => {
        const active: DockedPanelId[] = ['chat', 'players', 'help'];
        expect(computeDockedRight('help', active)).toBe(`calc(${getDockedWidth('chat')} + ${getDockedWidth('players')})`);
    });

    it('slides archive and editor to the left of help', () => {
        const active: DockedPanelId[] = ['chat', 'help', 'archive', 'editor'];
        expect(computeDockedRight('chat', active)).toBe('0px');
        expect(computeDockedRight('help', active)).toBe(`calc(${getDockedWidth('chat')})`);
        expect(computeDockedRight('archive', active)).toBe(`calc(${getDockedWidth('chat')} + ${getDockedWidth('help')})`);
        expect(computeDockedRight('editor', active)).toBe(`calc(${getDockedWidth('chat')} + ${getDockedWidth('help')} + ${getDockedWidth('archive')})`);
    });

    it('keeps Commands closest to the log when several panes are open', () => {
        const active: DockedPanelId[] = ['help', 'chat', 'commands'];
        expect(computeDockedRight('commands', active)).toBe(`calc(${getDockedWidth('help')} + ${getDockedWidth('chat')})`);
    });
});

describe('mobile docking and stacking', () => {
    it('returns full-height mobile docked height', () => {
        expect(getMobilePanelHeight(1)).toBe('calc(100dvh - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px) - 62px)');
        expect(getMobilePanelHeight(2)).toBe('calc(100dvh - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px) - 62px)');
    });

    it('positions panels from top below header on mobile', () => {
        const active: DockedPanelId[] = ['chat', 'players'];
        expect(computeDockedTop('chat', active)).toBe('calc(env(safe-area-inset-top, 0px) + 50px)');
        expect(computeDockedTop('players', active)).toBe('calc(env(safe-area-inset-top, 0px) + 50px)');
    });

    it('generates mobile-specific docked style with full width and top-to-bottom positioning', () => {
        const active: DockedPanelId[] = ['chat'];
        const style = computeDockedPanelStyle('chat', active, true);
        expect(style.left).toBe('8px');
        expect(style.right).toBe('8px');
        expect(style.width).toBe('calc(100% - 16px)');
        expect(style.bottom).toBe('calc(env(safe-area-inset-bottom, 0px) + 10px)');
        expect(style.top).toBe('calc(env(safe-area-inset-top, 0px) + 50px)');
    });

    it('generates desktop-specific docked style with right-docked offset', () => {
        const active: DockedPanelId[] = ['chat', 'players'];
        const style = computeDockedPanelStyle('chat', active, false);
        expect(style.right).toBe('0px');
        expect(style.left).toBeUndefined();
        expect(style.top).toBe('calc(env(safe-area-inset-top, 0px) + 52px)');
        expect(style.bottom).toBe('calc(env(safe-area-inset-bottom, 0px) + 10px)');
    });
});
