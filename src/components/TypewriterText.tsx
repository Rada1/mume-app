import React, { useEffect, useRef } from 'react';

interface TypewriterTextProps {
    html: string;
    speed?: number;
    onUpdate?: () => void;
    onComplete?: () => void;
}

const TypewriterText: React.FC<TypewriterTextProps> = ({ html, speed = 4, onUpdate, onComplete }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const animationFrameRef = useRef<number | null>(null);

    // Use refs for callbacks to avoid re-triggering the effect
    const onUpdateRef = useRef(onUpdate);
    const onCompleteRef = useRef(onComplete);

    useEffect(() => {
        onUpdateRef.current = onUpdate;
        onCompleteRef.current = onComplete;
    }, [onUpdate, onComplete]);

    useEffect(() => {
        if (!containerRef.current) return;

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
        let lastTime = performance.now();

        const animate = (time: number) => {
            if (!containerRef.current) return;

            const delta = time - lastTime;
            if (delta >= speed) {
                // Calculate how many characters we should process this frame based on elapsed time
                const charsToProcess = Math.floor(delta / speed);
                lastTime = time - (delta % speed); // Keep the remainder for smooth timing

                let charsProcessed = 0;
                let htmlChanged = false;

                while (charsProcessed < charsToProcess && currentPartIndex < parts.length) {
                    const part = parts[currentPartIndex];
                    if (part.type === 'tag') {
                        cumulativeHtml += part.content;
                        currentPartIndex++;
                        htmlChanged = true;
                    } else {
                        cumulativeHtml += part.content[currentCharIndex];
                        currentCharIndex++;
                        charsProcessed++;
                        htmlChanged = true;

                        if (currentCharIndex >= part.content.length) {
                            currentPartIndex++;
                            currentCharIndex = 0;
                        }
                    }
                }

                if (htmlChanged) {
                    containerRef.current.innerHTML = cumulativeHtml;
                    if (onUpdateRef.current) onUpdateRef.current();
                }

                if (currentPartIndex >= parts.length) {
                    if (onCompleteRef.current) onCompleteRef.current();
                    return; // Animation complete
                }
            }

            animationFrameRef.current = requestAnimationFrame(animate);
        };

        animationFrameRef.current = requestAnimationFrame(animate);

        return () => {
            if (animationFrameRef.current !== null) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, [html, speed]); // Removed onComplete and onUpdate to prevent animation restart

    return (
        <div
            ref={containerRef}
            className="message-content comm-text"
        />
    );
};

export default TypewriterText;
