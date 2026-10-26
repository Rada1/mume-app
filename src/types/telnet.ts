/** @file telnet.ts — Typed decoder callbacks and incremental vitals state. */
import type { Dispatch, SetStateAction } from 'react';
import type { GameStats, WeatherType, GmcpCharVitals, GmcpRoomInfo, GmcpUpdateExits, GmcpCharInfo, GmcpMumeEdit, GmcpMumeView, MumeTime } from './index';
import type { ProtocolOptions } from '../utils/telnet/ProtocolHandler';

// --- Packet Callback Section ---
export interface GmcpHandlers {
    setStats: Dispatch<SetStateAction<GameStats>>;
    setWeather: Dispatch<SetStateAction<WeatherType>>;
    setIsFoggy: Dispatch<SetStateAction<boolean>>;
    setInCombat: (inCombat: boolean, force?: boolean) => void;
    detectLighting: (light: string) => void;
    onOpponentChange?: (opponent: string | null) => void;
    onBufferChange?: (buffer: string | null) => void;
    onAddChar?: (data: unknown) => void;
    onUpdateChar?: (data: unknown) => void;
    onRemoveChar?: (data: unknown) => void;
    onRoomChars?: (data: unknown) => void;
    onRoomInfo?: (data: GmcpRoomInfo) => void;
    onRoomUpdateExits?: (data: GmcpUpdateExits) => void;
    onCharVitals?: (data: GmcpCharVitals) => void;
    onCharNameChange?: (name: string | null) => void;
    onCharInfo?: (data: GmcpCharInfo) => void;
    onCharStatusVars?: (data: unknown) => void;
    onPositionChange?: (position: string) => void;
    onComm?: (sender: string, chan: string, msg: string) => void;
    onGroupAdd?: (data: unknown) => void;
    onGroupUpdate?: (data: unknown) => void;
    onGroupRemove?: (data: unknown) => void;
    onGroupSet?: (data: unknown) => void;
    onMumeEdit?: (data: GmcpMumeEdit) => void;
    onMumeView?: (data: GmcpMumeView) => void;
    onRoomCharsCombat?: (data: unknown[]) => void;
    onCharRide?: (data: unknown) => void;
    onCorePing?: () => void;
    onCoreGoodbye?: () => void;
    onDisconnect?: () => void;
    onExternalEdit?: (data: string) => void;
    onEvent?: (pkg: string, data: unknown) => void;
}

export interface GmcpVitalsState { position?: string; opponent?: string | null; buff?: string | null; }

// --- Connection Configuration Section ---
export interface TelnetConfig {
    connectionUrl: string;
    processLine: (line: string, tokens?: unknown, chunkEffects?: Set<string>) => void;
    getGameState?: () => string;
    recordEntry?: (type: 'rx' | 'tx' | 'gmcp' | 'ui' | 'sys', data: unknown) => void;
    setPrompt: (prompt: string) => void;
    onCharNameChange?: (name: string | null) => void;
    onPositionChange?: (pos: string) => void;
    handlers: GmcpHandlers & {
        setStatus: (status: string) => void;
        addMessage: ProtocolOptions['addMessage'];
        addDiagnosticLog?: (message: string) => void;
        onEchoChange?: (visible: boolean) => void;
        onMsspTime?: (time: MumeTime) => void;
    };
}
