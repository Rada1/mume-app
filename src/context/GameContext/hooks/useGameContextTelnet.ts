import { useTelnet as useBaseTelnet } from '../../../hooks/useTelnet';
import { GmcpOccupant } from '../../../types';

interface UseGameContextTelnetProps {
    s: any; v: any;
    settings: any;
    processLine: any;
    sanitizedRecordEntry: any;
    gmcpHandlers: any;
    addMessage: any; flushMessages: any;
    env: any; roomInfoFn: any; roomExitsFn: any; charVitalsFn: any; roomPlayersFn: any; roomNpcsFn: any; roomItemsFn: any;
    addPlayerFn: any; addNpcFn: any; removePlayerFn: any; removeNpcFn: any; opponentChangeFn: any;
    pendingGmcpCommRef: any; commFn: any; groupAddFn: any; groupUpdateFn: any; groupRemoveFn: any; groupSetFn: any;
    addDiagnosticLog: any;
}

export const useGameContextTelnet = ({
    s, v, settings, processLine, sanitizedRecordEntry, gmcpHandlers, addMessage, flushMessages, env,
    roomInfoFn, roomExitsFn, charVitalsFn, roomPlayersFn, roomNpcsFn, roomItemsFn, addPlayerFn, addNpcFn,
    removePlayerFn, removeNpcFn, opponentChangeFn, pendingGmcpCommRef, commFn, groupAddFn, groupUpdateFn,
    groupRemoveFn, groupSetFn, addDiagnosticLog
}: UseGameContextTelnetProps) => {

    return useBaseTelnet({
        connectionUrl: settings.connectionUrl,
        processLine,
        recordEntry: sanitizedRecordEntry,
        setPrompt: v.setActivePrompt,
        onCharNameChange: gmcpHandlers.onCharNameChange,
        onPositionChange: gmcpHandlers.onPositionChange,
        handlers: {
            setStatus: s.setStatus, setStats: v.setStats, setWeather: s.setWeather,
            setIsFoggy: s.setIsFoggy, setInCombat: s.setInCombat,
            addMessage, flushMessages, detectLighting: env.detectLighting,
            onRoomInfo: (data) => { gmcpHandlers.onRoomInfo(data); roomInfoFn?.(data); },
            onRoomUpdateExits: (data) => { gmcpHandlers.onRoomUpdateExits(data); roomExitsFn?.(data); },
            onCharVitals: (data) => { gmcpHandlers.onCharVitals(data); charVitalsFn?.(data); },
            onRoomPlayers: (data) => { gmcpHandlers.onRoomPlayers(data); roomPlayersFn?.(data); },
            onRoomNpcs: (data) => { gmcpHandlers.onRoomNpcs(data); roomNpcsFn?.(data); },
            onRoomItems: (data) => { gmcpHandlers.onRoomItems(data); roomItemsFn?.(data); },
            onAddPlayer: (data: string | GmcpOccupant) => { gmcpHandlers.onAddPlayer(data); addPlayerFn?.(data); },
            onAddNpc: (data: string | GmcpOccupant) => { gmcpHandlers.onAddNpc(data); addNpcFn?.(data); },
            onRemovePlayer: (data: string | GmcpOccupant) => { gmcpHandlers.onRemovePlayer(data); removePlayerFn?.(data); },
            onRemoveNpc: (data: string | GmcpOccupant) => { gmcpHandlers.onRemoveNpc(data); removeNpcFn?.(data); },
            onCharNameChange: gmcpHandlers.onCharNameChange,
            onCharInfo: gmcpHandlers.onCharInfo,
            onPositionChange: gmcpHandlers.onPositionChange,
            onOpponentChange: (name) => { opponentChangeFn?.(name); v.setOpponentName(name); },
            onComm: (sender, chan, msg) => { pendingGmcpCommRef.current = { sender, chan, msg }; commFn?.(sender, chan, msg); },
            onGroupAdd: (data) => { gmcpHandlers.onGroupAdd(data); groupAddFn?.(data); },
            onGroupUpdate: (data) => { gmcpHandlers.onGroupUpdate(data); groupUpdateFn?.(data); },
            onGroupRemove: (id) => { gmcpHandlers.onGroupRemove(id); groupRemoveFn?.(id); },
            onGroupSet: (data) => { gmcpHandlers.onGroupSet(data); groupSetFn?.(data); },
            onCharRide: gmcpHandlers.onCharRide,
            addDiagnosticLog
        }
    });
};
