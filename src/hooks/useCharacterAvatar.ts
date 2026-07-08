/**
 * @file useCharacterAvatar.ts
 * @description Resolves the active character's avatar asset (gif / mp4 / png) from
 * GMCP race + subrace + position. Shared by the Gear drawer and the prompt box so
 * the per-race mapping lives in exactly one place.
 */

import { useMemo } from 'react';
import { useVitalsStore } from '../stores/useVitalsStore';
import { resolveRaceBackground } from '../utils/raceBackgrounds';

export interface CharacterAvatar {
    /** Asset path, or null when the race is unknown. */
    src: string | null;
    /** True when src is a video (mp4) and should render in a <video> element. */
    isVideo: boolean;
    /** True when the character is mounted/riding. */
    isMounted: boolean;
    /** Display label, e.g. "Man - Gondorian". */
    label: string;
}

const AVATARS = '/assets/Pictures/Avatars/';

/**
 * Resolve the avatar src for a given race/subrace/mounted state. Pure helper so it
 * can be reused outside React if needed.
 */
export function resolveCharacterAvatarSrc(
    race: string | null | undefined,
    subrace: string | null | undefined,
    isMounted: boolean
): string | null {
    if (!race) return null;
    const normRace = race.toLowerCase().trim();

    if (isMounted) {
        if (normRace === 'dwarf') return `${AVATARS}dwarfonpony.png`;
        if (normRace === 'elf') return `${AVATARS}elfonhorse.png`;
        if (normRace === 'man' || normRace === 'numenorean' || normRace === 'númenórean') {
            return `${AVATARS}manonhorse.png`;
        }
    }

    if (normRace.includes('elf') && !normRace.includes('half')) {
        return `${AVATARS}elf.png`;
    }
    if (normRace.includes('hobbit')) {
        return `${AVATARS}hobbit.png`;
    }
    if (
        normRace.includes('man') ||
        normRace.includes('numenorean') ||
        normRace.includes('númenórean') ||
        normRace.includes('ainu') ||
        normRace.includes('ainur')
    ) {
        return `${AVATARS}man.png`;
    }
    if (normRace.includes('orc')) {
        const normSub = (subrace || '').toLowerCase();
        if (normSub.includes('tark') || normSub.includes('black') || normSub.includes('morruhk')) {
            return `${AVATARS}blackorc.png`;
        }
        return `${AVATARS}orc.png`;
    }
    if (normRace.includes('troll')) {
        return `${AVATARS}troll.png`;
    }

    return resolveRaceBackground(race);
}

/**
 * Hook form: reads the active character's race/subrace/position from the vitals
 * store and returns the resolved avatar descriptor.
 */
export function useCharacterAvatar(): CharacterAvatar {
    const characterInfo = useVitalsStore(state => state.characterInfo);
    const position = useVitalsStore(state => state.position);

    return useMemo(() => {
        const normPos = position?.toLowerCase();
        const isMounted = normPos === 'riding' || normPos === 'mounted';
        const src = resolveCharacterAvatarSrc(characterInfo.race, characterInfo.subrace, isMounted);
        const label = [characterInfo.race, characterInfo.subrace].filter(Boolean).join(' - ');

        return {
            src,
            isVideo: !!src && src.endsWith('.mp4'),
            isMounted,
            label
        };
    }, [characterInfo.race, characterInfo.subrace, position]);
}
