/** @file useCommunicationSuggestionComposer.ts — Opens Parley from command input suggestions. */
import { useCallback, type Dispatch, type SetStateAction } from 'react';
import type { ParleyState } from '../types';
import { getCommandCommunicationIntent } from '../utils/commandCommunication';

// --- Logic Section ---
export const useCommunicationSuggestionComposer = (
    setParley: Dispatch<SetStateAction<ParleyState>>,
    setInput: (value: string) => void
) => useCallback((value: string) => {
    const intent = getCommandCommunicationIntent(value);
    if (!intent) return false;
    setParley({ active: true, mode: 'parley', command: intent.command, target: intent.target, message: intent.text });
    setInput(intent.text);
    return true;
}, [setParley, setInput]);
