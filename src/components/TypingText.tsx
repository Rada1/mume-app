import React, { useState, useEffect } from 'react';

interface TypingTextProps {
    text: string;
    speed?: number; // ms per character
    onComplete?: () => void;
}

export const TypingText: React.FC<TypingTextProps> = ({ text, speed = 4, onComplete }) => {
    const [displayedText, setDisplayedText] = useState('');
    const [index, setIndex] = useState(0);

    useEffect(() => {
        if (index < text.length) {
            const timeout = setTimeout(() => {
                const charsPerStep = 2; // Process 2 characters at once for extra speed
                const nextText = text.slice(index, index + charsPerStep);
                setDisplayedText(prev => prev + nextText);
                setIndex(prev => prev + nextText.length);
            }, speed);
            return () => clearTimeout(timeout);
        } else if (onComplete) {
            onComplete();
        }
    }, [index, text, speed, onComplete]);

    return <span>{displayedText}</span>;
};
