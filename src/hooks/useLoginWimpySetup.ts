/**
 * @file useLoginWimpySetup.ts
 * @description Sets the player's wimpy threshold to half max HP after login.
 */

// --- Logic Section ---
import { useEffect, useRef } from 'react';
import { gmcpBus } from '../events/gmcpBus';
import { useVitalsStore } from '../stores/useVitalsStore';
import { GmcpCharVitals } from '../types';

type ExecuteCommand = (
    command: string,
    silent?: boolean,
    isSystem?: boolean,
    isHistorical?: boolean,
    fromDrawer?: boolean
) => void;

const getMaxHp = (data: GmcpCharVitals): number | null => {
    const value = data.maxhp ?? data.maxhits ?? data.maxhealth ?? data.H;
    return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null;
};

export const useLoginWimpySetup = (executeCommand: ExecuteCommand): void => {
    const executeCommandRef = useRef(executeCommand);

    useEffect(() => {
        executeCommandRef.current = executeCommand;
    }, [executeCommand]);

    useEffect(() => {
        let waitingForVitals = false;
        let sentForLogin = false;

        const unsubscribeStart = gmcpBus.on('Session.Start', () => {
            waitingForVitals = true;
            sentForLogin = false;
        });
        const unsubscribeVitals = gmcpBus.on('Char.Vitals', data => {
            if (!waitingForVitals || sentForLogin || data.isSnooped) return;
            const maxHp = getMaxHp(data);
            if (maxHp === null) return;

            const wimpy = Math.round(maxHp / 2);
            sentForLogin = true;
            waitingForVitals = false;
            useVitalsStore.getState().setVitals({ wimpy });
            executeCommandRef.current(`change wimpy ${wimpy}`, true, true, true, false);
        });
        const clearPendingLogin = () => {
            waitingForVitals = false;
            sentForLogin = false;
        };
        const unsubscribeReset = gmcpBus.on('Session.Reset', clearPendingLogin);
        const unsubscribeDisconnect = gmcpBus.on('Connection.Disconnect', clearPendingLogin);

        return () => {
            unsubscribeStart();
            unsubscribeVitals();
            unsubscribeReset();
            unsubscribeDisconnect();
        };
    }, []);
};
