import React, { createContext, useContext, useState, ReactNode } from 'react';

interface InputContextType {
    input: string;
    setInput: (val: string) => void;
}

const InputContext = createContext<InputContextType | undefined>(undefined);

export const InputProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [input, setInput] = useState("");
    return (
        <InputContext.Provider value={{ input, setInput }}>
            {children}
        </InputContext.Provider>
    );
};

export const useInput = () => {
    const context = useContext(InputContext);
    if (!context) throw new Error('useInput must be used within an InputProvider');
    return context;
};
