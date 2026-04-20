/**
 * @file account.ts
 * @description Account and character selection stages.
 */

export type AccountStage = 'login' | 'character-select' | 'character-detail' | 'account-menu' | 'character-creation' | 'stat-editing' | 'none';

export interface CharacterEntry {
    index?: number;
    name: string;
    race: string;
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
    isGathering?: boolean;
}
