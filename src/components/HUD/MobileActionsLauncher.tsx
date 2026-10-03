/** @file MobileActionsLauncher.tsx — Browse noncombat MUME actions on mobile. */

// --- Imports ---
import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, ScrollText, X } from 'lucide-react';
import type { DeckItem } from './useDeckTargeting';
import { DECK_ACTIONS, isDeckActionAvailable, type TabKey } from './commandDeckData';
import './MobileActionsLauncher.css';

// --- Categories ---
type ActionCategoryKey = Exclude<TabKey, 'combat' | 'mounts' | 'consume' | 'social'>;

const ACTION_CATEGORIES: { key: ActionCategoryKey; label: string; accent: string }[] = [
    { key: 'room', label: 'Room', accent: '#e0a84f' },
    { key: 'personal', label: 'Items', accent: '#d3b66b' },
    { key: 'utility', label: 'Info & status', accent: '#7faad3' },
];

const RECENT_ACTIONS_STORAGE_KEY = 'mume-mobile-recent-actions';

interface MobileActionsLauncherProps {
    race: string;
    subrace: string;
    onSelectAction: (item: DeckItem, event: React.MouseEvent<HTMLButtonElement>) => void;
}

// --- Launcher ---
export const MobileActionsLauncher: React.FC<MobileActionsLauncherProps> = ({ race, subrace, onSelectAction }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [recentKeys, setRecentKeys] = useState<string[]>(() => {
        try {
            const saved = localStorage.getItem(RECENT_ACTIONS_STORAGE_KEY);
            return saved ? (JSON.parse(saved) as string[]).slice(0, 4) : [];
        } catch {
            return [];
        }
    });
    const catalog = useMemo(() => ACTION_CATEGORIES.flatMap(category => DECK_ACTIONS[category.key]
        .filter(item => isDeckActionAvailable(item, race, subrace))
        .map(item => ({
            label: item.label,
            cmd: item.cmd,
            needsTarget: item.needsTarget ?? item.cmd.endsWith(' '),
            targetKind: item.targetKind,
            holdOpensMenuOnly: item.holdOpensMenuOnly,
            categoryKey: category.key,
            categoryLabel: category.label,
            accent: category.accent,
            key: `${category.key}:${item.label}:${item.cmd}`,
        } satisfies DeckItem & { categoryKey: ActionCategoryKey; categoryLabel: string; accent: string; key: string }))
    ), [race, subrace]);
    const recentActions = recentKeys.map(key => catalog.find(item => item.key === key)).filter((item): item is typeof catalog[number] => Boolean(item));

    const selectAction = (item: typeof catalog[number], event: React.MouseEvent<HTMLButtonElement>) => {
        const next = [item.key, ...recentKeys.filter(key => key !== item.key)].slice(0, 4);
        setRecentKeys(next);
        localStorage.setItem(RECENT_ACTIONS_STORAGE_KEY, JSON.stringify(next));
        onSelectAction(item, event);
        setIsOpen(false);
    };

    useEffect(() => {
        if (!isOpen) return;
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setIsOpen(false);
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [isOpen]);

    return <>
        <button
            type="button"
            className="mobile-actions-launcher-trigger"
            aria-haspopup="dialog"
            aria-expanded={isOpen}
            onClick={() => setIsOpen(true)}
        >
            <ScrollText size={16} strokeWidth={2.1} />
            <span>Actions</span>
            <ChevronDown size={13} />
        </button>
        {isOpen && createPortal(
            <div className="mobile-actions-launcher" role="presentation" onClick={() => setIsOpen(false)}>
                <section
                    className="mobile-actions-sheet"
                    role="dialog"
                    aria-modal="true"
                    aria-label="Browse actions"
                    onClick={event => event.stopPropagation()}
                >
                    <header className="mobile-actions-header">
                        <div>
                            <strong>Actions</strong>
                            <span>Choose what you want to do</span>
                        </div>
                        <button type="button" aria-label="Close actions" onClick={() => setIsOpen(false)}>
                            <X size={19} />
                        </button>
                    </header>
                    {recentActions.length > 0 && <section className="mobile-actions-recent" aria-label="Recent actions">
                        <h2>Recent</h2>
                        <div>
                            {recentActions.map(item => <ActionRow
                                key={`recent:${item.key}`}
                                item={item}
                                compact
                                onSelect={event => selectAction(item, event)}
                            />)}
                        </div>
                    </section>}
                    <div className="mobile-actions-list" aria-label="Available actions">
                        {ACTION_CATEGORIES.map(category => {
                            const actions = catalog.filter(item => item.categoryKey === category.key);
                            if (actions.length === 0) return null;
                            return <section className="mobile-actions-category" key={category.key} aria-label={category.label}>
                                <h2 style={{ '--action-accent': category.accent } as React.CSSProperties}>{category.label}</h2>
                                <div className="mobile-actions-category-row" role="group" aria-label={`${category.label} actions`}>
                                    {actions.map(item => <ActionRow
                                        key={item.key}
                                        item={item}
                                        onSelect={event => selectAction(item, event)}
                                    />)}
                                </div>
                            </section>;
                        })}
                    </div>
                </section>
            </div>,
            document.body
        )}
    </>;
};

// --- Action Row ---
interface ActionRowProps {
    item: DeckItem & { accent: string };
    onSelect: (event: React.MouseEvent<HTMLButtonElement>) => void;
    compact?: boolean;
}

const ActionRow: React.FC<ActionRowProps> = ({ item, onSelect, compact = false }) => {
    return <button
        type="button"
        className={`mobile-action-row${compact ? ' is-compact' : ''}`}
        style={{ '--action-accent': item.accent } as React.CSSProperties}
        onClick={onSelect}
        aria-label={item.needsTarget ? `${item.label}, choose target` : item.label}
    >
        <span>{item.label}</span>
    </button>;
};
