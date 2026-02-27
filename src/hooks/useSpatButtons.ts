import { useState, useRef, useEffect, useCallback } from 'react';
import { Message, SpatButton } from '../types';

export const useSpatButtons = (
    messages: Message[],
    scrollContainerRef: React.RefObject<HTMLDivElement>,
    triggerHaptic: (ms: number) => void
) => {
    const [spatButtons, setSpatButtons] = useState<SpatButton[]>([]);
    const spatButtonsRef = useRef(spatButtons);
    const firedTriggerOccurrencesRef = useRef(new Set<string>());

    useEffect(() => {
        spatButtonsRef.current = spatButtons;
    }, [spatButtons]);

    const triggerSpit = useCallback((el: HTMLElement) => {
        const btnId = el.dataset.id || '';
        // If this button type is already visible on screen/in stack, ignore new trigger
        if (spatButtonsRef.current.some(sb => sb.btnId === btnId)) return;

        const rect = el.getBoundingClientRect();
        const id = Math.random().toString(36).substring(7);

        // Find the text log edge (content-layer right boundary)
        const contentLayer = document.querySelector('.content-layer');
        const contentRect = contentLayer?.getBoundingClientRect();

        // Find the command line position
        const inputArea = document.querySelector('.input-area');
        const inputRect = inputArea?.getBoundingClientRect();

        // Glow the trigger text
        el.classList.add('is-triggered');

        // Use the right edge of the content layer, minus some padding for the button
        const baseTargetX = contentRect ? (contentRect.right - 140) : (window.innerWidth - 180);
        // Vertical target: just above the input area
        const targetY = inputRect ? (inputRect.top - 40) : (window.innerHeight - 100);

        const newSpat: SpatButton = {
            id,
            btnId,
            label: el.innerText,
            command: el.dataset.cmd || '',
            action: el.dataset.action || 'command',
            startX: rect.left + rect.width / 2,
            startY: rect.top + rect.height / 2,
            targetX: baseTargetX,
            targetY: targetY,
            color: (el as any).style.backgroundColor || 'var(--accent)',
            timestamp: Date.now()
        };

        setSpatButtons(prev => [...prev.slice(-9), newSpat]);
        triggerHaptic(10);
    }, [triggerHaptic]);

    useEffect(() => {
        if (messages.length === 0) return;
        const timer = setTimeout(() => {
            if (!scrollContainerRef.current) return;
            const spits = Array.from(scrollContainerRef.current.querySelectorAll('.inline-btn[data-spit="true"]'));

            // Filter out any occurrences that have already been fired in this session
            const validSpits = spits.filter((el: any) => {
                const mid = el.dataset.mid || 'unknown';
                const bid = el.dataset.id || '';
                const context = el.dataset.context || '';
                const occKey = `${mid}:${bid}:${context}`;
                return !firedTriggerOccurrencesRef.current.has(occKey);
            });

            if (validSpits.length === 0) return;

            // Only trigger the MOST RECENT instance of any specific trigger text/id found in this batch
            const latestPerId: Record<string, HTMLElement> = {};
            validSpits.forEach((el: any) => {
                const bId = el.dataset.id || el.innerText;
                latestPerId[bId] = el;
                el.dataset.spit = "pending";
            });

            Object.values(latestPerId).forEach((el: any) => {
                const mid = el.dataset.mid || 'unknown';
                const bid = el.dataset.id || '';
                const context = el.dataset.context || '';
                firedTriggerOccurrencesRef.current.add(`${mid}:${bid}:${context}`);

                triggerSpit(el);
                el.dataset.spit = "triggered";
            });

            // Cleanup any that were marked pending but not latest
            validSpits.forEach((el: any) => {
                if (el.dataset.spit === "pending") el.dataset.spit = "skipped";
            });
        }, 50);
        return () => clearTimeout(timer);
    }, [messages, triggerSpit, scrollContainerRef]);

    return {
        spatButtons,
        setSpatButtons,
        triggerSpit
    };
};
