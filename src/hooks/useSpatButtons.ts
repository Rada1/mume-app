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
    const buttonTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

    useEffect(() => {
        spatButtonsRef.current = spatButtons;
    }, [spatButtons]);

    // Cleanup timers on unmount
    useEffect(() => {
        const timers = buttonTimersRef.current;
        return () => {
            Object.values(timers).forEach(clearTimeout);
        };
    }, []);

    const triggerSpit = useCallback((el: HTMLElement) => {
        const btnId = el.dataset.id || '';
        if (spatButtonsRef.current.some(sb => sb.btnId === btnId)) return;

        const id = Math.random().toString(36).substring(7);
        el.classList.add('is-triggered');

        const startX = 0; 
        const targetX = 100; 

        let swipeCommands, swipeActionTypes;
        try {
            if (el.dataset.swipes) swipeCommands = JSON.parse(el.dataset.swipes);
            if (el.dataset.swipeActions) swipeActionTypes = JSON.parse(el.dataset.swipeActions);
        } catch (e) { }

        const durationAttr = el.dataset.duration;
        const duration = durationAttr ? parseInt(durationAttr, 10) : undefined;

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
            swipeActionTypes,
            menuDisplay: el.dataset.menuDisplay as 'list' | 'dial',
            closeKeyboard: el.dataset.closeKeyboard === 'true',
            offKeyboard: el.dataset.offKeyboard === 'true',
            duration
        };

        setSpatButtons(prev => {
            if (prev.some(sb => sb.btnId === newSpat.btnId)) return prev;
            return [...prev, newSpat].slice(-10);
        });

        if (duration && duration > 0) {
            if (buttonTimersRef.current[id]) clearTimeout(buttonTimersRef.current[id]);
            buttonTimersRef.current[id] = setTimeout(() => {
                setSpatButtons(prev => prev.filter(sb => sb.id !== id));
                delete buttonTimersRef.current[id];
            }, duration * 1000);
        }

        triggerHaptic(10);
    }, [triggerHaptic]);

    const triggerSpitManual = useCallback((b: any) => {
        if (spatButtonsRef.current.some(sb => sb.btnId === b.id)) return;

        const id = Math.random().toString(36).substring(7);
        const startX = 0; 
        const targetX = 100; 

        const duration = b.trigger?.duration;

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
            swipeActionTypes: b.swipeActionTypes,
            menuDisplay: b.menuDisplay,
            closeKeyboard: b.trigger?.closeKeyboard,
            offKeyboard: b.trigger?.offKeyboard,
            duration
        };

        setSpatButtons(prev => {
            if (prev.some(sb => sb.btnId === b.id)) return prev;
            return [...prev, newSpat].slice(-10);
        });

        if (duration && duration > 0) {
            if (buttonTimersRef.current[id]) clearTimeout(buttonTimersRef.current[id]);
            buttonTimersRef.current[id] = setTimeout(() => {
                setSpatButtons(prev => prev.filter(sb => sb.id !== id));
                delete buttonTimersRef.current[id];
            }, duration * 1000);
        }

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
                    requestAnimationFrame(() => {
                        triggerSpit(el);
                        el.dataset.spit = "triggered";
                    });
                }
            });

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
