/**
 * @file audioManifest.ts
 * @description Centralized configuration for all game sound effects.
 */

export interface SoundConfig {
    path: string;
    defaultVolume?: number;
    defaultPitch?: number;
    category?: 'combat' | 'ui' | 'environment' | 'magic';
}

export const AUDIO_MANIFEST: Record<string, SoundConfig> = {
    // UI Sounds
    click: { path: '/assets/Sounds/Sound effects/click.mp3', defaultVolume: 2.0, category: 'ui' },
    buySell: { path: '/assets/Sounds/Sound effects/sellandbuy.mp3', defaultVolume: 1.5, category: 'ui' },
    commBubble: { path: '/assets/Sounds/Sound effects/commbubble.mp3', defaultVolume: 0.9, category: 'ui' },

    // Movement & Environment
    move: { path: '/assets/Sounds/Sound effects/move.mp3', defaultVolume: 0.6, category: 'environment' },
    waterMove: { path: '/assets/Sounds/Sound effects/watermove.mp3', defaultVolume: 0.6, category: 'environment' },
    door: { path: '/assets/Sounds/Sound effects/door1.wav', defaultVolume: 1.5, category: 'environment' },

    // Combat - Impacts
    hitImpact: { path: '/assets/Sounds/Sound effects/hit-impact.mp3', defaultVolume: 0.7, category: 'combat' },
    oof: { path: '/assets/Sounds/Sound effects/oof.mp3', defaultVolume: 0.9, category: 'combat' },
    kill: { path: '/assets/Sounds/Sound effects/kill.wav', defaultVolume: 1.1, category: 'combat' },
    level: { path: '/assets/Sounds/Sound effects/level.wav', defaultVolume: 1.3, category: 'combat' },

    // Combat - Weapons
    slash: { path: '/assets/Sounds/Sound effects/slash.mp3', defaultVolume: 0.75, category: 'combat' },
    cleave: { path: '/assets/Sounds/Sound effects/cleave.mp3', defaultVolume: 0.75, category: 'combat' },
    smite: { path: '/assets/Sounds/Sound effects/smite.mp3', defaultVolume: 0.75, category: 'combat' },
    pierce: { path: '/assets/Sounds/Sound effects/pierce.mp3', defaultVolume: 0.75, defaultPitch: 1.6, category: 'combat' },
    stab: { path: '/assets/Sounds/Sound effects/stab.mp3', defaultVolume: 0.75, category: 'combat' },
    bash: { path: '/assets/Sounds/Sound effects/bash.mp3', defaultVolume: 0.75, category: 'combat' },
    arrowHit: { path: '/assets/Sounds/Sound effects/arrowhit.mp3', defaultVolume: 0.75, category: 'combat' },

    // Magic
    incantations: { path: '/assets/Sounds/Sound effects/incantations.mp3', defaultVolume: 0.7, defaultPitch: 1.5, category: 'magic' },
    magicExplosion: { path: '/assets/Sounds/Sound effects/magicexplosion.mp3', defaultVolume: 1.5, category: 'magic' },
};
