/**
 * @file useSpectateLiveVitalsStore.ts
 * @description Live ingest store for raw spectated character vitals.
 */

import { create } from 'zustand';
import { gmcpBus } from '../../events/gmcpBus';
import {
    VitalsState,
    initialVitalsState,
    createVitalsActions
} from '../slices/vitalsSlice';

export type SpectateLiveVitalsStore = VitalsState;

export const useSpectateLiveVitalsStore = create<SpectateLiveVitalsStore>((set, get) => ({
    ...initialVitalsState,
    ...createVitalsActions(set, get)
}));

export const getSpectateLiveVitals = () => useSpectateLiveVitalsStore.getState();

const isRecord = (data: unknown): data is Record<string, unknown> =>
    !!data && typeof data === 'object';

const isSnooped = (data: unknown) =>
    isRecord(data) && (!!data.isSnooped || !!data.spectating);

// --- Logic Section ---

gmcpBus.on('Char.Vitals', (data) => {
    if (!isSnooped(data)) return;
    getSpectateLiveVitals().applyCharVitals(data);
});

gmcpBus.on('Char.Name', (data) => {
    if (!isSnooped(data)) return;
    const name = data.data || null;
    if (name) getSpectateLiveVitals().setCharacterName(name);
});

gmcpBus.on('Char.Info', (data) => {
    if (!isSnooped(data)) return;
    getSpectateLiveVitals().applyCharInfo(data);
});
