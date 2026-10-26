/** @file gmcpCommunication.ts — GMCP communication package decoding. */
import type { GmcpHandlers } from '../../types';

// --- Communication Section ---
export function handleCommChannel(json: string, handlers: GmcpHandlers) {
    console.log('[GMCP] Received comm.channel:', json);
    try {
        const data = JSON.parse(json);
        // Expected MUME format: { "chan": "tell", "msg": "hello", "player": "Someone" }
        const chan = data.chan || data.channel;
        const msg = data.msg || data.message;
        const player = data.player || data.sender;

        console.log('[GMCP] Parsed comm:', { chan, msg, player });

        if (chan && player && handlers.onComm) {
            handlers.onComm(player, chan, msg || "");
        }
    } catch (e) {
        console.error('[GMCP] Parse error in Comm.Channel:', e, json);
    }
}

export function handleCommChannelList(json: string) {
    try {
        const channels = JSON.parse(json);
        if (Array.isArray(channels)) {
            console.log('[GMCP] Comm.Channel.List:', channels.map(channel => channel?.name || channel?.command).filter(Boolean));
        }
    } catch (e) {
        console.error('[GMCP] Parse error in Comm.Channel.List:', e, json);
    }
}

