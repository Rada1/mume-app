/**
 * @file SubraceBanner.tsx
 * @description Banner image that reflects the active character subrace.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { CharacterInfo } from '../../stores/slices/vitalsSlice';
import { resolveSubraceBanner } from '../../utils/subraceBanners';
import './SubraceBanner.css';

interface SubraceBannerProps {
    characterInfo: CharacterInfo;
    isAccountScreen?: boolean;
    placement?: 'header' | 'drawer';
}

// --- Logic Section ---

const SubraceBanner: React.FC<SubraceBannerProps> = ({ characterInfo, isAccountScreen = false, placement = 'header' }) => {
    const asset = useMemo(
        () => resolveSubraceBanner(characterInfo.race, characterInfo.subrace),
        [characterInfo.race, characterInfo.subrace]
    );
    const [imageSrc, setImageSrc] = useState<string | null>(asset?.src ?? null);

    useEffect(() => {
        setImageSrc(asset?.src ?? null);
    }, [asset]);

    if (isAccountScreen || !asset || !imageSrc) return null;

    const handleImageError = () => {
        setImageSrc(current => current === asset.fallbackSrc ? null : asset.fallbackSrc);
    };

    return (
        <div className={`subrace-banner subrace-banner--${placement}`} aria-label={`${asset.label} banner`}>
            <img
                className="subrace-banner-image"
                src={imageSrc}
                alt=""
                draggable={false}
                onError={handleImageError}
            />
        </div>
    );
};

export default React.memo(SubraceBanner);
