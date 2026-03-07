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

        // The target is now INSIDE the command bar.
        // We set these to simple relative indicators (0 for left, 100 for right)
        // as the SpatButtons.tsx component handles the actual pixel measurement.
        const startX = 0; 
        const targetX = 100; 

        let swipeCommands, swipeActionTypes;
        try {
            if (el.dataset.swipes) swipeCommands = JSON.parse(el.dataset.swipes);
            if (el.dataset.swipeActions) swipeActionTypes = JSON.parse(el.dataset.swipeActions);
        } catch (e) { }

        const newSpat: SpatButton = {
            id,
            btnId,
            label: el.dataset.label || el.innerText,
            icon: el.dataset.icon || undefined,
            command: el.dataset.cmd || '',
            action: el.dataset.action || 'command',
            startX: startX,
            startY: 0,
            targetX: targetX,
            targetY: 0,
            color: el.dataset.color || el.style.getPropertyValue('--glow-color') || 'var(--accent)',
            timestamp: Date.now(),
            swipeCommands,
            swipeActionTypes
        };

        setSpatButtons(prev => [...prev.slice(-9), newSpat]);
        triggerHaptic(10);
    }, [triggerHaptic]);

    const triggerSpitManual = useCallback((b: any) => {
        // If this button type is already visible on screen/in stack, ignore new trigger
        if (spatButtonsRef.current.some(sb => sb.btnId === b.id)) return;

        const id = Math.random().toString(36).substring(7);

        // The target is now INSIDE the command bar.
        // We set these to simple relative indicators (0 for left, 100 for right)
        const startX = 0; 
        const targetX = 100; 

        const newSpat: SpatButton = {
            id,
            btnId: b.id,
            label: b.label,
            icon: b.icon,
            command: b.command,
            action: b.actionType || 'command',
            startX: startX,
            startY: 0,
            targetX: targetX,
            targetY: 0,
            color: b.style.backgroundColor || 'var(--accent)',
            timestamp: Date.now(),
            swipeCommands: b.swipeCommands,
            swipeActionTypes: b.swipeActionTypes
        };

        setSpatButtons(prev => [...prev.slice(-9), newSpat]);
        triggerHaptic(10);
    }, [triggerHaptic]);

    useEffect(() => {
        if (messages.length === 0) {
            firedTriggerOccurrencesRef.current.clear();
            return;
        }

        if (!scrollContainerRef.current) return;

        const observer = new MutationObserver((mutations) => {
            const addedNodes = mutations.flatMap(m => Array.from(m.addedNodes));
            
            const spits: HTMLElement[] = [];
            addedNodes.forEach(node => {
                if (!(node instanceof HTMLElement)) return;
                if (node.classList.contains('inline-btn') && node.dataset.spit === "true") {
                    spits.push(node);
                }
                const nested = node.querySelectorAll('.inline-btn[data-spit="true"]');
                nested.forEach(n => spits.push(n as HTMLElement));
            });

            if (spits.length === 0) return;

            spits.forEach((el: any) => {
                const mid = el.dataset.mid || 'unknown';
                const bid = el.dataset.id || '';
                const context = el.dataset.context || '';
                const occKey = `${mid}:${bid}:${context}`;

                if (!firedTriggerOccurrencesRef.current.has(occKey)) {
                    firedTriggerOccurrencesRef.current.add(occKey);
                    
                    // Small delay to ensure the browser has finished layout so we can measure rects
                    requestAnimationFrame(() => {
                        triggerSpit(el);
                        el.dataset.spit = "triggered";
                    });
                }
            });

            // Pruning cache
            if (firedTriggerOccurrencesRef.current.size > 300) {
                const entries = Array.from(firedTriggerOccurrencesRef.current);
                firedTriggerOccurrencesRef.current = new Set(entries.slice(-150));
            }
        });

        observer.observe(scrollContainerRef.current, {
            childList: true,
            subtree: true
        });

        return () => observer.disconnect();
    }, [triggerSpit, scrollContainerRef, messages.length === 0]);

    return {
        spatButtons,
        setSpatButtons,
        triggerSpit,
        triggerSpitManual
    };
};
