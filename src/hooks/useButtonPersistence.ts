import { useState, useEffect, useCallback } from 'react';
import { CustomButton } from '../types';
import { DEFAULT_BUTTONS, DEFAULT_UI_POSITIONS } from '../constants/buttons';

export const useButtonPersistence = (
    rawButtons: CustomButton[],
    setRawButtons: React.Dispatch<React.SetStateAction<CustomButton[]>>,
    uiPositions: any,
    setUiPositions: (pos: any) => void
) => {
    const [hasUserDefaults, setHasUserDefaults] = useState(!!localStorage.getItem('mud-buttons-user-default'));

    // Periodic check for missing core buttons/sets
    useEffect(() => {
        const coreSets = ['magespelllist', 'clericspelllist', 'thiefskilllist', 'warriorskilllist', 'rangerskilllist', 'Xbox', 'inventorylist', 'equipmentlist', 'social list', 'inlinenpc'];
        const missingSets = coreSets.filter(setName => !rawButtons.some(b => b.setId === setName));
        const requiredCoreButtons = ['inv-give', 'xbox-z', 'inlp-soc'];

        const buttonsToAdd = missingSets.length > 0
            ? DEFAULT_BUTTONS.filter(b => missingSets.includes(b.setId || ''))
            : [];

        requiredCoreButtons.forEach(reqId => {
            if (!rawButtons.some(b => b.id === reqId)) {
                const reqBtn = DEFAULT_BUTTONS.find(b => b.id === reqId);
                if (reqBtn && !buttonsToAdd.some(b => b.id === reqId)) buttonsToAdd.push(reqBtn);
            }
        });

        if (buttonsToAdd.length > 0) {
            setRawButtons(prev => {
                const existingIds = new Set(prev.map(b => b.id));
                const uniqueNew = buttonsToAdd.filter(b => !existingIds.has(b.id));
                return uniqueNew.length > 0 ? [...prev, ...uniqueNew] : prev;
            });
        }
    }, [rawButtons.length]);

    // localStorage sync
    useEffect(() => {
        const toSave = rawButtons.map(b => ({ ...b, isVisible: undefined })); // Don't save transient visibility
        localStorage.setItem('mud-buttons', JSON.stringify(toSave));
    }, [rawButtons]);

    useEffect(() => {
        localStorage.setItem('mud-ui-positions', JSON.stringify(uiPositions));
    }, [uiPositions]);

    const saveAsDefault = useCallback(() => {
        const toSaveButtons = rawButtons.map(b => ({ ...b, isVisible: undefined }));
        localStorage.setItem('mud-buttons-user-default', JSON.stringify(toSaveButtons));
        localStorage.setItem('mud-ui-positions-user-default', JSON.stringify(uiPositions));
        setHasUserDefaults(true);
    }, [rawButtons, uiPositions]);

    const saveAsCoreDefault = useCallback(() => {
        const toSaveButtons = rawButtons.map(b => ({ ...b, isVisible: undefined }));
        localStorage.setItem('mud-buttons-core-default', JSON.stringify(toSaveButtons));
        localStorage.setItem('mud-ui-positions-core-default', JSON.stringify(uiPositions));
    }, [rawButtons, uiPositions]);

    const resetToDefaults = useCallback((mode: 'user' | 'core' | 'factory', addMessage?: (t: string, m: string) => void) => {
        if (mode === 'user') {
            const savedBtns = localStorage.getItem('mud-buttons-user-default');
            const savedPos = localStorage.getItem('mud-ui-positions-user-default');
            try {
                if (savedBtns) setRawButtons(JSON.parse(savedBtns));
                if (savedPos) setUiPositions(JSON.parse(savedPos));
                addMessage?.('system', 'Reset to User Defaults.');
                return;
            } catch (e) { }
        }
        if (mode === 'core') {
            const coreButtons = localStorage.getItem('mud-buttons-core-default');
            const corePositions = localStorage.getItem('mud-ui-positions-core-default');
            if (coreButtons) {
                try {
                    setRawButtons(JSON.parse(coreButtons));
                    if (corePositions) setUiPositions(JSON.parse(corePositions));
                    addMessage?.('system', 'Reset to Core Defaults.');
                    return;
                } catch (e) { }
            }
        }
        setRawButtons(DEFAULT_BUTTONS);
        setUiPositions(DEFAULT_UI_POSITIONS);
        addMessage?.('system', 'Reset to Factory Defaults.');
    }, [setRawButtons, setUiPositions]);

    return { hasUserDefaults, saveAsDefault, saveAsCoreDefault, resetToDefaults };
};
