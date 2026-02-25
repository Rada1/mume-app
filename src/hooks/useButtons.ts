import { useState, useRef, useEffect, useMemo } from 'react';
import { CustomButton } from '../types';
import { DEFAULT_BUTTONS, DEFAULT_UI_POSITIONS } from '../constants/buttons';
import { MAGE_SPELLS, CLERIC_SPELLS } from '../utils/spellLists';

export const useButtons = () => {
    const [buttons, setButtons] = useState<CustomButton[]>(() => {
        const saved = localStorage.getItem('mud-buttons');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                const loadedIds = new Set(parsed.map((b: any) => b.id));
                const missingDefaults = DEFAULT_BUTTONS.filter(b => !loadedIds.has(b.id)).map(b => ({ ...b, isVisible: !b.trigger?.enabled }));

                return [...parsed.map((b: CustomButton) => ({
                    ...b,
                    isVisible: !b.trigger?.enabled,
                    setId: b.setId || 'main',
                    actionType: b.actionType || 'command',
                    display: b.display || 'floating',
                    style: {
                        ...b.style,
                        transparent: b.style.transparent || false
                    },
                    trigger: {
                        ...b.trigger,
                        type: b.trigger?.type || 'show'
                    }
                })), ...missingDefaults];
            } catch (e) { console.error("Failed to load buttons", e); }
        }
        return DEFAULT_BUTTONS;
    });

    const [activeSet, setActiveSet] = useState('main');
    const [isEditMode, setIsEditMode] = useState(false);
    const [editingButtonId, setEditingButtonId] = useState<string | null>(null);
    const [dragState, setDragState] = useState<{ id: string, startX: number, startY: number, initialX: number, initialY: number, type: 'move' | 'resize' | 'cluster' | 'cluster-resize', initialW: number, initialH: number, initialPositions?: Record<string, { x: number, y: number }>, initialSizes?: Record<string, { w: number, h: number }> } | null>(null);
    const buttonTimers = useRef<{ [key: string]: ReturnType<typeof setTimeout> }>({});
    const buttonsRef = useRef(buttons);

    const [hasUserDefaults, setHasUserDefaults] = useState(!!localStorage.getItem('mud-buttons-user-default'));

    const [combatSet, setCombatSet] = useState<string | undefined>(() => localStorage.getItem('mud-combat-set') || undefined);
    const [defaultSet, setDefaultSet] = useState<string | undefined>(() => localStorage.getItem('mud-default-set') || 'main');

    const [isGridEnabled, setIsGridEnabled] = useState(() => localStorage.getItem('mud-grid-enabled') === 'true');
    const [gridSize, setGridSize] = useState(() => parseInt(localStorage.getItem('mud-grid-size') || '5'));

    useEffect(() => {
        localStorage.setItem('mud-grid-enabled', isGridEnabled.toString());
    }, [isGridEnabled]);

    useEffect(() => {
        localStorage.setItem('mud-grid-size', gridSize.toString());
    }, [gridSize]);

    useEffect(() => { buttonsRef.current = buttons; }, [buttons]);

    useEffect(() => {
        const toSave = buttons.map(b => ({ ...b, isVisible: undefined }));
        localStorage.setItem('mud-buttons', JSON.stringify(toSave));
    }, [buttons]);

    useEffect(() => {
        if (combatSet) localStorage.setItem('mud-combat-set', combatSet);
        else localStorage.removeItem('mud-combat-set');
    }, [combatSet]);

    useEffect(() => {
        if (defaultSet) localStorage.setItem('mud-default-set', defaultSet);
        else localStorage.removeItem('mud-default-set');
    }, [defaultSet]);

    useEffect(() => {
        const coreSets = ['magespelllist', 'clericspelllist', 'thiefskilllist', 'warriorskilllist', 'rangerskilllist', 'Xbox', 'inventorylist', 'equipmentlist'];
        const missingSets = coreSets.filter(setName => !buttons.some(b => b.setId === setName));

        let buttonsToAdd: CustomButton[] = [];

        if (missingSets.length > 0) {
            const buttonsToRestore = DEFAULT_BUTTONS.filter(b => missingSets.includes(b.setId || ''));
            buttonsToAdd = [...buttonsToAdd, ...buttonsToRestore];
        }

        // Specifically check for new core buttons that existing users might be missing
        const requiredCoreButtons = ['inv-give', 'xbox-z'];
        requiredCoreButtons.forEach(reqId => {
            if (!buttons.some(b => b.id === reqId)) {
                const reqBtn = DEFAULT_BUTTONS.find(b => b.id === reqId);
                if (reqBtn) buttonsToAdd.push(reqBtn);
            }
        });

        if (buttonsToAdd.length > 0) {
            setButtons(prev => {
                const existingIds = new Set(prev.map(b => b.id));
                const uniqueNew = buttonsToAdd.filter(b => !existingIds.has(b.id));
                return uniqueNew.length > 0 ? [...prev, ...uniqueNew] : prev;
            });
        }
    }, [buttons.length, buttons]); // Re-check if length changes or buttons structure changes

    const availableSets = useMemo(() => {
        const sets = new Set<string>();
        sets.add('main');
        buttons.forEach(b => {
            if (b.setId) sets.add(b.setId);
            if (b.trigger?.type === 'switch_set' && b.trigger.targetSet) {
                sets.add(b.trigger.targetSet);
            }
        });
        return Array.from(sets);
    }, [buttons]);

    const createButton = (defaults?: Partial<CustomButton>) => {
        const newBtn: CustomButton = {
            id: Math.random().toString(36).substring(7),
            label: 'New Button',
            command: 'look',
            setId: activeSet,
            actionType: 'command',
            display: 'floating',
            style: {
                x: isGridEnabled ? Math.round(50 / gridSize) * gridSize : 50,
                y: isGridEnabled ? Math.round(50 / gridSize) * gridSize : 50,
                w: 120,
                h: 40,
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                transparent: true,
                shape: 'rect'
            },
            trigger: {
                enabled: false,
                pattern: '',
                isRegex: false,
                autoHide: true,
                duration: 0,
                type: 'show'
            },
            isVisible: true,
            ...defaults
        };
        setButtons(prev => [...prev, newBtn]);
    };

    const deleteButton = (id: string) => {
        setButtons(prev => prev.filter(b => b.id !== id));
        setEditingButtonId(null);
    };

    const deleteSet = (setName: string) => {
        if (setName === 'main') return; // Cannot delete main set

        setButtons(prev => {
            // Remove buttons in this set
            let next = prev.filter(b => b.setId !== setName);

            // Cleanup references in other buttons (nav commands or targetSets)
            next = next.map(b => {
                let updated = false;
                let bClone = { ...b };

                if (b.actionType === 'nav' && b.command === setName) {
                    bClone.command = 'main';
                    bClone.label = 'MAIN';
                    updated = true;
                }

                if (b.trigger?.type === 'switch_set' && b.trigger.targetSet === setName) {
                    bClone.trigger = { ...b.trigger, targetSet: 'main' };
                    updated = true;
                }

                return updated ? bClone : b;
            });

            return next;
        });

        if (activeSet === setName) setActiveSet('main');
        if (combatSet === setName) setCombatSet(undefined);
        if (defaultSet === setName) setDefaultSet('main');

        addMessageRef.current?.('system', `Deleted button set: ${setName}`);
    };

    const saveAsDefault = () => {
        const toSaveButtons = buttons.map(b => ({ ...b, isVisible: undefined }));
        localStorage.setItem('mud-buttons-user-default', JSON.stringify(toSaveButtons));
        localStorage.setItem('mud-ui-positions-user-default', JSON.stringify(uiPositions));
        setHasUserDefaults(true);
    };

    const saveAsCoreDefault = () => {
        const toSaveButtons = buttons.map(b => ({ ...b, isVisible: undefined }));
        localStorage.setItem('mud-buttons-core-default', JSON.stringify(toSaveButtons));
        localStorage.setItem('mud-ui-positions-core-default', JSON.stringify(uiPositions));
    };

    const resetToDefaults = (mode: 'user' | 'core' | 'factory') => {
        if (mode === 'user') {
            const savedBtns = localStorage.getItem('mud-buttons-user-default');
            const savedPos = localStorage.getItem('mud-ui-positions-user-default');
            try {
                if (savedBtns) setButtons(JSON.parse(savedBtns));
                if (savedPos) setUiPositions(JSON.parse(savedPos));
                addMessageRef.current?.('system', 'Reset to your User Defaults.');
                return;
            } catch (e) { console.error("Failed to load user defaults", e); }
        }

        if (mode === 'core') {
            const coreButtons = localStorage.getItem('mud-buttons-core-default');
            const corePositions = localStorage.getItem('mud-ui-positions-core-default');
            if (coreButtons) {
                try {
                    setButtons(JSON.parse(coreButtons));
                    if (corePositions) setUiPositions(JSON.parse(corePositions));
                    addMessageRef.current?.('system', 'Reset to Core App Defaults.');
                    return;
                } catch (e) { console.error("Failed to load core defaults", e); }
            }
        }

        // Factory Reset (Hardcoded)
        setButtons(DEFAULT_BUTTONS);
        setUiPositions(DEFAULT_UI_POSITIONS);
        addMessageRef.current?.('system', 'Reset to Factory Defaults.');
    };

    const [selectedButtonIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [uiPositions, setUiPositions] = useState<{ joystick?: { x: number, y: number, scale?: number }, xbox?: { x: number, y: number, scale?: number }, stats?: { x: number, y: number, scale?: number }, mapper?: { x: number, y: number, scale?: number, w?: number, h?: number } }>(() => {
        try {
            const saved = localStorage.getItem('mud-ui-positions');
            if (saved) return JSON.parse(saved);

            const coreSaved = localStorage.getItem('mud-ui-positions-core-default');
            if (coreSaved) return JSON.parse(coreSaved);

            return DEFAULT_UI_POSITIONS;
        } catch { return DEFAULT_UI_POSITIONS; }
    });

    useEffect(() => {
        localStorage.setItem('mud-ui-positions', JSON.stringify(uiPositions));
    }, [uiPositions]);

    const toggleSelection = (id: string, multi: boolean) => {
        setSelectedIds(prev => {
            const next = new Set(multi ? prev : []);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const addMessageRef = useRef<((type: string, content: string) => void) | null>(null);
    const setAddMessage = (fn: (type: string, content: string) => void) => { addMessageRef.current = fn; };

    return useMemo(() => ({
        buttons,
        setButtons,
        buttonsRef,
        activeSet,
        setActiveSet,
        isEditMode,
        setIsEditMode,
        editingButtonId,
        setEditingButtonId,
        selectedButtonIds,
        setSelectedIds,
        toggleSelection,
        uiPositions,
        setUiPositions,
        dragState,
        setDragState,
        availableSets,
        createButton,
        deleteButton,
        deleteSet,
        saveAsDefault,
        saveAsCoreDefault,
        resetToDefaults,
        hasUserDefaults,
        buttonTimers,
        combatSet,
        setCombatSet,
        defaultSet,
        setDefaultSet,
        isGridEnabled,
        setIsGridEnabled,
        gridSize,
        setGridSize,
        setAddMessage
    }), [
        buttons, activeSet, isEditMode, editingButtonId, selectedButtonIds,
        uiPositions, dragState, availableSets, hasUserDefaults,
        combatSet, defaultSet, isGridEnabled, gridSize
    ]);
};
