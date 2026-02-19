import { useState, useRef, useEffect, useMemo } from 'react';
import { CustomButton } from '../types';
import { DEFAULT_BUTTONS } from '../constants/buttons';
import { MAGE_SPELLS, CLERIC_SPELLS } from '../utils/spellLists';

export const useButtons = () => {
    const [buttons, setButtons] = useState<CustomButton[]>(() => {
        const saved = localStorage.getItem('mud-buttons');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                return parsed.map((b: CustomButton) => ({
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
                }));
            } catch (e) { console.error("Failed to load buttons", e); }
        }
        return DEFAULT_BUTTONS;
    });

    const [activeSet, setActiveSet] = useState('main');
    const [isEditMode, setIsEditMode] = useState(false);
    const [editingButtonId, setEditingButtonId] = useState<string | null>(null);
    const [dragState, setDragState] = useState<{ id: string, startX: number, startY: number, initialX: number, initialY: number, type: 'move' | 'resize' | 'cluster' | 'cluster-resize', initialW: number, initialH: number, initialPositions?: Record<string, { x: number, y: number }> } | null>(null);
    const buttonTimers = useRef<{ [key: string]: ReturnType<typeof setTimeout> }>({});
    const buttonsRef = useRef(buttons);

    const [hasUserDefaults, setHasUserDefaults] = useState(!!localStorage.getItem('mud-buttons-user-default'));

    const [combatSet, setCombatSet] = useState<string | undefined>(() => localStorage.getItem('mud-combat-set') || undefined);
    const [defaultSet, setDefaultSet] = useState<string | undefined>(() => localStorage.getItem('mud-default-set') || 'main');

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
        if (!localStorage.getItem('mud-default-spells-v1')) {
            const newButtons: CustomButton[] = [];

            MAGE_SPELLS.forEach((spell, i) => {
                newButtons.push({
                    id: `mage-${spell.replace(/\s+/g, '-').toLowerCase()}-${i}`,
                    label: spell,
                    command: `cast '${spell}' target`,
                    setId: 'magespelllist',
                    display: 'floating',
                    actionType: 'command',
                    isVisible: true,
                    trigger: { enabled: false, pattern: '', isRegex: false, autoHide: false, duration: 0 },
                    style: {
                        x: 5 + (i % 6) * 16,
                        y: 10 + Math.floor(i / 6) * 8,
                        w: 120, h: 40,
                        backgroundColor: 'rgba(100, 50, 180, 0.6)',
                        shape: 'pill'
                    }
                });
            });

            CLERIC_SPELLS.forEach((spell, i) => {
                newButtons.push({
                    id: `cleric-${spell.replace(/\s+/g, '-').toLowerCase()}-${i}`,
                    label: spell,
                    command: `cast '${spell}' target`,
                    setId: 'clericspelllist',
                    display: 'floating',
                    actionType: 'command',
                    isVisible: true,
                    trigger: { enabled: false, pattern: '', isRegex: false, autoHide: false, duration: 0 },
                    style: {
                        x: 5 + (i % 6) * 16,
                        y: 10 + Math.floor(i / 6) * 8,
                        w: 120, h: 40,
                        backgroundColor: 'rgba(180, 160, 50, 0.6)',
                        shape: 'pill'
                    }
                });
            });

            if (newButtons.length > 0) {
                setButtons(prev => [...prev, ...newButtons]);
                localStorage.setItem('mud-default-spells-v1', 'true');
            }
        }

        // Inject new skill lists (Thief, Warrior, Ranger)
        if (!localStorage.getItem('mud-default-skills-v1')) {
            const skillButtons = DEFAULT_BUTTONS.filter(b =>
                ['thiefskilllist', 'warriorskilllist', 'rangerskilllist'].includes(b.setId)
            );
            if (skillButtons.length > 0) {
                setButtons(prev => [...prev, ...skillButtons]);
                localStorage.setItem('mud-default-skills-v1', 'true');
            }
        }
    }, []);

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
                x: 50,
                y: 50,
                w: 120,
                h: 40,
                backgroundColor: '#4ade80',
                transparent: false,
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

    const saveAsDefault = () => {
        const toSave = buttons.map(b => ({ ...b, isVisible: undefined }));
        localStorage.setItem('mud-buttons-user-default', JSON.stringify(toSave));
        setHasUserDefaults(true);
    };

    const [selectedButtonIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [uiPositions, setUiPositions] = useState<{ joystick?: { x: number, y: number, scale?: number }, stats?: { x: number, y: number, scale?: number } }>(() => {
        try {
            const saved = localStorage.getItem('mud-ui-positions');
            return saved ? JSON.parse(saved) : {};
        } catch { return {}; }
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

    return {
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
        saveAsDefault,
        hasUserDefaults,
        buttonTimers,
        combatSet,
        setCombatSet,
        defaultSet,
        setDefaultSet
    };
};
