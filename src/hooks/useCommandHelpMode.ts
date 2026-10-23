/**
 * @file useCommandHelpMode.ts
 * @description Hook managing help inspection mode for command buttons.
 */

import React from 'react';
import { resolveHelpTopic } from '../utils/commandHelpUtils';
import { useCommandPanelStore } from '../stores/useCommandPanelStore';

// --- Logic Section ---

interface UseCommandHelpModeProps {
    dismissOutputs: () => void;
    requestHelp: (topic: string) => void;
}

export const useCommandHelpMode = ({ dismissOutputs, requestHelp }: UseCommandHelpModeProps) => {
    const isHelpMode = useCommandPanelStore(state => state.isHelpMode);
    const setIsHelpMode = useCommandPanelStore(state => state.setIsHelpMode);
    const toggleHelpMode = useCommandPanelStore(state => state.toggleHelpMode);

    React.useEffect(() => {
        if (typeof document === 'undefined') return;
        document.body.classList.toggle('is-command-help-mode', isHelpMode);
        return () => {
            document.body.classList.remove('is-command-help-mode');
        };
    }, [isHelpMode]);

    const executeHelp = React.useCallback((commandOrTopic: string, label?: string) => {
        const topic = resolveHelpTopic(commandOrTopic, label);
        if (!topic) return;
        setIsHelpMode(false);
        dismissOutputs();
        requestHelp(topic);
    }, [dismissOutputs, requestHelp, setIsHelpMode]);

    return {
        isHelpMode,
        setIsHelpMode,
        toggleHelpMode,
        executeHelp
    };
};
