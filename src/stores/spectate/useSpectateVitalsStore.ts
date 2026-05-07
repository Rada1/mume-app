/**
 * @file useSpectateVitalsStore.ts
 * @description Display store for the spectated character's visible vitals.
 */

import { create } from 'zustand';
import {
    VitalsState,
    initialVitalsState,
    createVitalsActions
} from '../slices/vitalsSlice';

export type VitalsStore = VitalsState;

export const useSpectateVitalsStore = create<VitalsStore>((set, get) => ({
    ...initialVitalsState,
    ...createVitalsActions(set, get)
}));

export const getSpectateVitals = () => useSpectateVitalsStore.getState();
