/**
 * @file ShaperLeftPanel.tsx
 * @description Displays Shaper workspace navigation and live collaboration presence.
 */

import type { ShaperPeerInfo } from '../collaboration/shaperPresence';
import type { ShaperWorkspaceDoc } from '../model/shaperTypes';

type ShaperTab = 'grid' | 'com' | 'mobiles' | 'objects' | 'libraries';

interface ShaperLeftPanelProps {
    doc: ShaperWorkspaceDoc;
    issueCount: number;
    activeTab: ShaperTab;
    peers: ShaperPeerInfo[];
    onSelectTab: (tab: ShaperTab) => void;
}

// --- Component Section ---
export const ShaperLeftPanel: React.FC<ShaperLeftPanelProps> = ({ doc, issueCount, activeTab, peers, onSelectTab }) => (
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
            {peers.length === 0 ? (
                <p>No other builders online.</p>
            ) : (
                <ul className="shaper-peer-list">
                    {peers.map(peer => (
                        <li key={peer.peerId} className="shaper-peer-item">
                            <span className="shaper-peer-dot" />
                            <span className="shaper-peer-name">{peer.displayName}</span>
                            {peer.projectId === doc.id && (
                                <span className="shaper-peer-here">&middot; here</span>
                            )}
                        </li>
                    ))}
                </ul>
            )}
        </div>

        <div className="shaper-presence-card">
            <span>Validation</span>
            <p>{issueCount} open issue{issueCount === 1 ? '' : 's'} across the concept zone.</p>
        </div>
    </aside>
);
