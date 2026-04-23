
import { create } from 'zustand';
import { CustomButton } from '../types';
import { DEFAULT_BUTTONS } from '../constants/buttons';
import MASTER_SETTINGS from '../constants/mastersettings.json';

interface ButtonState {
    rawButtons: CustomButton[];
    setRawButtons: (buttons: CustomButton[] | ((prev: CustomButton[]) => CustomButton[])) => void;
}

export const useButtonStore = create<ButtonState>((set) => ({
    rawButtons: (() => {
        if (typeof window === 'undefined') return [];
        const saved = localStorage.getItem('mud-buttons');
        const masterButtons = (MASTER_SETTINGS as any).buttons || [];
        const defaultButtons = [...masterButtons, ...DEFAULT_BUTTONS.filter(d => !masterButtons.some((m: any) => m.id === d.id))];

        const REMOVED_BUTTON_IDS = new Set(['kb-reply', 'trig-hungry', 'trig-thirsty', 'cat-armour-wear', 'cat-armour-wield']);

        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                if (parsed && Array.isArray(parsed) && parsed.length > 0) {
                    const loadedButtons = parsed.filter((b: any) => !REMOVED_BUTTON_IDS.has(b.id)).map((b: any) => {
                        const def = defaultButtons.find((d: any) => d.id === b.id);
                        return {
                            ...(def || {}),
                            ...b,
                            isVisible: (b.isVisible !== undefined) ? b.isVisible : (def?.isVisible ?? (b.trigger?.enabled ? false : true))
                        };
                    });
                    const loadedIds = new Set(parsed.map((b: any) => b.id));
                    const missingDefaults = defaultButtons.filter((b: any) => !loadedIds.has(b.id));
                    return [...loadedButtons, ...missingDefaults];
                }
            } catch (e) { }
        }
        return defaultButtons;
    })(),
    setRawButtons: (updater) => set((state) => {
        const next = typeof updater === 'function' ? updater(state.rawButtons) : updater;
        localStorage.setItem('mud-buttons', JSON.stringify(next));
        return { rawButtons: next };
    })
}));
