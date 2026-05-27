import type { LogEntry, SessionLog } from '../types/session';
import { ansiConvert } from './ansi';
import { escapeHtml, sanitizeMumeHtml } from './securityUtils';

const decoder = new TextDecoder();

// --- Logic Section ---
const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null;

const decodePayload = (payload: unknown): string => {
    if (typeof payload === 'string') return payload;
    if (payload instanceof Uint8Array) return decoder.decode(payload);
    if (Array.isArray(payload)) return decoder.decode(new Uint8Array(payload));
    if (isRecord(payload) && typeof payload.text === 'string') return payload.text;
    return '';
};

const isUserMessagePayload = (payload: unknown) =>
    isRecord(payload) && payload.type === 'user';

const stripProtocolNoise = (text: string) =>
    text
        .replace(/\x1b\[[0-9;]*m/g, '')
        .replace(/\xff\xfa[\s\S]*?\xff\xf0/g, '')
        .replace(/[\xff\xfb\xfc\xfd\xfe]./g, '');

const shouldHideCommand = (command: string) => {
    const lower = command.toLowerCase();
    return lower.includes('change width')
        || lower.includes('change length')
        || lower.includes('cha wid')
        || lower.includes('cha len');
};

const getUiCommand = (entry: LogEntry): string | null => {
    if (!isRecord(entry.d) || entry.d.event !== 'executeCommand') return null;
    return typeof entry.d.cmd === 'string' ? entry.d.cmd : null;
};

export const sessionLogToText = (session: SessionLog): string => {
    let content = '';

    for (const entry of session.log) {
        if (entry.typ === 'rx') {
            if (isUserMessagePayload(entry.d)) continue;
            const text = stripProtocolNoise(decodePayload(entry.d));
            if (text) {
                content += text;
                if (!text.endsWith('\n')) {
                    content += '\n';
                }
            }
        } else if (entry.typ === 'tx') {
            const command = decodePayload(entry.d);
            if (command && !shouldHideCommand(command)) content += `\n> ${command}\n`;
        } else if (entry.typ === 'ui') {
            const command = getUiCommand(entry);
            if (command && !shouldHideCommand(command)) content += `\n> ${command}\n`;
        }
    }

    return content.trimEnd();
};

export const sessionLogToHtml = (session: SessionLog): string => {
    let content = '';

    for (const entry of session.log) {
        if (entry.typ === 'rx') {
            if (isUserMessagePayload(entry.d)) continue;
            
            let lineHtml = '';
            if (isRecord(entry.d) && typeof entry.d.html === 'string') {
                lineHtml = entry.d.html;
            } else {
                const text = decodePayload(entry.d);
                lineHtml = ansiConvert.toHtml(text);
            }
            
            if (lineHtml) {
                content += lineHtml;
                if (!lineHtml.endsWith('\n') && !lineHtml.endsWith('<br>') && !lineHtml.endsWith('<br/>') && !lineHtml.endsWith('</div>')) {
                    content += '\n';
                }
            }
        } else if (entry.typ === 'tx') {
            const command = decodePayload(entry.d);
            if (command && !shouldHideCommand(command)) {
                content += `\n<span style="color: var(--text-dim, #94a3b8)">> ${escapeHtml(command)}</span>\n`;
            }
        } else if (entry.typ === 'ui') {
            const command = getUiCommand(entry);
            if (command && !shouldHideCommand(command)) {
                content += `\n<span style="color: var(--text-dim, #94a3b8)">> ${escapeHtml(command)}</span>\n`;
            }
        }
    }

    return sanitizeMumeHtml(content.trimEnd());
};

