import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { CustomButton, ButtonSetSettings } from '../types';
import { DEFAULT_BUTTONS, DEFAULT_UI_POSITIONS, DEFAULT_SET_SETTINGS } from '../constants/buttons';
import MASTER_SETTINGS from '../constants/mastersettings.json';
import { useButtonPersistence } from './useButtonPersistence';
import { useButtonLogic } from './useButtonLogic';

export const useButtons = (abilities: Record<string, number>, characterClass: string) => {
    const [activeSet, setActiveSet] = useState('main');
    const [isEditMode, setIsEditMode] = useState(false);
    const [editingButtonId, setEditingButtonId] = useState<string | null>(null);
    const [selectedButtonIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [dragState, setDragState] = useState<any>(null);
    const [isGridEnabled, setIsGridEnabled] = useState(() => localStorage.getItem('mud-grid-enabled') === 'true');
    const [gridSize, setGridSize] = useState(() => parseInt(localStorage.getItem('mud-grid-size') || '5'));
    const [combatSet, setCombatSet] = useState<string | undefined>(() => localStorage.getItem('mud-combat-set') || undefined);
    const [defaultSet, setDefaultSet] = useState<string | undefined>(() => localStorage.getItem('mud-default-set') || 'main');
    const [isSmartPopulateEnabled, setIsSmartPopulateEnabled] = useState(() => localStorage.getItem('mud-smart-populate') !== 'false');
    const [setSettings, setSetSettings] = useState<Record<string, ButtonSetSettings>>(() => {
        try {
            const saved = localStorage.getItem('mud-set-settings');
            const parsed = saved ? JSON.parse(saved) : null;
            const defaults = (MASTER_SETTINGS as any).setSettings || DEFAULT_SET_SETTINGS;
            return parsed ? { ...defaults, ...parsed } : defaults;
        } catch {
            return (MASTER_SETTINGS as any).setSettings || DEFAULT_SET_SETTINGS;
        }
    });
    const [uiPositions, setUiPositions] = useState<any>(() => {
        try {
            const saved = localStorage.getItem('mud-ui-positions');
            return saved ? JSON.parse(saved) : DEFAULT_UI_POSITIONS;
        } catch { return DEFAULT_UI_POSITIONS; }
    });

    const [rawButtons, setRawButtons] = useState<CustomButton[]>(() => {
        const saved = localStorage.getItem('mud-buttons');
        const defaultButtons = (MASTER_SETTINGS as any).buttons || DEFAULT_BUTTONS;

        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                if (parsed && Array.isArray(parsed) && parsed.length > 0) {
                    const loadedButtons = parsed.map((b: any) => {
                        const def = defaultButtons.find((d: any) => d.id === b.id);
                        return {
                            ...(def || {}),
                            ...b,
                            // If isVisible is missing (stripped for save), restore from default or fallback to true/false based on trigger
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
    });

    const buttons = useButtonLogic(rawButtons, activeSet, abilities, characterClass, isEditMode, isSmartPopulateEnabled);
    const { resetToDefaults } = useButtonPersistence(rawButtons, setRawButtons, uiPositions, setUiPositions);

    const buttonsRef = useRef(buttons);
    useEffect(() => { buttonsRef.current = buttons; }, [buttons]);
    const buttonTimers = useRef<{ [key: string]: ReturnType<typeof setTimeout> }>({});
    const addMessageRef = useRef<((type: string, content: string) => void) | null>(null);

    const toggleSelection = (id: string, multi: boolean) => {
        setSelectedIds(prev => {
            const next = new Set(multi ? prev : []);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    };

    const createButton = useCallback((defaults?: Partial<CustomButton>) => {
        const id = Math.random().toString(36).substring(7);
        const newBtn: CustomButton = {
            id, label: 'New Button', command: 'look', setId: activeSet, actionType: 'command', display: 'floating', isVisible: true, hideIfUnknown: true,
            style: { x: isGridEnabled ? Math.round(50 / gridSize) * gridSize : 50, y: isGridEnabled ? Math.round(50 / gridSize) * gridSize : 50, w: 120, h: 40, backgroundColor: 'rgba(255, 255, 255, 0.1)', transparent: true, shape: 'rect' },
            trigger: { enabled: false, pattern: '', isRegex: false, autoHide: true, duration: 0, type: 'show' },
            ...defaults
        };
        setRawButtons(prev => [...prev, newBtn]);
        setEditingButtonId(id); setSelectedIds(new Set([id]));
    }, [activeSet, isGridEnabled, gridSize]);

    const deleteButton = useCallback((id: string) => { setRawButtons(prev => prev.filter(b => b.id !== id)); setEditingButtonId(null); }, []);

    const deleteSet = useCallback((setName: string) => {
        if (setName === 'main') return;
        setRawButtons(prev => prev.filter(b => b.setId !== setName).map(b => {
            if (b.actionType === 'nav' && b.command === setName) return { ...b, command: 'main', label: 'MAIN' };
            if (b.trigger?.type === 'switch_set' && b.trigger.targetSet === setName) return { ...b, trigger: { ...b.trigger, targetSet: 'main' } };
            return b;
        }));
        if (activeSet === setName) setActiveSet('main');
        addMessageRef.current?.('system', `Deleted set: ${setName}`);
    }, [activeSet]);
    const availableSets = useMemo(() => {
        const sets = new Set(['main', 'spellbook', 'ranger', 'warrior', 'mage', 'cleric', 'thief']);
        rawButtons.forEach(b => {
            if (b.setId) sets.add(b.setId);
            if (b.trigger?.type === 'switch_set' && b.trigger.targetSet) sets.add(b.trigger.targetSet);
        });
        return Array.from(sets);
    }, [rawButtons]);

    useEffect(() => {
        const themeColor = setSettings[activeSet]?.themeColor;
        if (themeColor) {
            document.documentElement.style.setProperty('--set-accent', themeColor);

            // Handle RGB conversion for rgba() usage
            if (themeColor.startsWith('#')) {
                const hex = themeColor.slice(1);
                const r = parseInt(hex.substring(0, 2), 16);
                const g = parseInt(hex.substring(2, 4), 16);
                const b = parseInt(hex.substring(4, 6), 16);
                if (!isNaN(r) && !isNaN(g) && !isNaN(b)) {
                    document.documentElement.style.setProperty('--set-accent-rgb', `${r}, ${g}, ${b}`);
                }
            }
        } else {
            document.documentElement.style.removeProperty('--set-accent');
            document.documentElement.style.removeProperty('--set-accent-rgb');
        }
    }, [activeSet, setSettings]);

    useEffect(() => {
        localStorage.setItem('mud-set-settings', JSON.stringify(setSettings));
    }, [setSettings]);

    useEffect(() => {
        localStorage.setItem('mud-smart-populate', isSmartPopulateEnabled ? 'true' : 'false');
    }, [isSmartPopulateEnabled]);

    useEffect(() => {
        localStorage.setItem('mud-grid-enabled', isGridEnabled ? 'true' : 'false');
    }, [isGridEnabled]);

    useEffect(() => {
        localStorage.setItem('mud-grid-size', gridSize.toString());
    }, [gridSize]);

    useEffect(() => {
        if (combatSet) localStorage.setItem('mud-combat-set', combatSet);
        else localStorage.removeItem('mud-combat-set');
    }, [combatSet]);

    useEffect(() => {
        if (defaultSet) localStorage.setItem('mud-default-set', defaultSet);
        else localStorage.removeItem('mud-default-set');
    }, [defaultSet]);

    return useMemo(() => ({
        buttons, setButtons: setRawButtons, rawButtons, buttonsRef, activeSet, setActiveSet, isEditMode, setIsEditMode, editingButtonId, setEditingButtonId, selectedButtonIds, setSelectedIds, toggleSelection, uiPositions, setUiPositions, dragState, setDragState, availableSets, createButton, deleteButton, deleteSet, resetToDefaults: (m?: any) => resetToDefaults(addMessageRef.current || undefined), buttonTimers, combatSet, setCombatSet, defaultSet, setDefaultSet, isGridEnabled, setIsGridEnabled, gridSize, setGridSize, setAddMessage: (fn: any) => { addMessageRef.current = fn; },
        setSettings, setSetSettings, isSmartPopulateEnabled, setIsSmartPopulateEnabled
    }), [buttons, rawButtons, activeSet, isEditMode, editingButtonId, selectedButtonIds, uiPositions, dragState, availableSets, combatSet, defaultSet, isGridEnabled, gridSize, createButton, deleteButton, deleteSet, resetToDefaults, setSettings, isSmartPopulateEnabled]);
};
