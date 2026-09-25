/**
 * @file RightPanelTabs.tsx
 * @description Terminal heading and category tabs for the desktop command panel.
 */

import React, { FC } from 'react';
import { X } from 'lucide-react';
import { useCommandPanelStore } from '../../stores/useCommandPanelStore';
import type { MainTab } from './rightActionData';

interface RightPanelTabsProps {
    activeTab: MainTab;
    count: number;
    onSelect: (tab: MainTab) => void;
}

const TABS: { id: MainTab; label: string }[] = [
    { id: 'combat', label: 'Combat' },
    { id: 'skills', label: 'Skills' },
    { id: 'utility', label: 'Util' },
];

export const RightPanelTabs: FC<RightPanelTabsProps> = ({ activeTab, count, onSelect }) => {
    const closePanel = useCommandPanelStore(state => state.setIsOpen);
    return (
    <>
        <div className="right-panel-terminal-heading">
            <span className="right-panel-terminal-prompt">&gt;</span>
            <strong>commands</strong>
            <span className="right-panel-terminal-count">{count} available</span>
            <button type="button" className="right-panel-close" aria-label="Close commands panel" title="Close commands panel" onClick={() => closePanel(false)}>
                <X size={16} />
            </button>
        </div>
        <div className="right-panel-tabs" role="tablist" aria-label="Command categories">
            {TABS.map(tab => (
                <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={activeTab === tab.id}
                    className={`right-panel-tab${activeTab === tab.id ? ' is-active' : ''}`}
                    onClick={() => onSelect(tab.id)}
                >
                    <span>{activeTab === tab.id ? `[ ${tab.label} ]` : tab.label}</span>
                </button>
            ))}
        </div>
    </>
    );
};
