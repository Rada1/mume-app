/** @file UiProfiler.tsx — Stable profiling boundaries that retain mounted UI state. */
import React, { Profiler } from 'react';
import { uiPerformance } from '../../utils/uiPerformance';

// --- Profiling Section ---
const recordRender: React.ProfilerOnRenderCallback = (id, _phase, actualDuration) => {
    uiPerformance.recordRender(id, actualDuration);
};

export const UiProfiler = ({id, children}: {id: string; children: React.ReactNode}) =>
    <Profiler id={id} onRender={recordRender}>{children}</Profiler>;

export function withUiProfiler<Props extends object>(id: string, Component: React.ComponentType<Props>) {
    const Profiled = (props: Props) => <UiProfiler id={id}><Component {...props}/></UiProfiler>;
    Profiled.displayName = `Profiled(${id})`;
    return Profiled;
}
