/**
 * @file RightPanelTargetBar.tsx
 * @description Target indicator and quick-editor bar with tap-to-edit and tap-to-clear.
 */

// --- Logic Section ---
import React, { FC, useState } from 'react';

export interface RightPanelTargetBarProps {
    target: string | null;
    setTarget: (target: string | null) => void;
    triggerHaptic?: (ms: number) => void;
}

// --- Render Section ---
export const RightPanelTargetBar: FC<RightPanelTargetBarProps> = ({ target, setTarget, triggerHaptic }) => {
    const [isEditingTarget, setIsEditingTarget] = useState(false);
    const [targetDraft, setTargetDraft] = useState('');

    const handleSave = () => {
        const trimmed = targetDraft.trim();
        setTarget(trimmed || null);
        triggerHaptic?.(15);
        setIsEditingTarget(false);
    };

    return (
        <div className="right-panel-target-bar">
            <span className="target-bar-label">Global Target:</span>
            {isEditingTarget ? (
                <form
                    className="target-bar-form"
                    onSubmit={event => {
                        event.preventDefault();
                        handleSave();
                    }}
                >
                    <input
                        autoFocus
                        aria-label="Type global target"
                        value={targetDraft}
                        placeholder="global target..."
                        onChange={event => setTargetDraft(event.target.value)}
                        onKeyDown={event => {
                            if (event.key === 'Escape') setIsEditingTarget(false);
                        }}
                        onBlur={handleSave}
                    />
                </form>
            ) : (
                <div className="target-bar-content">
                    <button
                        type="button"
                        className={`target-bar-value${!target ? ' is-empty' : ''}`}
                        title="Click to type the global target"
                        onClick={() => {
                            triggerHaptic?.(10);
                            setTargetDraft(target || '');
                            setIsEditingTarget(true);
                        }}
                    >
                        {target || 'None'}
                    </button>
                    {target && (
                        <button
                            type="button"
                            className="target-bar-clear-btn"
                            title="Clear global target"
                            aria-label="Clear global target"
                            onClick={(e) => {
                                e.stopPropagation();
                                triggerHaptic?.(15);
                                setTarget(null);
                            }}
                        >
                            ✕
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};

export default RightPanelTargetBar;
