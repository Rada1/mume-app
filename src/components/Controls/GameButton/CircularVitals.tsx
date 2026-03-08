import React from 'react';

interface CircularVitalsProps {
    hpRatio?: number;
    manaRatio?: number;
    moveRatio?: number;
    w: number;
    h: number;
    borderRadius: number;
    isOuter?: boolean;
}

export const CircularVitals: React.FC<CircularVitalsProps> = ({
    hpRatio,
    manaRatio,
    moveRatio,
    w,
    h,
    borderRadius,
    isOuter = true
}) => {
    const strokeWidth = isOuter ? 4 : 3;
    const gap = isOuter ? 4 : 0;
    const margin = strokeWidth / 2 + gap; // Distance from button edge to path center
    const offset = 10; // Extra padding for the SVG container to prevent clipping
    
    // The visual dimensions of the path (centerline to centerline)
    const pw = w + 2 * margin;
    const ph = h + 2 * margin;
    
    // The radius for the path corners
    // We adjust the button's border radius by the same margin
    const pr = Math.max(0, Math.min(pw / 2, ph / 2, borderRadius + margin));
    
    // SVG viewbox coordinates for the four corners of the path
    const x1 = offset - margin;
    const y1 = offset - margin;
    const x2 = offset + w + margin;
    const y2 = offset + h + margin;
    
    // Path starting from top-middle
    const pathData = `
        M ${offset + w / 2} ${y1}
        L ${x2 - pr} ${y1}
        A ${pr} ${pr} 0 0 1 ${x2} ${y1 + pr}
        L ${x2} ${y2 - pr}
        A ${pr} ${pr} 0 0 1 ${x2 - pr} ${y2}
        L ${x1 + pr} ${y2}
        A ${pr} ${pr} 0 0 1 ${x1} ${y2 - pr}
        L ${x1} ${y1 + pr}
        A ${pr} ${pr} 0 0 1 ${x1 + pr} ${y1}
        Z
    `;

    // Calculate total length for dasharray/offset
    // Perimeter of the rounded rectangle = 2*(width-2*r) + 2*(height-2*r) + 2*PI*r
    const straightW = Math.max(0, pw - 2 * pr);
    const straightH = Math.max(0, ph - 2 * pr);
    const perimeter = 2 * straightW + 2 * straightH + 2 * Math.PI * pr;

    const renderPath = (ratio: number | undefined, color1: string, color2: string, id: string) => {
        if (ratio === undefined) return null;
        
        const progress = Math.max(0, Math.min(1, ratio));
        const dashOffset = perimeter * (1 - progress);

        return (
            <g key={id}>
                <defs>
                    <linearGradient id={`grad-${id}`} x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor={color1} />
                        <stop offset="100%" stopColor={color2} />
                    </linearGradient>
                </defs>
                {/* Background track */}
                <path
                    d={pathData}
                    fill="none"
                    stroke="rgba(0,0,0,0.3)"
                    strokeWidth={strokeWidth}
                />
                {/* Progress bar */}
                <path
                    d={pathData}
                    fill="none"
                    stroke={`url(#grad-${id})`}
                    strokeWidth={strokeWidth}
                    strokeDasharray={perimeter}
                    strokeDashoffset={dashOffset}
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dashoffset 0.3s ease-out' }}
                />
            </g>
        );
    };

    return (
        <svg
            width={w + offset * 2}
            height={h + offset * 2}
            viewBox={`0 0 ${w + offset * 2} ${h + offset * 2}`}
            style={{
                position: 'absolute',
                top: -offset,
                left: -offset,
                pointerEvents: 'none',
                zIndex: -1,
                overflow: 'visible'
            }}
        >
            {renderPath(hpRatio, '#600', '#d00', 'hp')}
            {renderPath(manaRatio, '#407', '#b0f', 'mana')}
            {renderPath(moveRatio, '#042', '#0c4', 'move')}
        </svg>
    );
};
