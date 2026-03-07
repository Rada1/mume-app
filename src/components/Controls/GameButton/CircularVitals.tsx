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
    const offset = 8; // SVG padding
    
    // Dimensions of the bar's centerline
    const bw = w + 2 * gap;
    const bh = h + 2 * gap;
    const br = Math.min(bw / 2, bh / 2, borderRadius + gap);
    
    // Path starting from top center
    const bx1 = offset - gap;
    const by1 = offset - gap;
    const bx2 = offset + w + gap;
    const by2 = offset + h + gap;
    const bmx = offset + w / 2;
    
    const pathData = `
        M ${bmx} ${by1}
        L ${bx2 - br} ${by1}
        A ${br} ${br} 0 0 1 ${bx2} ${by1 + br}
        L ${bx2} ${by2 - br}
        A ${br} ${br} 0 0 1 ${bx2 - br} ${by2}
        L ${bx1 + br} ${by2}
        A ${br} ${br} 0 0 1 ${bx1} ${by2 - br}
        L ${bx1} ${by1 + br}
        A ${br} ${br} 0 0 1 ${bx1 + br} ${by1}
        Z
    `;

    // Perimeter calculation
    const perimeter = 2 * (bw - 2 * br) + 2 * (bh - 2 * br) + 2 * Math.PI * br;

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
