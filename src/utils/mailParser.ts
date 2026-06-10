/**
 * @file mailParser.ts
 * @description Parse in-game mailbox list and detail output into structured UI data.
 */

import { DrawerLine } from '../types';

export type MailboxFolder = 'inbox' | 'sent';

export interface MailSummary {
    id: number;
    subject: string;
    author: string;
    date: string;
    isRead: boolean;
    folder: MailboxFolder;
}

export interface MailDetail extends MailSummary {
    recipients: string;
    body: string;
}

const cleanMarker = (value: string) => value.replace(/^\+\s*/, '').trim();

const parseSubjectAuthor = (value: string) => {
    const quoted = value.match(/^"?(.*?)"?\s+\((.*?)\)\s*$/);
    if (quoted) return { subject: quoted[1].trim(), author: quoted[2].trim() };

    const parts = value.split(/\s{2,}/);
    if (parts.length >= 2) return { subject: parts.slice(1).join(' ').trim(), author: parts[0].trim() };

    return { subject: value.trim(), author: '' };
};

export const parseMailList = (lines: DrawerLine[], folder: MailboxFolder): MailSummary[] => {
    const messages: MailSummary[] = [];

    for (const line of lines) {
        const text = line.text.trim();
        const markerMatch = text.match(/^(\+)?\s*(?:Mail|Message)?\s*(\d+)(\+)?(?:#|:|\.)?\s*:?\s*(.+)$/i);
        if (!markerMatch) continue;

        const id = parseInt(markerMatch[2], 10);
        const rest = markerMatch[4].trim();
        if (!Number.isFinite(id) || !rest || /^(?:mailbox|mail addressed|sent mail|no mail)/i.test(rest)) continue;

        const dateSplit = rest.match(/^(.*?)\s+-\s+(.+)$/);
        const titlePart = dateSplit ? dateSplit[1].trim() : rest;
        const date = dateSplit ? dateSplit[2].trim() : '';
        const parsed = parseSubjectAuthor(cleanMarker(titlePart));

        messages.push({
            id,
            subject: parsed.subject || `(mail ${id})`,
            author: parsed.author,
            date,
            isRead: Boolean(markerMatch[1] || markerMatch[3]) || /^\+\s*/.test(text),
            folder
        });
    }

    return messages;
};

export const parseMailRead = (lines: DrawerLine[], folder: MailboxFolder): MailDetail | null => {
    let id = 0;
    let subject = '';
    let author = '';
    let date = '';
    let recipients = '';
    const bodyLines: string[] = [];
    let parsingBody = false;

    for (const line of lines) {
        const text = line.text.trim();
        if (!parsingBody) {
            const idMatch = text.match(/^(?:Mail|Message)\s+(\d+)(?:\s*:|\s+(?:in|on|from).*)?:?\s*(.*)$/i);
            if (idMatch) {
                id = parseInt(idMatch[1], 10);
                const parsed = parseSubjectAuthor(idMatch[2].trim());
                if (parsed.subject) subject = parsed.subject;
                if (parsed.author) author = parsed.author;
                continue;
            }
            if (/^Written on\s+/i.test(text)) {
                date = text.replace(/^Written on\s+/i, '').trim();
                parsingBody = true;
                continue;
            }
            const fieldMatch = text.match(/^(From|Author|Sender|To|Recipients|Subject|Title|Date):\s*(.*)$/i);
            if (fieldMatch) {
                const field = fieldMatch[1].toLowerCase();
                const value = fieldMatch[2].trim();
                if (field === 'from' || field === 'author' || field === 'sender') author = value;
                if (field === 'to' || field === 'recipients') recipients = value;
                if (field === 'subject' || field === 'title') subject = value;
                if (field === 'date') date = value;
                continue;
            }
            if (/^-{3,}$/.test(text) || text === '') {
                parsingBody = Boolean(id || subject || author || recipients || date);
                continue;
            }
        } else {
            bodyLines.push(line.text);
        }
    }

    if (!id && !subject && !author && bodyLines.length === 0) return null;

    return {
        id,
        subject: subject || `(mail ${id})`,
        author,
        recipients,
        date,
        isRead: true,
        folder,
        body: bodyLines.join('\n').trim()
    };
};
