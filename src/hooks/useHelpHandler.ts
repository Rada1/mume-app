/**
 * @file useHelpHandler.ts
 * @description Manages capturing and displaying game help data in a dedicated card.
 */

import { useState, useRef, useCallback } from 'react';

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

    const parseHelpLine = useCallback((text: string) => {
        // Collect help lines into a buffer.
        // MUME help text is usually just raw text.
        helpBuffer.current.push(text);
    }, []);

    const finalizeHelp = useCallback((
        setPopoverState: (state: any) => void
    ) => {
        if (!isHelpActiveRef.current) return;

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
    }, [setIsHelpActive]);

    return {
        isHelpActive,
        setIsHelpActive,
        isUiRequested,
        setIsUiRequested,
        parseHelpLine,
        finalizeHelp,
        isHelpActiveRef,
        isUiRequestedRef
    };
}
