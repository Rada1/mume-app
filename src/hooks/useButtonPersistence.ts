import { useState, useEffect, useCallback } from 'react';
import { CustomButton } from '../types';
import { DEFAULT_BUTTONS, DEFAULT_UI_POSITIONS } from '../constants/buttons';
import MASTER_SETTINGS from '../constants/mastersettings.json';

export const useButtonPersistence = (
    rawButtons: CustomButton[],
    setRawButtons: React.Dispatch<React.SetStateAction<CustomButton[]>>,
    uiPositions: any,
    setUiPositions: (pos: any) => void
) => {
    // Removed auto-injection of core sets.
    // If a user deletes a set, it stays deleted until they hit Reset to Default.

    // localStorage sync
    useEffect(() => {
        try {
            const toSave = rawButtons.map(b => ({ ...b, isVisible: undefined })); // Don't save transient visibility
            localStorage.setItem('mud-buttons', JSON.stringify(toSave));
        } catch (e) {
            console.error('Failed to save buttons to localStorage:', e);
        }
    }, [rawButtons]);

    useEffect(() => {
        try {
            localStorage.setItem('mud-ui-positions', JSON.stringify(uiPositions));
        } catch (e) {
            console.error('Failed to save UI positions to localStorage:', e);
        }
    }, [uiPositions]);

    const resetToDefaults = useCallback((addMessage?: (t: string, m: string) => void) => {
        const defaultButtons = (MASTER_SETTINGS as any).buttons || DEFAULT_BUTTONS;
        const defaultUiPositions = (MASTER_SETTINGS as any).uiPositions || DEFAULT_UI_POSITIONS;

        setRawButtons(defaultButtons);
        setUiPositions(defaultUiPositions);

        // Immediately persist the reset state to prevent restorative effects on refresh
        localStorage.setItem('mud-buttons', JSON.stringify(defaultButtons));
        localStorage.setItem('mud-ui-positions', JSON.stringify(defaultUiPositions));

        addMessage?.('system', 'Reset to Default setup.');
    }, [setRawButtons, setUiPositions]);

    return { resetToDefaults };
};
