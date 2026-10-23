/** @file commandCommunication.ts — Resolves communication actions into an explicit composer destination. */
import type { CommandCommunicationIntent, CommunicationCommandChoice } from '../types';
import type { CommandActionTargetEntry } from '../objects/commandActionTargetModel';
import { CHAT_PARLEY_CHANNELS, getWhoPlayerNames, normalizeChatChannel } from './chatWindowUtils';

// --- Intent Resolution ---
export const getCommandCommunicationIntent = (value: string, context?: string | null): CommandCommunicationIntent | null => {
    if (value.trim() === '__parley__') return { command: 'tell', target: context || null, text: '' };
    const normalizedValue = value.trim();
    const [verb, ...parts] = normalizedValue.split(/\s+/);
    const command = CHAT_PARLEY_CHANNELS.find(channel => channel === normalizeChatChannel(verb));
    if (!command) return null;
    const directed = ['tell', 'whisper', 'ask'].includes(command);
    const rest = parts.join(' ').replace(/%n/g, context || '').trim();
    if (!directed) return { command, target: null, text: rest };
    if (!rest) return { command, target: context || null, text: '' };
    const [target, ...text] = rest.split(/\s+/);
    return { command, target, text: text.join(' ') };
};

// --- Applicable Commands and Global Targets ---
export const getCommunicationCommands = (target: string | null, isLocal: boolean, hasGroup: boolean, includeTargetlessDirect = false): CommunicationCommandChoice[] => (
    CHAT_PARLEY_CHANNELS.filter(command => {
        if (command === 'tell') return Boolean(target) || includeTargetlessDirect;
        if (command === 'whisper' || command === 'ask') return (Boolean(target) || includeTargetlessDirect) && isLocal;
        // Group communication is a Tell recipient, rather than a second action.
        if (command === 'group') return false;
        return true;
    }).map(command => ({
        command, label: command === 'group' ? 'Tell Group' : command[0].toUpperCase() + command.slice(1),
        target: ['tell', 'whisper', 'ask'].includes(command) ? target : null
    }))
);

export const getOnlineCommunicationTargets = (whoList: string[]): CommandActionTargetEntry[] => getWhoPlayerNames(whoList).map(name => ({
    id: `command-online:${name.toLowerCase()}`, label: name, context: name, keyword: name,
    category: 'cat-ally-remote', group: 'players', scope: 'remote'
}));
