import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('MessageLog animations in Immersion Mode', () => {
    const cssPath = path.resolve(__dirname, 'MessageLog.css');
    const tsxPath = path.resolve(__dirname, 'MessageLog.tsx');

    const cssContent = fs.readFileSync(cssPath, 'utf8');
    const tsxContent = fs.readFileSync(tsxPath, 'utf8');

    it('contains rule disabling decorative text animations when immersion-mode is absent', () => {
        expect(cssContent).toContain('.app-container:not(.immersion-mode) .message-log .log-text-word');
        expect(cssContent).not.toContain('html:not(.immersion-mode)');
        expect(cssContent).toContain('animation: none !important;');
    });

    it('scopes letter and word ripple animations to immersion-mode', () => {
        expect(cssContent).toContain('.immersion-mode .log-char');
        expect(cssContent).toContain('.immersion-mode .log-word');
        // Unscoped .log-char shouldn't have animation
        const logCharBlock = cssContent.match(/\.log-char\s*\{([^}]+)\}/);
        expect(logCharBlock).not.toBeNull();
        expect(logCharBlock![1]).not.toContain('animation:');
    });

    it('does not apply the standard-mode focus reveal', () => {
        expect(cssContent).not.toContain('focus-reveal');
        expect(tsxContent).not.toContain('focusRevealMessageId');
        expect(tsxContent).not.toContain('focus-reveal-active');
    });

    it('does not apply a continuous undulating wave to immersion text', () => {
        expect(cssContent).not.toContain('continuous-text-undulate');
    });

    it('gates runtime decorative animation states and layout effects by isImmersionMode in MessageLog.tsx', () => {
        expect(tsxContent).toContain('const isImmersionMode = useSettingsStore(s => s.isImmersionMode);');
        expect(tsxContent).toContain('isImmersionMode && isRecent && (msg.isHitImpact || msg.isDamageImpact)');
        expect(tsxContent).toContain('isImmersionMode && (msg.isHitImpact || msg.isDamageImpact || msg.isRipMessage)');
        expect(tsxContent).toContain('!isImmersionMode || !msg.audioSheen');
        expect(tsxContent).toContain('isImmersionMode && msg.audioSheen');
    });

    const hookPath = path.resolve(__dirname, '../../hooks/useMessageLog.ts');
    const hookContent = fs.readFileSync(hookPath, 'utf8');

    it('keeps room arrival grouping without text stagger metadata', () => {
        expect(cssContent).toContain('.immersion-mode .message.movement .message-content .log-text-word');
        expect(cssContent).not.toContain('room-jiggle-active');
        expect(cssContent).not.toContain('@keyframes room-line-jiggle');
        expect(tsxContent).not.toContain('isRoomJiggleActive');
        expect(tsxContent).toContain('extractRoomDescription(msg.html)');
        expect(tsxContent).not.toContain('roomLineIndex');
        expect(tsxContent).not.toContain('roomContentCount');

        // Room arrival grouping remains available for the room card layout.
        expect(hookContent).toContain('isRoomArrival');
    });

    it('ensures chat panel text does not receive ripple or undulation animations', () => {
        const chatCssPath = path.resolve(__dirname, 'ChatWindow.css');
        const chatCssContent = fs.readFileSync(chatCssPath, 'utf8');

        expect(chatCssContent).toContain('.chat-window-panel .log-text-word');
        expect(chatCssContent).toContain('animation: none !important;');
        expect(cssContent).toContain('.immersion-mode .message-log .comm-bubble .log-text-word');
    });
});
