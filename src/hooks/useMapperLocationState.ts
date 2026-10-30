/** @file Reset mapper confidence and speculative movement at player lifecycle boundaries. */
import { useEffect, useRef } from 'react';
import { gmcpBus } from '../events/gmcpBus';
import type { MapperRoomInfoProps } from '../types';
import { createRoomLocationState, resetRoomLocation } from '../components/Mapper/roomLocationMachine';

// --- Location lifecycle ---
export function useMapperLocationState(props: MapperRoomInfoProps) {
    const location = useRef(createRoomLocationState());
    const latest = useRef(props);
    latest.current = props;
    const reset = () => {
        resetRoomLocation(location.current);
        const current = latest.current;
        if (current.activeView !== 'self') return;
        current.pendingMovesRef.current = [];
        if (current.preMoveRef) current.preMoveRef.current = null;
        if (current.clientPredictionsRef) current.clientPredictionsRef.current = [];
        current.discoverySourceRef.current = 'SEARCHING';
        current.triggerRender?.();
    };
    const resetRef = useRef(reset);
    resetRef.current = reset;
    const character = useRef(props.characterName);
    useEffect(() => {
        if (character.current !== props.characterName) resetRef.current();
        character.current = props.characterName;
    }, [props.characterName]);
    useEffect(() => {
        const clear = () => resetRef.current();
        const subscriptions = [gmcpBus.on('Game.PlayerDeath', clear),gmcpBus.on('Session.Start', clear),
            gmcpBus.on('Session.Reset', clear),gmcpBus.on('Connection.Disconnect', clear)];
        return () => subscriptions.forEach(off => off());
    }, []);
    return location;
}
