/**
 * @file archiveAdapters.ts
 * @description Shared command and parser adapters for board and mail archive views.
 */

import { DrawerLine } from '../types';
import { ArchiveDetail, ArchiveEntry, ArchiveView } from '../stores/useArchiveStore';
import { parseBoardList, parseBoardRead, parseBoardThreadList } from './boardParser';
import { parseMailList, parseMailRead } from './mailParser';

export const getArchiveListCommand = (view: ArchiveView) => {
    if (view === 'book') return '';
    if (view === 'mail-inbox') return 'look mail';
    if (view === 'mail-sent') return 'look sent mail';
    if (view === 'board-threads') return 'look threads';
    return 'look board';
};

export const getArchiveReadCommand = (entry: ArchiveEntry) => {
    if (entry.view === 'book') return '';
    if (entry.view === 'mail-sent') return `read sent ${entry.id}`;
    if (entry.view === 'board-threads' && !entry.depth) return `read thread ${entry.id} whole`;
    return `read ${entry.id}`;
};

export const getArchiveReplyCommand = (entry: ArchiveEntry) => {
    if (entry.source === 'book') return null;
    if (entry.view === 'mail-sent') return null;
    return `reply ${entry.id}`;
};

export const getArchiveForwardCommand = (entry: ArchiveEntry) => {
    if (entry.source === 'book') return null;
    if (entry.source === 'board') return null;
    return `forward ${entry.view === 'mail-sent' ? 'sent ' : ''}${entry.id} `;
};

export const getArchiveRemoveCommand = (entry: ArchiveEntry) => {
    if (entry.source === 'book') return null;
    if (entry.source === 'board') return null;
    return `remove ${entry.view === 'mail-sent' ? 'sent ' : ''}${entry.id}`;
};

export const getArchiveSearchCommand = (view: ArchiveView, query: string) => {
    if (view === 'mail-inbox') return `search mail ${query}`;
    if (view === 'mail-sent') return `search sent mail ${query}`;
    return null;
};

export const parseArchiveList = (lines: DrawerLine[], view: ArchiveView): ArchiveEntry[] => {
    if (view === 'board' || view === 'board-threads') {
        const rows = view === 'board-threads' ? parseBoardThreadList(lines) : parseBoardList(lines);
        return rows.map(thread => ({
            ...thread,
            source: 'board',
            view
        }));
    }

    if (view === 'book') return [];

    const folder = view === 'mail-sent' ? 'sent' : 'inbox';
    return parseMailList(lines, folder).map(mail => ({
        id: mail.id,
        source: 'mail',
        view,
        subject: mail.subject,
        author: mail.author,
        date: mail.date,
        isRead: mail.isRead,
        recipients: mail.folder === 'sent' ? mail.author : undefined
    }));
};

const buildFallbackBody = (lines: DrawerLine[]) => lines
    .map(line => line.text.trimEnd())
    .join('\n')
    .trim();

export const parseArchiveRead = (lines: DrawerLine[], view: ArchiveView, fallback?: ArchiveDetail | null): ArchiveDetail | null => {
    if (view === 'board' || view === 'board-threads') {
        const board = parseBoardRead(lines);
        if (!board) {
            if (!fallback) return null;
            return {
                ...fallback,
                body: buildFallbackBody(lines)
            };
        }
        return {
            ...board,
            source: 'board',
            view,
            body: board.body
        };
    }

    if (view === 'book') {
        return {
            id: fallback?.id || Date.now(),
            source: 'book',
            view: 'book',
            subject: fallback?.subject || 'Book',
            author: fallback?.author || '',
            date: '',
            body: buildFallbackBody(lines)
        };
    }

    const mail = parseMailRead(lines, view === 'mail-sent' ? 'sent' : 'inbox');
    if (!mail) return null;
    return {
        id: mail.id,
        source: 'mail',
        view,
        subject: mail.subject,
        author: mail.author,
        date: mail.date,
        isRead: mail.isRead,
        recipients: mail.recipients,
        body: mail.body
    };
};
