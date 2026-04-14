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

        // Instead of building a string, we build DOM nodes to avoid innerHTML thrashing
        // We parse the entire HTML once into a shadow div, then transfer nodes and characters over.

        containerRef.current.innerHTML = '';

        const sourceDiv = document.createElement('div');
        sourceDiv.innerHTML = html;

        // Flatten the DOM tree into a sequence of operations
        // An operation is either "enter node", "leave node", or "type character"
        type Operation =
            | { type: 'enter', node: Node, parent: Node }
            | { type: 'leave' }
            | { type: 'char', char: string, parent: Node };

        const operations: Operation[] = [];

        // We'll keep track of the target tree as we build it
        const buildTargetTree = (sourceNode: Node, targetParent: Node) => {
            for (let i = 0; i < sourceNode.childNodes.length; i++) {
                const child = sourceNode.childNodes[i];
                if (child.nodeType === Node.TEXT_NODE) {
                    const text = child.textContent || '';
                    for (let j = 0; j < text.length; j++) {
                        operations.push({ type: 'char', char: text[j], parent: targetParent });
                    }
                } else if (child.nodeType === Node.ELEMENT_NODE) {
                    // Clone the element without children
                    const clone = child.cloneNode(false) as Element;
                    operations.push({ type: 'enter', node: clone, parent: targetParent });
                    buildTargetTree(child, clone);
                    operations.push({ type: 'leave' });
                }
            }
        };

        buildTargetTree(sourceDiv, containerRef.current);

        let opIndex = 0;
        let lastTime = performance.now();
        // Maintain the current parent node we're appending to
        const parentStack: Node[] = [containerRef.current];
        let currentTextNode: Text | null = null;

        const animate = (time: number) => {
            if (!containerRef.current) return;

            const delta = time - lastTime;
            if (delta >= speed) {
                // Determine how many characters to process this frame
                const charsToProcess = Math.max(1, Math.floor(delta / speed));
                // Clamp max time accumulation to prevent huge jumps if tab was hidden
                lastTime = Math.max(time - (delta % speed), time - 50);

                let charsProcessed = 0;
                let domChanged = false;

                while (charsProcessed < charsToProcess && opIndex < operations.length) {
                    const op = operations[opIndex];

                    if (op.type === 'enter') {
                        // Enter a new element node
                        const currentParent = parentStack[parentStack.length - 1];
                        currentParent.appendChild(op.node);
                        parentStack.push(op.node);
                        currentTextNode = null; // Reset text node since we're in a new element
                        domChanged = true;
                    } else if (op.type === 'leave') {
                        // Leave the current element node
                        parentStack.pop();
                        currentTextNode = null;
                        domChanged = true;
                    } else if (op.type === 'char') {
                        // Type a character
                        const currentParent = parentStack[parentStack.length - 1];

                        // If we don't have an active text node for this parent, create one
                        if (!currentTextNode || currentTextNode.parentNode !== currentParent) {
                            currentTextNode = document.createTextNode('');
                            currentParent.appendChild(currentTextNode);
                        }

                        currentTextNode.textContent += op.char;
                        charsProcessed++;
                        domChanged = true;
                    }

                    opIndex++;
                }

                if (domChanged) {
                    if (onUpdateRef.current) onUpdateRef.current();
                }

                if (opIndex >= operations.length) {
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
