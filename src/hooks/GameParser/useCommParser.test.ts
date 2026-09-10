// @vitest-environment jsdom
/**
 * @file useCommParser.test.ts
 * @description Unit tests for comm parser verifying strict XML requirement for comm bubbles.
 */

import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useCommParser, CommParserDeps } from './useCommParser';

describe('useCommParser - XML comm requirement', () => {
    const createDeps = (): CommParserDeps => ({
        pendingGmcpCommRef: { current: null },
        lastCommIdBySenderRef: { current: new Map() },
        lastCommMsgIdRef: { current: null },
        lastCommTimeRef: { current: 0 }
    });

    it('does NOT treat room descriptions containing "tell" as comm bubbles', () => {
        const { result } = renderHook(() => useCommParser(createDeps()));

        const roomDescLine = 'The soft drip of falling water can be heard falling somewhere off in the distance. The acoustics are tricky and it is tough to tell: whence the sound came. The road continues to the east and west.';
        const parsed = result.current.parseComm(roomDescLine, roomDescLine, roomDescLine.toLowerCase());

        expect(parsed.msgType).toBe('game');
        expect(parsed.replyCommand).toBeUndefined();
        expect(parsed.replyTarget).toBeUndefined();
        expect(parsed.commSender).toBeUndefined();
    });

    it('does NOT treat non-XML text containing "tells", "says", "whispers" as comm bubbles', () => {
        const { result } = renderHook(() => useCommParser(createDeps()));

        const testLines = [
            'An ancient inscription says: "Speak friend and enter."',
            'He whispers a secret prayer under his breath.',
            'The wind shouts across the valley.',
            'She sings a mournful melody.'
        ];

        for (const line of testLines) {
            const parsed = result.current.parseComm(line, line, line.toLowerCase());
            expect(parsed.msgType).toBe('game');
            expect(parsed.replyCommand).toBeUndefined();
        }
    });

    it('correctly detects genuine XML-wrapped communications', () => {
        const { result } = renderHook(() => useCommParser(createDeps()));

        const tellLine = "<tell>Elrond tells you 'Welcome to Rivendell.'</tell>";
        const tellParsed = result.current.parseComm(tellLine, "Elrond tells you 'Welcome to Rivendell.'", tellLine.toLowerCase());
        expect(tellParsed.msgType).toBe('comm');
        expect(tellParsed.replyCommand).toBe('tell');
        expect(tellParsed.replyTarget).toBe('Elrond');

        const sayLine = "<say>A traveler says 'Hello there.'</say>";
        const sayParsed = result.current.parseComm(sayLine, "A traveler says 'Hello there.'", sayLine.toLowerCase());
        expect(sayParsed.msgType).toBe('comm');
        expect(tellParsed.replyCommand).toBe('tell');

        const xmlEscapedTell = "&lt;tell&gt;Gandalf tells you 'Fly, you fools!'&lt;/tell&gt;";
        const escapedParsed = result.current.parseComm(xmlEscapedTell, "Gandalf tells you 'Fly, you fools!'", xmlEscapedTell.toLowerCase());
        expect(escapedParsed.msgType).toBe('comm');
        expect(escapedParsed.replyCommand).toBe('tell');
        expect(escapedParsed.replyTarget).toBe('Gandalf');
    });

    it('keeps XML social output out of comm bubbles', () => {
        const { result } = renderHook(() => useCommParser(createDeps()));

        const socialLine = '<social>You smile viciously.</social>';
        const parsed = result.current.parseComm(socialLine, 'You smile viciously.', socialLine.toLowerCase());

        expect(parsed.msgType).toBe('game');
        expect(parsed.isSocial).toBe(true);
        expect(parsed.replyCommand).toBeUndefined();
    });
});
