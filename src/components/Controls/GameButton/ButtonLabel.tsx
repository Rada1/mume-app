import React, { Suspense, lazy } from 'react';
import { CustomButton } from '../../../types';

export const ButtonLabel: React.FC<{ button: CustomButton }> = ({ button }) => {
    if (button.icon) {
        // If it's a data URL or external image
        if (button.icon.startsWith('data:') || button.icon.startsWith('http') || button.icon.startsWith('/') || button.icon.includes('.')) {
            return (
                <img
                    src={button.icon}
                    alt={button.label}
                    className="button-icon"
                    style={{
                        transform: `scale(${button.style?.iconScale || 1})`,
                        width: '100%',
                        height: '100%',
                        objectFit: 'contain'
                    }}
                />
            );
        }
    }

    if (button.style.curvedText && button.style.shape === 'circle') {
        return (
            <svg className="curved-label-svg" viewBox="0 0 100 100" style={{ position: 'absolute', width: '100%', height: '100%', overflow: 'visible', pointerEvents: 'none' }}>
                <path id={`curve-${button.id}`} d="M 18,50 A 32,32 0 1 1 82,50 A 32,32 0 1 1 18,50" fill="transparent" />
                <text style={{ fontSize: `${(button.style.fontSize || 1.1) * 14}px`, fontWeight: '900', fill: button.style.color || '#fff', textTransform: 'uppercase', letterSpacing: '2px' }}>
                    <textPath href={`#curve-${button.id}`} startOffset="25%" textAnchor="middle">
                        {button.label}
                    </textPath>
                </text>
            </svg>
        );
    }

    return <div className="button-label">{button.label}</div>;
};
