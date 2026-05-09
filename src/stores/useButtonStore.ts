
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

        const REMOVED_BUTTON_IDS = new Set([
            'kb-reply', 'trig-hungry', 'trig-thirsty',
            // pre-rename armour/shield cleanup
            'cat-armour-wear', 'cat-armour-wield', 'cat-armour-mend',
            // pre-rename obj-char/worn/room IDs
            'cat-obj-char-drop', 'cat-obj-char-wear', 'cat-obj-char-wield',
            'cat-obj-char-sell', 'cat-obj-char-value', 'cat-obj-char-mend',
            'cat-obj-char-give', 'cat-obj-char-put',
            'cat-obj-worn-remove', 'cat-obj-worn-examine',
            'cat-obj-room-get', 'cat-shopkeeper-sell-drag',
            // cat-* → btn-* rename (world)
            'cat-lantern-light', 'cat-lantern-snuff', 'cat-lantern-fill',
            'cat-lightsource-cover', 'cat-lightsource-uncover',
            'cat-corpse-drag', 'cat-corpse-butcher', 'cat-corpse-scalp',
            'cat-container-open', 'cat-container-close', 'cat-container-get-all', 'cat-container-look-in',
            'cat-exit-go', 'cat-exit-look',
            // cat-* → btn-* rename (items)
            'cat-food-eat', 'cat-food-get', 'cat-water-drink',
            'cat-fluid-drink', 'cat-fluid-pour', 'cat-fluid-empty', 'cat-fluid-look-in',
            'cat-weapon-wield', 'cat-room-get', 'cat-obj-examine',
            'cat-inv-drop', 'cat-inv-wear', 'cat-inv-wield', 'cat-inv-sell', 'cat-inv-value', 'cat-inv-mend', 'cat-inv-give', 'cat-inv-put',
            'cat-worn-remove', 'cat-worn-examine',
            // cat-* → btn-* rename (npcs)
            'cat-innkeeper-offer', 'cat-innkeeper-rent',
            'cat-mount-group', 'cat-mount-ride', 'cat-mount-lead', 'cat-mount-unsaddle-all', 'cat-mount-unsaddle', 'cat-mount-abandon', 'cat-mount-saddle',
            'cat-guildmaster-practice', 'cat-shopkeeper-shop',
            'cat-shopitem-buy', 'cat-shopitem-show', 'cat-default-kill',
            // inlp-* / innpc-* / tgt-* → btn-* merge
            'inlp-ex', 'inlp-whois', 'inlp-consider', 'inlp-hit',
            'inlp-group', 'inlp-follow', 'inlp-soc', 'inlp-conv',
            'inlp-remote-whois', 'inlp-remote-conv',
            'inlp-kill', 'inlp-track',
            'inlp-neutral-soc', 'inlp-neutral-conv',
            'innpc-group', 'innpc-consider', 'innpc-kill', 'innpc-ex',
            'innpc-look', 'innpc-steal',
            'tgt-look', 'tgt-examine', 'tgt-get', 'tgt-kill', 'tgt-clear',
            // merged into btn-kill
            'btn-kill', 'btn-track',
            'btn-default-kill',
            // merged into btn-look / btn-get
            'btn-exit-look', 'btn-room-get'
        ]);

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
