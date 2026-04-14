import React, { useState, useEffect } from 'react';

interface TypingTextProps {
    text: string;
    speed?: number; // ms per character
    onComplete?: () => void;
    skip?: boolean;
}

export const TypingText: React.FC<TypingTextProps> = ({ text, speed = 4, onComplete, skip }) => {
    const [displayedText, setDisplayedText] = useState(skip ? text : '');
    const [index, setIndex] = useState(skip ? text.length : 0);

    useEffect(() => {
        if (skip) {
            setDisplayedText(text);
            setIndex(text.length);
            // We don't necessarily need to call onComplete here as it's meant for the animation end
            return;
        }

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
    }, [index, text, speed, onComplete, skip]);

    return <span>{displayedText}</span>;
};
