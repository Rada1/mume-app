import React, { useState, useEffect, useRef } from 'react';

interface TypewriterTextProps {
    html: string;
    speed?: number;
    onUpdate?: () => void;
    onComplete?: () => void;
}

const TypewriterText: React.FC<TypewriterTextProps> = ({ html, speed = 4, onUpdate, onComplete }) => {
    const [displayedHtml, setDisplayedHtml] = useState('');
    const fullHtmlRef = useRef(html);

    useEffect(() => {
        if (onUpdate) onUpdate();
    }, [displayedHtml, onUpdate]);

    useEffect(() => {
        // Simple HTML parser to separate tags from text
        const parts: { type: 'tag' | 'text', content: string }[] = [];
        let current = '';
        let i = 0;

        while (i < html.length) {
            if (html[i] === '<') {
                if (current) parts.push({ type: 'text', content: current });
                let tag = '';
                while (i < html.length && html[i] !== '>') {
                    tag += html[i];
                    i++;
                }
                tag += '>';
                parts.push({ type: 'tag', content: tag });
                current = '';
            } else {
                current += html[i];
            }
            i++;
        }
        if (current) parts.push({ type: 'text', content: current });

        let currentPartIndex = 0;
        let currentCharIndex = 0;
        let cumulativeHtml = '';

        const timer = setInterval(() => {
            if (currentPartIndex >= parts.length) {
                clearInterval(timer);
                if (onComplete) onComplete();
                return;
            }

            const part = parts[currentPartIndex];
            if (part.type === 'tag') {
                cumulativeHtml += part.content;
                currentPartIndex++;
                setDisplayedHtml(cumulativeHtml);
            } else {
                cumulativeHtml += part.content[currentCharIndex];
                currentCharIndex++;
                if (currentCharIndex >= part.content.length) {
                    currentPartIndex++;
                    currentCharIndex = 0;
                }
                setDisplayedHtml(cumulativeHtml);
            }
        }, speed);

        return () => clearInterval(timer);
    }, [html, speed, onComplete]);

    return (
        <div
            className="message-content comm-text"
            dangerouslySetInnerHTML={{ __html: displayedHtml }}
        />
    );
};

export default TypewriterText;
