/** @file EnvironmentTwilight.tsx -- A continuous tint inside the outdoor corner vignette. */
import React from 'react';
import type { EnvironmentTwilightProps } from '../../types';
import { useOutdoorTwilight } from '../../hooks/useOutdoorTwilight';
import './TwilightTransition.css';

// --- Twilight Rendering ---
export const EnvironmentTwilight = ({ time, isOutdoor, isEnabled }: EnvironmentTwilightProps) => {
    const appearance = useOutdoorTwilight(time, isOutdoor, isEnabled);
    return <div className="environment-twilight-vignette" aria-hidden="true"
        data-twilight-phase={appearance.phase ?? undefined}
        style={{ backgroundColor: appearance.color, opacity: appearance.opacity }} />;
};
