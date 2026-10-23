/**
 * @file CommandHelpBanner.tsx
 * @description In-panel help mode guide banner with manual topic search input.
 */

import React from 'react';
import { HelpCircle, X } from 'lucide-react';

// --- Logic Section ---

interface CommandHelpBannerProps {
    onExecuteHelp: (topic: string) => void;
    onCancel: () => void;
}

export const CommandHelpBanner: React.FC<CommandHelpBannerProps> = ({
    onExecuteHelp,
    onCancel
}) => {
    const [topicInput, setTopicInput] = React.useState('');
    const inputRef = React.useRef<HTMLInputElement>(null);

    React.useEffect(() => {
        // Auto-focus input when banner appears
        inputRef.current?.focus();
    }, []);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = topicInput.trim();
        if (!trimmed) return;
        onExecuteHelp(trimmed);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        e.stopPropagation();
        if (e.key === 'Escape') {
            e.preventDefault();
            onCancel();
        }
    };

    return (
        <div className="command-guide-help-banner" role="status">
            <div className="command-guide-help-banner-header">
                <HelpCircle size={13} aria-hidden="true" />
                <span>Click any command, log text, or search below:</span>
                <button
                    type="button"
                    className="command-guide-help-banner-close"
                    aria-label="Cancel command help mode"
                    title="Cancel help mode (Esc)"
                    onClick={onCancel}
                >
                    <X size={12} />
                </button>
            </div>
            <form className="command-guide-help-form" onSubmit={handleSubmit}>
                <input
                    ref={inputRef}
                    type="text"
                    className="command-guide-help-input"
                    placeholder="Help topic (e.g. bash, flee, cure light)..."
                    aria-label="Help topic search"
                    value={topicInput}
                    onChange={e => setTopicInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                />
                <button
                    type="submit"
                    className="command-guide-help-submit"
                    disabled={!topicInput.trim()}
                    title="Look up help topic"
                >
                    Help
                </button>
            </form>
        </div>
    );
};
