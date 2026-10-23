/** @file Sound settings section and editor contracts. */
import type { ChangeEvent } from 'react';
import type { SoundTrigger } from './mechanics';

// --- Sound Editor Types ---
export type SoundSettingsSection = 'zone' | 'game' | 'ui';
export interface SoundEffectOverridesProps {
    isSoundEnabled: boolean;
    channel: 'game' | 'ui';
}
export interface SoundSettingsProps {
    isSoundEnabled: boolean;
    setIsSoundEnabled: (value: boolean) => void;
    soundTriggers: SoundTrigger[];
    setSoundTriggers: (value: SoundTrigger[]) => void;
    newSoundPattern: string;
    setNewSoundPattern: (value: string) => void;
    newSoundRegex: boolean;
    setNewSoundRegex: (value: boolean) => void;
    handleSoundUpload: (event: ChangeEvent<HTMLInputElement>) => void;
}
