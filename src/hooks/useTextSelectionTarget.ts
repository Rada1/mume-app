import { useState, useRef, useCallback } from 'react';

export interface SelectionState {
    isActive: boolean;
    x: number;
    y: number;
    word: string;
    wordRect?: DOMRect;
}

export const useTextSelectionTarget = (setTarget: (val: string | null) => void, triggerHaptic: (ms: number) => void) => {
    const [selection, setSelection] = useState<SelectionState>({
        isActive: false,
        x: 0,
        y: 0,
        word: ''
    });

    const longPressTimer = useRef<NodeJS.Timeout | null>(null);
    const isDragging = useRef(false);
    const lastWord = useRef('');

    const getWordInfoAtPoint = (x: number, y: number): { word: string, rect?: DOMRect } => {
        let range: Range | null = null;
        let textNode: Node | null = null;
        let offset = 0;

        if ((document as any).caretPositionFromPoint) {
            const pos = (document as any).caretPositionFromPoint(x, y);
            if (pos) {
                textNode = pos.offsetNode;
                offset = pos.offset;
            }
        } else if (document.caretRangeFromPoint) {
            range = document.caretRangeFromPoint(x, y);
            if (range) {
                textNode = range.startContainer;
                offset = range.startOffset;
            }
        }

        if (!textNode || textNode.nodeType !== Node.TEXT_NODE) return { word: '' };

        const text = textNode.textContent || '';
        if (!text) return { word: '' };

        let start = offset;
        while (start > 0 && /\w/.test(text[start - 1])) {
            start--;
        }

        let end = offset;
        while (end < text.length && /\w/.test(text[end])) {
            end++;
        }

        const word = text.slice(start, end).trim();
        if (!/^\w+$/.test(word)) return { word: '' };

        // Create a range for the word to get its rect
        const wordRange = document.createRange();
        wordRange.setStart(textNode, start);
        wordRange.setEnd(textNode, end);
        const rect = wordRange.getBoundingClientRect();

        return { word, rect };
    };

    const startPoint = useRef<{ x: number, y: number } | null>(null);

    const handlePointerDown = useCallback((e: React.PointerEvent) => {
        const { clientX, clientY } = e;
        const target = e.currentTarget;
        const pointerId = e.pointerId;
        
        startPoint.current = { x: clientX, y: clientY };
        
        longPressTimer.current = setTimeout(() => {
            const { word, rect } = getWordInfoAtPoint(clientX, clientY);
            if (word) {
                target.setPointerCapture(pointerId);
                triggerHaptic(60);
                setTarget(word); // Update target immediately on long-press
                setSelection({
                    isActive: true,
                    x: clientX,
                    y: clientY,
                    word,
                    wordRect: rect
                });
                lastWord.current = word;
                isDragging.current = true;
            }
        }, 500); 
    }, [triggerHaptic, setTarget]);

    const handlePointerMove = useCallback((e: React.PointerEvent) => {
        if (!isDragging.current) {
            // If we are waiting for long-press but move too much, cancel it
            if (startPoint.current) {
                const dx = e.clientX - startPoint.current.x;
                const dy = e.clientY - startPoint.current.y;
                if (Math.hypot(dx, dy) > 10) {
                    if (longPressTimer.current) {
                        clearTimeout(longPressTimer.current);
                        longPressTimer.current = null;
                        startPoint.current = null;
                    }
                }
            }
            return;
        }

        // Prevent scrolling and other system behaviors only once selection is ACTIVE
        if (e.cancelable) e.preventDefault();

        const { clientX, clientY } = e;
        const { word, rect } = getWordInfoAtPoint(clientX, clientY);

        if (word && word !== lastWord.current) {
            triggerHaptic(15);
            setTarget(word); // Update target in real-time as we scrub
            lastWord.current = word;
            
            setSelection(prev => ({
                ...prev,
                x: clientX,
                y: clientY,
                word,
                wordRect: rect
            }));
        } else {
            // Update bubble position even if word hasn't changed
            setSelection(prev => ({
                ...prev,
                x: clientX,
                y: clientY
            }));
        }
    }, [triggerHaptic, setTarget]);

    const handlePointerUp = useCallback((e: React.PointerEvent) => {
        startPoint.current = null;
        if (longPressTimer.current) {
            clearTimeout(longPressTimer.current);
            longPressTimer.current = null;
        }

        if (isDragging.current) {
            e.currentTarget.releasePointerCapture(e.pointerId);
            if (lastWord.current) {
                setTarget(lastWord.current);
                triggerHaptic(40);
            }
            isDragging.current = false;
            setSelection(prev => ({ ...prev, isActive: false }));
            lastWord.current = '';
        }
    }, [setTarget, triggerHaptic]);

    return {
        selection,
        handlePointerDown,
        handlePointerMove,
        handlePointerUp
    };
};
