/**
 * @file ShaperLeftPanel.tsx
 * @description Displays Shaper workspace navigation and collaboration placeholders.
 */

import type { ShaperWorkspaceDoc } from '../model/shaperTypes';

type ShaperTab = 'grid' | 'com' | 'mobiles' | 'objects' | 'libraries';

interface ShaperLeftPanelProps {
    doc: ShaperWorkspaceDoc;
    issueCount: number;
    activeTab: ShaperTab;
    onSelectTab: (tab: ShaperTab) => void;
}

// --- Component Section ---
export const ShaperLeftPanel: React.FC<ShaperLeftPanelProps> = ({ doc, issueCount, activeTab, onSelectTab }) => (
    <aside className="shaper-left-panel">
        <div className="shaper-panel-heading">
            <span>Workspace</span>
            <strong>{doc.name}</strong>
        </div>

        <div className="shaper-nav-section">
            <button
                type="button"
                className={activeTab === 'grid' ? 'active' : ''}
                onClick={() => onSelectTab('grid')}
            >
                Concept Grid
            </button>
            <button
                type="button"
                className={activeTab === 'com' ? 'active' : ''}
                onClick={() => onSelectTab('com')}
            >
                /com Trees
            </button>
            <button
                type="button"
                className={activeTab === 'mobiles' ? 'active' : ''}
                onClick={() => onSelectTab('mobiles')}
            >
                Mobiles
            </button>
            <button
                type="button"
                className={activeTab === 'objects' ? 'active' : ''}
                onClick={() => onSelectTab('objects')}
            >
                Objects
            </button>
            <button
                type="button"
                className={activeTab === 'libraries' ? 'active' : ''}
                onClick={() => onSelectTab('libraries')}
            >
                Libs
            </button>
            <button type="button" disabled>Shops</button>
        </div>

        <div className="shaper-presence-card">
            <span>Collaboration</span>
            <p>Local draft mode. Real-time presence will attach here in the collaboration milestone.</p>
        </div>

        <div className="shaper-presence-card">
            <span>Validation</span>
            <p>{issueCount} open issue{issueCount === 1 ? '' : 's'} across the concept zone.</p>
        </div>
    </aside>
);
