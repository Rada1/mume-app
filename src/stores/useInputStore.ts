import { create } from 'zustand';

interface InputStore {
    input: string;
    setInput: (val: string) => void;
}

export const useInputStore = create<InputStore>((set) => ({
    input: '',
    setInput: (input) => set({ input }),
}));
