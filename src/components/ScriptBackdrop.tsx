import React from 'react';
import { LightingType } from '../types';

interface ScriptBackdropProps {
    lighting: LightingType;
    isFoggy?: boolean;
}

export const ScriptBackdrop: React.FC<ScriptBackdropProps> = ({ lighting, isFoggy }) => {
    // Map lighting states to backdrop classes
    const getLightingClass = () => {
        switch (lighting) {
            case 'sun': return 'state-sun';
            case 'moon': return 'state-moon';
            case 'artificial': return 'state-artificial';
            case 'dark':
            case 'none':
            default: return 'state-dark';
        }
    };

    return (
        <div className={`script-backdrop-container ${getLightingClass()} ${isFoggy ? 'is-foggy' : ''}`}>
            <div className="script-glow-layer"></div>
            <div className="script-main-layer"></div>
        </div>
    );
};
