/**
 * @file useHelpHandler.ts
 * @description Manages capturing and displaying game help data in a dedicated card.
 */

import { useState, useRef, useCallback } from 'react';
import { PopoverState } from '../types';

const HELP_PROMPT_SETTLE_MS = 200;

export function useHelpHandler() {
    const [isHelpActive, _setIsHelpActive] = useState(false);
    const isHelpActiveRef = useRef(false);
    
    const setIsHelpActive = useCallback((val: boolean) => {
        isHelpActiveRef.current = val;
        _setIsHelpActive(val);
    }, []);

    const [isUiRequested, _setIsUiRequested] = useState(false);
    const isUiRequestedRef = useRef(false);

    const setIsUiRequested = useCallback((val: boolean) => {
        isUiRequestedRef.current = val;
        _setIsUiRequested(val);
    }, []);
    const helpBuffer = useRef<string[]>([]);
    const finalizeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const clearFinalizeTimer = useCallback(() => {
        if (!finalizeTimer.current) return;
        clearTimeout(finalizeTimer.current);
        finalizeTimer.current = null;
    }, []);

    const parseHelpLine = useCallback((text: string) => {
        clearFinalizeTimer();
        // Collect help lines into a buffer.
        // MUME help text is usually just raw text.
        helpBuffer.current.push(text);
    }, [clearFinalizeTimer]);

    const finalizeHelp = useCallback((
        setPopoverState: (state: PopoverState) => void
    ) => {
        if (!isHelpActiveRef.current) return;
        clearFinalizeTimer();

        const helpData = helpBuffer.current.join('\n');
        
        console.log('[HelpHandler] Finalizing Help Capture:', { length: helpData.length });

        if (helpData.trim().length > 0) {
            setPopoverState({
                type: 'help-card',
                x: window.innerWidth / 2 - 150, // Default position, will be centered by manager
                y: window.innerHeight / 2 - 200,
                setId: 'help',
                helpData
            });
        }

        setIsHelpActive(false);
        setIsUiRequested(false);
        helpBuffer.current = [];
    }, [clearFinalizeTimer, setIsHelpActive, setIsUiRequested]);

    const scheduleFinalizeHelp = useCallback((
        setPopoverState: (state: PopoverState) => void
    ) => {
        if (!isHelpActiveRef.current) return;
        clearFinalizeTimer();
        finalizeTimer.current = setTimeout(() => {
            finalizeTimer.current = null;
            finalizeHelp(setPopoverState);
        }, HELP_PROMPT_SETTLE_MS);
    }, [clearFinalizeTimer, finalizeHelp]);

    return {
        isHelpActive,
        setIsHelpActive,
        isUiRequested,
        setIsUiRequested,
        parseHelpLine,
        finalizeHelp,
        scheduleFinalizeHelp,
        isHelpActiveRef,
        isUiRequestedRef
    };
}
