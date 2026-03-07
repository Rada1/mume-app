import { useCallback } from 'react';
import { GameAction } from '../types';

export const useTriggerProcessor = (deps: {
    isSoundEnabledRef: React.RefObject<boolean>;
    soundTriggersRef: React.RefObject<any[]>;
    playSound: (buffer: AudioBuffer) => void;
    buttonsRef: React.RefObject<any[]>;
    setButtons: React.Dispatch<React.SetStateAction<any[]>>;
    buttonTimers: React.RefObject<Record<string, ReturnType<typeof setTimeout>>>;
    setActiveSet: (setId: string) => void;
    actionsRef: React.RefObject<GameAction[]>;
    executeCommandRef: React.RefObject<(cmd: string, silent?: boolean, isSystem?: boolean, isHistorical?: boolean, fromDrawer?: boolean) => void>;
}) => {
    const { isSoundEnabledRef, soundTriggersRef, playSound, buttonsRef, setButtons, buttonTimers, setActiveSet, actionsRef, executeCommandRef } = deps;

    const processTriggers = useCallback((textOnly: string) => {
        // Sound Triggers
        soundTriggersRef.current?.forEach(trig => {
            if (!trig.pattern || !trig.buffer) return;
            const match = trig.isRegex ? new RegExp(trig.pattern, 'i').test(textOnly) : textOnly.includes(trig.pattern);
            if (match && isSoundEnabledRef.current) playSound(trig.buffer);
        });

        // Button Triggers
        buttonsRef.current?.forEach(b => {
            if (!b.trigger?.enabled || !b.trigger.pattern) return;
            
            let match: RegExpExecArray | null = null;
            let matched = false;

            if (b.trigger.isRegex) {
                const regex = new RegExp(b.trigger.pattern, 'i');
                match = regex.exec(textOnly);
                matched = !!match;
            } else {
                matched = textOnly.includes(b.trigger.pattern);
            }

            if (matched) {
                // If it's a floating button and NOT a spit button, show it normally.
                // Spit buttons are handled by useSpatButtons via the MessageHighlighter's <span> tags.
                if (b.display === 'floating' && !b.trigger.spit) {
                    setButtons(prev => prev.map(x => {
                        if (x.id === b.id) {
                            let updatedLabel = x.trigger.templateLabel || x.label;
                            let updatedCommand = x.trigger.templateCommand || x.command;

                            // Store templates if they don't exist yet
                            const templateLabel = x.trigger.templateLabel || x.label;
                            const templateCommand = x.trigger.templateCommand || x.command;

                            // Apply regex captures if available
                            if (match) {
                                for (let i = 1; i < match.length; i++) {
                                    const val = match[i] || '';
                                    updatedLabel = updatedLabel.replace(new RegExp(`\\$${i}`, 'g'), val);
                                    updatedCommand = updatedCommand.replace(new RegExp(`\\$${i}`, 'g'), val);
                                }
                            }

                            return { 
                                ...x, 
                                isVisible: true, 
                                label: updatedLabel, 
                                command: updatedCommand,
                                trigger: {
                                    ...x.trigger,
                                    templateLabel,
                                    templateCommand
                                }
                            };
                        }
                        return x;
                    }));

                    if (b.trigger.duration > 0) {
                        if (buttonTimers.current?.[b.id]) clearTimeout(buttonTimers.current[b.id]);
                        if (buttonTimers.current) {
                            buttonTimers.current[b.id] = setTimeout(() => {
                                setButtons(prev => prev.map(x => x.id === b.id ? { ...x, isVisible: false } : x));
                            }, b.trigger.duration * 1000);
                        }
                    }
                }
                if (b.trigger.type === 'switch_set' && b.trigger.targetSet) setActiveSet(b.trigger.targetSet);
            }
        });

        // User-Defined Actions
        actionsRef.current?.forEach(action => {
            if (!action.enabled || !action.pattern) return;
            const match = action.isRegex ? new RegExp(action.pattern, 'i').test(textOnly) : textOnly.includes(action.pattern);
            if (match && executeCommandRef.current) {
                executeCommandRef.current(action.command, true, true);
            }
        });
    }, [isSoundEnabledRef, soundTriggersRef, playSound, buttonsRef, setButtons, buttonTimers, setActiveSet, actionsRef, executeCommandRef]);

    return { processTriggers };
};
