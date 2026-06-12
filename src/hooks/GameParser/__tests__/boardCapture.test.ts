/**
 * @file boardCapture.test.ts
 * @description Unit tests for MUME bulletin board capture and parsing.
 * @vitest-environment jsdom
 */

import { describe, expect, it, vi } from 'vitest';
import { useCaptureParser, CaptureParserDeps } from '../useCaptureParser';
import { usePromptParser } from '../usePromptParser';
import { renderHook, act } from '@testing-library/react';
import { parseBoardList, parseBoardRead, parseBoardThreadList } from '../../../utils/boardParser';
import { useArchiveStore } from '../../../stores/useArchiveStore';

describe('Bulletin Board Capture & Parsing', () => {
    const createMockDeps = (): CaptureParserDeps => ({
        captureSession: null,
        setCaptureSession: vi.fn(),
        setInventoryLines: vi.fn(),
        setEqLines: vi.fn(),
        setStatsLines: vi.fn(),
        setPracticeLines: vi.fn(),
        setWhoLines: vi.fn(),
        setWhoList: vi.fn(),
        setScoreLines: vi.fn(),
        setInfoLines: vi.fn(),
        setQuestLines: vi.fn(),
        setAchievementLines: vi.fn(),
        registerEntity: vi.fn(),
        ansiConvert: { toHtml: (s: string) => s },
        captureStage: { current: 'idle' }
    });

    it('detects board list and read triggers', () => {
        const deps = createMockDeps();
        const { result } = renderHook(() => useCaptureParser(deps));

        // Format A Header
        expect(result.current.checkTriggers('Ainur board - 64 messages (out of 92)')).toBe('board_list');
        // Format B Header
        expect(result.current.checkTriggers('Bulletin board for general announcements:')).toBe('board_list');
        // Format B Rows
        expect(result.current.checkTriggers('1103#: Buggy boards (Manwë)')).toBe('board_list');
        expect(result.current.checkTriggers('25508#: A few comments on Mume7 (Fëanor)')).toBe('board_list');
        // Format C (XML-stripped) Rows
        expect(result.current.checkTriggers('32023 : [147:92] emote to the team (Gindil)')).toBe('board_list');
        
        expect(result.current.checkTriggers('- 35263 : Re: [83:48] Crossbow Loading (Rogon)')).toBe('board_list');

        // Board Read Headers
        expect(result.current.checkTriggers('Message 38315 on Yavanna:')).toBe('board_read');
        expect(result.current.checkTriggers('Message 25508 on Yavanna Board:')).toBe('board_read');
        expect(result.current.checkTriggers('Message 1 on Bulletin:')).toBe('board_read');
        
        // Test non-matching lines
        expect(result.current.checkTriggers('You see nothing special.')).toBeNull();
    });

    it('parses board list Format A (legacy), Format B, and Format C (XML-stripped)', () => {
        const linesA = [
            { id: '1', text: 'Message  1:  "Welcome to the board" (Admin) - Tue Jun  9 14:00:00 2026', rawText: '', tokens: [], isHeader: false, isItem: false, html: '' },
            { id: '2', text: 'Message  2:  "Rules and Guidelines" (Staff) - Tue Jun  9 14:05:00 2026', rawText: '', tokens: [], isHeader: false, isItem: false, html: '' }
        ];

        const threadsA = parseBoardList(linesA);
        expect(threadsA.length).toBe(2);
        expect(threadsA[0]).toEqual({
            id: 1,
            subject: 'Welcome to the board',
            author: 'Admin',
            date: 'Tue Jun  9 14:00:00 2026'
        });

        const linesB = [
            { id: '1', text: '1103#: Buggy boards (Manwë)', rawText: '', tokens: [], isHeader: false, isItem: false, html: '' },
            { id: '2', text: '25508#: A few comments on Mume7 (Fëanor)', rawText: '', tokens: [], isHeader: false, isItem: false, html: '' }
        ];

        const threadsB = parseBoardList(linesB);
        expect(threadsB.length).toBe(2);
        expect(threadsB[1]).toEqual({
            id: 25508,
            subject: 'A few comments on Mume7',
            author: 'Fëanor',
            date: ''
        });

        const linesC = [
            { id: '1', text: '32023 : [147:92] emote to the team (Gindil)', rawText: '', tokens: [], isHeader: false, isItem: false, html: '' },
            { id: '2', text: '32024 : [50:70] Session time show minutes as well as hours (Heartfang)', rawText: '', tokens: [], isHeader: false, isItem: false, html: '' }
        ];

        const threadsC = parseBoardList(linesC);
        expect(threadsC.length).toBe(2);
        expect(threadsC[0]).toEqual({
            id: 32023,
            subject: '[147:92] emote to the team',
            author: 'Gindil',
            date: ''
        });
        expect(threadsC[1]).toEqual({
            id: 32024,
            subject: '[50:70] Session time show minutes as well as hours',
            author: 'Heartfang',
            date: ''
        });
    });

    it('parses board thread rows with nested replies', () => {
        const threads = parseBoardThreadList([
            { id: '1', text: '35262 : [83:48] Crossbow Loading (Zekk)', rawText: '', tokens: [], isHeader: false, isItem: false, html: '' },
            { id: '2', text: '- 35263 : Re: [83:48] Crossbow Loading (Rogon)', rawText: '', tokens: [], isHeader: false, isItem: false, html: '' },
            { id: '3', text: '35264 : [220:107] I gave letter to wrong npc (Eorad)', rawText: '', tokens: [], isHeader: false, isItem: false, html: '' }
        ]);

        expect(threads).toEqual([
            { id: 35262, subject: '[83:48] Crossbow Loading', author: 'Zekk', date: '', depth: 0, replyCount: 1 },
            { id: 35263, subject: 'Re: [83:48] Crossbow Loading', author: 'Rogon', date: '', depth: 1, replyCount: 0 },
            { id: 35264, subject: '[220:107] I gave letter to wrong npc', author: 'Eorad', date: '', depth: 0, replyCount: 0 }
        ]);
    });

    it('parses board messages (read)', () => {
        const lines = [
            { id: '1', text: 'Message 25508 on Yavanna Board:', rawText: '', tokens: [], isHeader: false, isItem: false, html: '' },
            { id: '2', text: 'Subject: A few comments on Mume7', rawText: '', tokens: [], isHeader: false, isItem: false, html: '' },
            { id: '3', text: 'Author: Fëanor', rawText: '', tokens: [], isHeader: false, isItem: false, html: '' },
            { id: '4', text: 'Date: Tue Jun  9 14:00:00 2026', rawText: '', tokens: [], isHeader: false, isItem: false, html: '' },
            { id: '5', text: 'This is the first line of the body.', rawText: '', tokens: [], isHeader: false, isItem: false, html: '' },
            { id: '6', text: 'And the second line.', rawText: '', tokens: [], isHeader: false, isItem: false, html: '' }
        ];

        const msg = parseBoardRead(lines);
        expect(msg).not.toBeNull();
        expect(msg?.id).toBe(25508);
        expect(msg?.subject).toBe('A few comments on Mume7');
        expect(msg?.author).toBe('Fëanor');
        expect(msg?.date).toBe('Tue Jun  9 14:00:00 2026');
        expect(msg?.body).toBe('This is the first line of the body.\nAnd the second line.');
    });

    it('parses board messages from custom/deity boards without "Board" in their name', () => {
        const lines = [
            { id: '1', text: 'Message 38315 on Yavanna:', rawText: '', tokens: [], isHeader: false, isItem: false, html: '' },
            { id: '2', text: 'Subject: Maia rooms in zone 150', rawText: '', tokens: [], isHeader: false, isItem: false, html: '' },
            { id: '3', text: 'Author: Yavanna', rawText: '', tokens: [], isHeader: false, isItem: false, html: '' },
            { id: '4', text: 'Date: Tue Jun  9 14:00:00 2026', rawText: '', tokens: [], isHeader: false, isItem: false, html: '' },
            { id: '5', text: 'Maia rooms body line 1.', rawText: '', tokens: [], isHeader: false, isItem: false, html: '' }
        ];

        const msg = parseBoardRead(lines);
        expect(msg).not.toBeNull();
        expect(msg?.id).toBe(38315);
        expect(msg?.subject).toBe('Maia rooms in zone 150');
        expect(msg?.author).toBe('Yavanna');
        expect(msg?.date).toBe('Tue Jun  9 14:00:00 2026');
        expect(msg?.body).toBe('Maia rooms body line 1.');
    });


    it('does not classify board headers and lines as prompts', () => {
        const captureMock = {
            hasSession: () => false,
            finalizeSession: vi.fn(),
            getActiveType: () => 'none'
        } as any;
        const deps = { capture: captureMock } as any;
        const { result } = renderHook(() => usePromptParser(deps));

        // Testing our refined promptRegex through parsePrompt
        expect(result.current.parsePrompt('* Ainur board - 64 messages (out of 92)').isMatch).toBe(false);
        expect(result.current.parsePrompt('Ainur board - 64 messages (out of 92)').isMatch).toBe(false);
        expect(result.current.parsePrompt('Message 25508 on Bulletin Board:').isMatch).toBe(false);
        expect(result.current.parsePrompt('1103#: Buggy boards (Manwë)').isMatch).toBe(false);
        expect(result.current.parsePrompt('25508#: A few comments on Mume7 (Fëanor)').isMatch).toBe(false);
        expect(result.current.parsePrompt('(It has parenthesis at the start of a line like this)').isMatch).toBe(false);
        expect(result.current.parsePrompt('*[Ms] Aloonion the Alo (Linkless) (iM)').isMatch).toBe(false);
        expect(result.current.parsePrompt('*[Ms]').isMatch).toBe(false);

        // Real prompts should still match
        expect(result.current.parsePrompt('* [HP:100/100 MA:50/50]>').isMatch).toBe(true);
        expect(result.current.parsePrompt('[HP:100/100 MA:50/50]>').isMatch).toBe(true);
        expect(result.current.parsePrompt('*>').isMatch).toBe(true);
        expect(result.current.parsePrompt('>').isMatch).toBe(true);
    });

    it('correctly processes and strips XML tags on accumulateLine for board_list', () => {
        const deps = createMockDeps();
        const mockSetEntries = vi.fn();
        vi.spyOn(useArchiveStore, 'getState').mockReturnValue({
            activeView: 'board',
            entriesByView: { board: [] },
            setIsLoadingList: vi.fn(),
            setIsOpen: vi.fn(),
            setEntries: mockSetEntries
        } as any);

        const { result } = renderHook(() => useCaptureParser(deps));

        // Start session
        act(() => {
            result.current.startSession('board_list');
        });

        // Accumulate a raw XML board thread row
        act(() => {
            result.current.accumulateLine('<status>32023</status> : [147:92] emote to the team (<status>Gindil</status>)');
        });

        // Finalize session
        act(() => {
            result.current.finalizeSession();
        });

        // Verify that the parser got the clean stripped line and parseBoardList succeeded
        expect(mockSetEntries).toHaveBeenCalledWith(
            'board',
            expect.arrayContaining([
                expect.objectContaining({
                    id: 32023,
                    source: 'board',
                    view: 'board',
                    subject: '[147:92] emote to the team',
                    author: 'Gindil'
                })
            ])
        );
    });
});
