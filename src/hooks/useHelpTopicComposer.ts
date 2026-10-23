/** @file useHelpTopicComposer.ts — Topic input and shared help command execution. */
import { useCallback, useState, type FormEvent } from 'react';
import { useGame } from '../context/GameContext';

// --- Help Command Section ---
export function useHelpTopicComposer() {
    const { executeCommand, triggerHaptic } = useGame();
    const [input, setInput] = useState('');
    const openTopic = useCallback((topic: string) => {
        const cleanTopic = topic.trim();
        if (!cleanTopic) return;
        triggerHaptic?.(10);
        executeCommand?.(cleanTopic.toLowerCase() === 'help' ? 'help' : `help ${cleanTopic}`, false, false, false, true);
    }, [executeCommand, triggerHaptic]);
    const submit = (event: FormEvent) => {
        event.preventDefault();
        if (!input.trim()) return;
        openTopic(input);
        setInput('');
    };
    return { input, setInput, openTopic, submit };
}
