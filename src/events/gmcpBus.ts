import type {
    GmcpCharVitals,
    GmcpCharInfo,
    GmcpRoomInfo,
    GmcpUpdateExits,
    GmcpRoomPlayers,
    GmcpRoomNpcs,
    GmcpRoomItems,
    GmcpOccupant,
    GmcpMumeEdit,
    MessageType,
} from '../types';

export interface GmcpEventMap {
    'Char.Vitals': GmcpCharVitals;
    'Char.Info': GmcpCharInfo;
    'Char.Name': string | null;
    'Char.Position': string;
    'Char.Ride': any;
    'Room.Info': GmcpRoomInfo;
    'Room.UpdateExits': GmcpUpdateExits;
    'Room.Players': GmcpRoomPlayers;
    'Room.Npcs': GmcpRoomNpcs;
    'Room.Items': GmcpRoomItems;
    'Room.AddPlayer': string | GmcpOccupant;
    'Room.RemovePlayer': string | GmcpOccupant;
    'Room.AddNpc': string | GmcpOccupant;
    'Room.RemoveNpc': string | GmcpOccupant;
    'Room.CharsCombat': any[];
    'Char.Opponent': string | null;
    'Char.Buffer': string | null;
    'Group.Add': any;
    'Group.Update': any;
    'Group.Remove': any;
    'Group.Set': any;
    'Comm.Channel': { sender: string; chan: string; msg: string };
    'Mume.Edit': GmcpMumeEdit;
    'Core.Ping': void;
    'Core.Goodbye': void;
    'Connection.Disconnect': void;
    'Game.Text': { type: MessageType; text: string; tokens?: any; isReplay?: boolean };
    'Session.Reset': void;
    'Session.Start': { characterName: string };
}

export type GmcpEventName = keyof GmcpEventMap;
type Listener<K extends GmcpEventName> = (payload: GmcpEventMap[K]) => void;

class GmcpBus {
    private listeners: Partial<{ [K in GmcpEventName]: Set<Listener<K>> }> = {};

    on<K extends GmcpEventName>(event: K, listener: Listener<K>): () => void {
        let set = this.listeners[event] as Set<Listener<K>> | undefined;
        if (!set) {
            set = new Set();
            this.listeners[event] = set as any;
        }
        set.add(listener);
        return () => set!.delete(listener);
    }

    emit<K extends GmcpEventName>(event: K, payload: GmcpEventMap[K]): void {
        const set = this.listeners[event] as Set<Listener<K>> | undefined;
        if (!set) return;
        for (const listener of set) {
            try {
                listener(payload);
            } catch (err) {
                console.error(`[gmcpBus] listener for ${String(event)} threw:`, err);
            }
        }
    }

    clear(): void {
        this.listeners = {};
    }
}

export const gmcpBus = new GmcpBus();
