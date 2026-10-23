/** @file SunDisc.tsx -- A clock-positioned sun retained inside the source vignette fade. */
import React from 'react';
import type { MumeTime } from '../../types';
import { useSunPosition } from '../../hooks/useSunPosition';

// --- Solar Rendering ---
export const SunDisc = ({ time }: { time?: MumeTime }) => {
    const position = useSunPosition(time);
    return <div className="client-sun-disc" aria-hidden="true" style={{
        left: `${position.xPercent}%`, top: `${position.yPercent}%`, opacity: position.opacity,
    }} />;
};
