/** @file Sound editor navigation and keyboard access. */
import { useState } from 'react';
import type { KeyboardEvent } from 'react';
import type { SoundSettingsSection } from '../types';

// --- Section Navigation ---
export const SOUND_SETTINGS_SECTIONS = [
    { id: 'zone', label: 'Zone Music' }, { id: 'game', label: 'Sound Effects' }, { id: 'ui', label: 'UI Sounds' }
] as const;
export const useSoundSettingsSections = () => {
    const [activeSection, setActiveSection] = useState<SoundSettingsSection>('zone');
    const handleTabKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
        event.preventDefault();
        const index = SOUND_SETTINGS_SECTIONS.findIndex(section => section.id === activeSection);
        const next = event.key === 'Home' ? 0 : event.key === 'End' ? 2 : (index + (event.key === 'ArrowRight' ? 1 : 2)) % 3;
        setActiveSection(SOUND_SETTINGS_SECTIONS[next].id);
        event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next]?.focus();
    };
    return { activeSection, setActiveSection, handleTabKeyDown };
};
