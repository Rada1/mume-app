import { useEffect } from 'react';
import { useGameAudio as useBaseGameAudio } from '../../../hooks/useGameAudio';

interface UseGameContextAudioProps {
    s: any;
    v: any;
    manualCancelRef: React.MutableRefObject<boolean>;
}

export const useGameContextAudio = ({ s, v, manualCancelRef }: UseGameContextAudioProps) => {
    const audioMethods = useBaseGameAudio({
        isSoundEnabled: s.isSoundEnabled,
        roomZone: s.roomZone,
        zoneMusic: s.zoneMusic,
        inCombat: s.inCombat,
        lighting: s.lighting,
        currentTerrain: s.currentTerrain,
        weather: s.weather,
        playerPosition: s.playerPosition,
        waiting: v.stats.conditions?.waiting,
        manualCancelRef,
        gameState: s.gameState
    });

    const {
        initAudio, loadClickSound, loadMovementSound, loadDoorSound,
        loadHitImpactSound, loadSpellSounds, loadCommMessageSound, loadTutorialExitSound
    } = audioMethods;

    useEffect(() => {
        if (initAudio && loadClickSound && loadMovementSound && loadDoorSound && loadHitImpactSound && loadSpellSounds && loadCommMessageSound) {
            initAudio();
            loadClickSound();
            loadMovementSound();
            loadDoorSound();
            loadHitImpactSound();
            loadSpellSounds();
            loadCommMessageSound();
            loadTutorialExitSound();
        }
    }, [initAudio, loadClickSound, loadMovementSound, loadDoorSound, loadHitImpactSound, loadSpellSounds, loadCommMessageSound, loadTutorialExitSound]);

    return audioMethods;
};
