/**
 * @file boardParser.ts
 * @description Utility functions to parse in-game board output for list and detail messages.
 */

import { DrawerLine } from '../types';

export interface BoardThread {
    id: number;
    subject: string;
    author: string;
    date: string;
    depth?: number;
    replyCount?: number;
}

export interface BoardMessageDetail {
    id: number;
    subject: string;
    author: string;
    date: string;
    body: string;
}

export const parseBoardList = (lines: DrawerLine[]): BoardThread[] => {
    const threads: BoardThread[] = [];
    console.log(`[BoardParser] parseBoardList received ${lines.length} lines.`);
    // Format A: Message  1:  "Subject" (Author) - Date
    const regexA = /^Message\s+(\d+):\s+"(.*)"\s+\((.*?)\)\s+-\s+(.*)$/i;
    // Format B: 1103#: Buggy boards (Manwë) or 32023 : [147:92] emote to the team (Gindil)
    const regexB = /^(\d+)(?:#:|\s+:)\s*(.*?)\s*\((.*?)\)$/i;

    for (const line of lines) {
        const text = line.text.trim();
        const matchA = text.match(regexA);
        const matchB = text.match(regexB);
        console.log(`[BoardParser] Parsing text: "${text}", matchA: ${!!matchA}, matchB: ${!!matchB}`);
        if (matchA) {
            threads.push({
                id: parseInt(matchA[1], 10),
                subject: matchA[2],
                author: matchA[3],
                date: matchA[4].trim()
            });
            continue;
        }
        
        if (matchB) {
            threads.push({
                id: parseInt(matchB[1], 10),
                subject: matchB[2],
                author: matchB[3],
                date: ''
            });
        }
    }
    console.log(`[BoardParser] parseBoardList returned ${threads.length} threads:`, threads);
    return threads;
};

export const parseBoardThreadList = (lines: DrawerLine[]): BoardThread[] => {
    const parsedRows: BoardThread[] = [];
    const threadRegex = /^(-\s*)?(\d+)(?:#:|\s+:)\s*(.*?)\s*\((.*?)\)$/i;

    for (const line of lines) {
        const text = line.text.trim();
        const match = text.match(threadRegex);
        if (!match) continue;

        parsedRows.push({
            id: parseInt(match[2], 10),
            subject: match[3].trim(),
            author: match[4].trim(),
            date: '',
            depth: match[1] ? 1 : 0,
            replyCount: 0
        });
    }

    return parsedRows.map((row, index) => {
        if (row.depth && row.depth > 0) return row;
        const replyCount = parsedRows.slice(index + 1).findIndex(next => !next.depth);
        const following = replyCount === -1 ? parsedRows.slice(index + 1) : parsedRows.slice(index + 1, index + 1 + replyCount);
        return { ...row, replyCount: following.filter(next => (next.depth || 0) > 0).length };
    });
};

export const parseBoardRead = (lines: DrawerLine[]): BoardMessageDetail | null => {
    let id = 0;
    let subject = '';
    let author = '';
    let date = '';
    const bodyLines: string[] = [];
    let parsingBody = false;

    for (const line of lines) {
        const text = line.text.trim();
        if (!parsingBody) {
            const idMatch = text.match(/^Message\s+(\d+)\s+on\s+((?!mailbox|mail).)+:?$/i);
            if (idMatch) {
                id = parseInt(idMatch[1], 10);
                continue;
            }
            const fieldMatch = text.match(/^(From|Author|Sender|Subject|Title|Date):\s*(.*)$/i);
            if (fieldMatch) {
                const field = fieldMatch[1].toLowerCase();
                const value = fieldMatch[2].trim();
                if (field === 'from' || field === 'author' || field === 'sender') author = value;
                if (field === 'subject' || field === 'title') subject = value;
                if (field === 'date') date = value;
                continue;
            }

            if (id || subject || author) {
                parsingBody = true;
                if (text !== '' && !/^-{3,}$/.test(text)) {
                    bodyLines.push(line.text);
                }
                continue;
            }
        } else {
            bodyLines.push(line.text);
        }
    }

    if (!id && !subject && !author) return null;

    return {
        id,
        subject,
        author,
        date,
        body: bodyLines.join('\n').trim()
    };
};
