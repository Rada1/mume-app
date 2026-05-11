/**
 * @file account.ts
 * @description Account and character selection stages.
 */

export type AccountStage = 'login' | 'account-menu' | 'character-creation' | 'stat-editing' | 'account-confirmation' | 'none';

export interface CharacterEntry {
    index?: number;
    name: string;
    race: string;
    class?: string;
    sublevel?: string;
    level: string | number;
    logon: string;
    area: string;
    rent: string;
    status?: string;
    host?: string;
}

export interface CreationOption {
    id: string;
    label: string;
}

export interface CreationPrompt {
    title: string;
    description: string;
    options: CreationOption[];
    footer?: string;
}

export interface AccountState {
    stage: AccountStage;
    characters: CharacterEntry[];
    selectedCharacter: CharacterEntry | null;
    creationPrompt?: CreationPrompt;
    lastCreatedCharacterName?: string;
    currentPrompt?: string;
    isGathering?: boolean;
    stats?: Record<string, number>;
    pointsLeft?: number;
    charSelectTab?: 'info' | 'practice' | null;
    charCapture?: { type: 'info' | 'practice' } | null;
    charInfoLines?: string[];
    charPracticeLines?: string[];
}
