/**
 * @file PromptCharacterPortrait.tsx
 * @description Compact character avatar (gif / mp4 / png) used as the left-rail
 * anchor for the expanded prompt-box gear panel.
 */

import React from 'react';
import { useCharacterAvatar } from '../../hooks/useCharacterAvatar';

interface PromptCharacterPortraitProps {
    /** Small inline avatar sized to sit beside the name row instead of the full gear-panel frame. */
    compact?: boolean;
}

export const PromptCharacterPortrait: React.FC<PromptCharacterPortraitProps> = ({ compact }) => {
    const { src, isVideo, isMounted, label } = useCharacterAvatar();

    if (!src) return null;

    return (
        <div className={`prompt-character-portrait${compact ? ' is-compact' : ''}`} title={label} aria-label={label || 'Character'}>
            <div className="prompt-character-portrait-frame">
                {isVideo ? (
                    <video src={src} autoPlay loop muted playsInline className="prompt-character-portrait-media" />
                ) : (
                    <img
                        src={src}
                        alt={label || 'Character avatar'}
                        draggable={false}
                        className="prompt-character-portrait-media"
                    />
                )}
                {isMounted && <span className="prompt-character-portrait-mount">Mounted</span>}
            </div>
        </div>
    );
};

export default React.memo(PromptCharacterPortrait);
