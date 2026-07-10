/**
 * @file ShaperLeftPanel.tsx
 * @description Displays Shaper workspace navigation and validation summary.
 */

import type { ShaperWorkspaceDoc } from '../model/shaperTypes';

interface ShaperLeftPanelProps {
    doc: ShaperWorkspaceDoc;
    issueCount: number;
    openPanels: Record<string, boolean>;
    onTogglePanel: (panel: string) => void;
}

// --- Component Section ---
export const ShaperLeftPanel: React.FC<ShaperLeftPanelProps> = ({ doc, issueCount, openPanels, onTogglePanel }) => (
    <aside className="shaper-left-panel">
        <div className="shaper-panel-heading">
            <span>Workspace</span>
            <strong>{doc.name}</strong>
        </div>

        <div className="shaper-nav-section">
            <button
                type="button"
                className={openPanels.grid ? 'active' : ''}
                onClick={() => onTogglePanel('grid')}
            >
                Concept Grid
            </button>
            <button
                type="button"
                className={openPanels.com ? 'active' : ''}
                onClick={() => onTogglePanel('com')}
            >
                /com Trees
            </button>
            <button
                type="button"
                className={openPanels.mobiles ? 'active' : ''}
                onClick={() => onTogglePanel('mobiles')}
            >
                Mobiles
            </button>
            <button
                type="button"
                className={openPanels.objects ? 'active' : ''}
                onClick={() => onTogglePanel('objects')}
            >
                Objects
            </button>
            <button
                type="button"
                className={openPanels.libraries ? 'active' : ''}
                onClick={() => onTogglePanel('libraries')}
            >
                Libs
            </button>
            <button
                type="button"
                className={openPanels.info ? 'active' : ''}
                onClick={() => onTogglePanel('info')}
            >
                Keywords
            </button>
            <button
                type="button"
                className={openPanels.help ? 'active' : ''}
                onClick={() => onTogglePanel('help')}
            >
                Guides & Help
            </button>
            <button type="button" disabled>Shops</button>
        </div>

        <div className="shaper-validation-card">
            <span>Validation</span>
            <p>{issueCount} open issue{issueCount === 1 ? '' : 's'} across the concept zone.</p>
        </div>
    </aside>
);
