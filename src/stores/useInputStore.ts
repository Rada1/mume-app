import { create } from 'zustand';

interface InputStore {
    input: string;
    setInput: (val: string) => void;
    history: string[];
    historyIndex: number;
    tempInput: string;
    addToHistory: (cmd: string) => void;
    navigateHistory: (dir: 'up' | 'down') => void;
    clearHistory: () => void;
}

export const useInputStore = create<InputStore>((set) => ({
    input: '',
    history: [],
    historyIndex: -1,
    tempInput: '',
    setInput: (input) => set((state) => {
        if (state.historyIndex !== -1) {
            return { input, historyIndex: -1, tempInput: input };
        }
        return { input, tempInput: input };
    }),
    addToHistory: (cmd) => set((state) => {
        const trimmed = cmd.trim();
        if (!trimmed) return {};
        
        const newHistory = [...state.history];
        // Don't add duplicates of the most recent command to keep history clean
        if (newHistory.length === 0 || newHistory[newHistory.length - 1] !== trimmed) {
            newHistory.push(trimmed);
        }
        if (newHistory.length > 100) {
            newHistory.shift();
        }
        return {
            history: newHistory,
            historyIndex: -1,
            tempInput: ''
        };
    }),
    navigateHistory: (dir) => set((state) => {
        const { history, historyIndex, tempInput } = state;
        if (history.length === 0) return {};

        let nextIndex = historyIndex;
        if (dir === 'up') {
            if (historyIndex === -1) {
                nextIndex = history.length - 1;
            } else if (historyIndex > 0) {
                nextIndex = historyIndex - 1;
            }
        } else if (dir === 'down') {
            if (historyIndex !== -1) {
                if (historyIndex === history.length - 1) {
                    nextIndex = -1;
                } else {
                    nextIndex = historyIndex + 1;
                }
            }
        }

        if (nextIndex === historyIndex) return {};

        const nextInput = nextIndex === -1 ? tempInput : history[nextIndex];
        return {
            historyIndex: nextIndex,
            input: nextInput
        };
    }),
    clearHistory: () => set({ history: [], historyIndex: -1, tempInput: '' })
}));
