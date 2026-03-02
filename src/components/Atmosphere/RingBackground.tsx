import React from 'react';
import { LightingType } from '../../types';

interface RingBackgroundProps {
    lighting: LightingType;
}

const RingBackground: React.FC<RingBackgroundProps> = ({ lighting }) => {
    return (
        <div className={`ring-container lighting-${lighting}`}>
            <div className="ring-image" />
        </div>
    );
};

export default RingBackground;
