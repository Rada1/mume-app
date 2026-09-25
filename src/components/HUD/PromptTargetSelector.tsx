/**
 * @file PromptTargetSelector.tsx
 * @description Compact target control that lives alongside the prompt combat ratings.
 */

import React, { useEffect, useRef, useState } from 'react';
import { Crosshair } from 'lucide-react';
import { useGame, useVitals } from '../../context/GameContext';

export const PromptTargetSelector: React.FC = () => {
    const { target, setTarget } = useVitals() as any;
    const { clearObjectSelection, triggerHaptic } = useGame() as any;
    const [isEditing, setIsEditing] = useState(false);
    const [value, setValue] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isEditing) inputRef.current?.focus();
    }, [isEditing]);

    useEffect(() => {
        const openEditor = () => {
            setValue('');
            setIsEditing(true);
            triggerHaptic?.(10);
        };
        window.addEventListener('mume-trigger-target-input', openEditor);
        return () => window.removeEventListener('mume-trigger-target-input', openEditor);
    }, [triggerHaptic]);

    const finishEditing = () => {
        if (value.trim()) {
            setTarget(value.trim());
            triggerHaptic?.(15);
        }
        setIsEditing(false);
    };

    const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        event.stopPropagation();
        if (target) {
            setTarget(null);
            clearObjectSelection?.();
            triggerHaptic?.(5);
            return;
        }
        if (!isEditing) {
            setValue('');
            setIsEditing(true);
            triggerHaptic?.(10);
        }
    };

    return (
        <button
            type="button"
            className={`prompt-target-selector${target ? ' has-target' : ''}${isEditing ? ' is-editing' : ''}`}
            onClick={handleClick}
            title={target ? 'Current target — click to clear' : 'Set a target'}
        >
            <Crosshair size={12} strokeWidth={2.25} aria-hidden="true" />
            {isEditing ? (
                <input
                    ref={inputRef}
                    value={value}
                    onChange={(event) => setValue(event.target.value)}
                    onClick={(event) => event.stopPropagation()}
                    onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                            event.preventDefault();
                            finishEditing();
                        } else if (event.key === 'Escape') {
                            event.preventDefault();
                            setIsEditing(false);
                        }
                    }}
                    onBlur={() => window.setTimeout(() => setIsEditing(false), 100)}
                    placeholder="Target"
                    aria-label="Target name"
                />
            ) : (
                <span>{target || 'Target'}</span>
            )}
        </button>
    );
};

export default PromptTargetSelector;
