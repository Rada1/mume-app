/** @file Merge GMCP and text evidence while keeping one owner for each movement response. */
import { useEffect, useRef } from 'react';
import type { GmcpRoomInfo } from '../mapperTypes';
import type { MutableRefObject } from 'react';
import { gmcpBus } from '../../../events/gmcpBus';
import { normalizeRoomText, observedRoomName } from '../roomObservationMatch';
import { uiPerformance } from '../../../utils/uiPerformance';

// --- Observation enrichment ---
export function useMapperRoomObservations(process: (data: GmcpRoomInfo, confirmed?: boolean, direction?: string | null) => void,
    takeDirection: () => string | null | undefined, gmcpAvailable: MutableRefObject<boolean>, xmlConfirmed: MutableRefObject<boolean>,
    xmlUnresolvedDirection: MutableRefObject<string | null>, characterName: string | null) {
    const latest = useRef<GmcpRoomInfo | null>(null);
    const character = useRef(characterName);
    useEffect(() => {
        if (character.current !== characterName) { latest.current = null; gmcpAvailable.current = false; xmlConfirmed.current = false; xmlUnresolvedDirection.current = null; }
        character.current = characterName;
    }, [characterName, gmcpAvailable, xmlConfirmed, xmlUnresolvedDirection]);
    useEffect(() => {
        const clear = () => { latest.current = null; gmcpAvailable.current = false; xmlConfirmed.current = false; xmlUnresolvedDirection.current = null; };
        const off = [gmcpBus.on('Session.Start', clear),gmcpBus.on('Session.Reset', clear),gmcpBus.on('Connection.Disconnect', clear)];
        const death = gmcpBus.on('Game.PlayerDeath', () => { latest.current = null; xmlConfirmed.current = false; xmlUnresolvedDirection.current = null; });
        return () => { off.forEach(unsubscribe => unsubscribe()); death(); };
    }, [gmcpAvailable, xmlConfirmed, xmlUnresolvedDirection]);
    return (data: GmcpRoomInfo) => {
        if (data.spectating || data.scouting) { process(data); return; }
        const finish = uiPerformance.startWork('Mapper room matching');
        try {
            if (data.source === 'text' && gmcpAvailable.current) {
                const prior = latest.current;
                if (!prior || (observedRoomName(prior) && observedRoomName(prior) !== observedRoomName(data))) return;
                const priorId = Number(prior.num ?? prior.vnum ?? prior.id ?? 0);
                const textId = Number(data.num ?? data.vnum ?? data.id ?? 0);
                if (priorId > 0 && textId > 0 && priorId !== textId) return;
                // Text is a refinement of the same response. It cannot consume another move.
                process({...prior,...data,num:priorId > 0 ? priorId : textId,
                    name:observedRoomName(prior) ? prior.name : data.name,
                    desc:normalizeRoomText(prior.desc) ? prior.desc : data.desc,
                    terrain:prior.terrain || data.terrain,exits:prior.exits ?? data.exits,source:'text'}, true, null);
                return;
            }
            if (data.source !== 'text') { gmcpAvailable.current = true; latest.current = data; }
            const confirmed = xmlConfirmed.current;
            xmlConfirmed.current = false;
            const serverDirection = data.source === 'text' ? undefined : takeDirection();
            const direction = confirmed ? xmlUnresolvedDirection.current : serverDirection;
            xmlUnresolvedDirection.current = null;
            process(data, confirmed, direction);
        } finally { finish(); }
    };
}
