/**
 * @file CapturedDetailsSidePanel.tsx
 * @description Portals captured inspection output into the desktop side panel.
 */
import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { CapturedDetailsCard } from './CapturedDetailsCard';
import { DrawerResizeHandle } from '../../Drawers/DrawerResizeHandle';
import { useGame } from '../../../context/GameContext';
import { useClientPanelStackStore } from '../../../stores/useClientPanelStackStore';

// --- Logic Section ---
interface CapturedDetailsSidePanelProps extends React.ComponentProps<typeof CapturedDetailsCard> {
    onClose: () => void;
}

// --- UI Section ---
export const CapturedDetailsSidePanel: React.FC<CapturedDetailsSidePanelProps> = ({ onClose, ...detailsProps }) => {
    const { viewport } = useGame();
    const setDetailsOpen = useClientPanelStackStore(state => state.setDetailsOpen);
    const detailsEnabled = useClientPanelStackStore(state => state.detailsEnabled);
    const setDetailsEnabled = useClientPanelStackStore(state => state.setDetailsEnabled);
    const [stackTarget, setStackTarget] = useState<HTMLElement | null>(null);
    const stacked = !viewport?.isMobile;
    useEffect(() => {
        if (!detailsEnabled || viewport?.isMobile || typeof document === 'undefined') {
            setStackTarget(null);
            setDetailsOpen(false);
            return;
        }
        const target = document.getElementById('client-panel-details-slot');
        setStackTarget(target);
        setDetailsOpen(true);
        return () => setDetailsOpen(false);
    }, [detailsEnabled, setDetailsOpen, viewport?.isMobile]);

    if (!detailsEnabled || typeof document === 'undefined' || (stacked && !stackTarget)) return null;
    const portalTarget = stacked && stackTarget ? stackTarget : document.body;
    return createPortal(
        <aside className={`popover-inspection-panel${stacked ? ' client-panel-stack-item' : ''}`} aria-label="Target details">
            {!stacked && <DrawerResizeHandle handleType="left" widthVar="--command-details-size" label="Resize Details panel width" minWidth={18} maxWidth={40} />}
            <header className="popover-inspection-panel-heading">
                <span>Details</span>
                <button type="button" aria-label="Close details panel" onClick={() => { setDetailsEnabled(false); onClose(); }}>×</button>
            </header>
            <CapturedDetailsCard {...detailsProps} />
        </aside>,
        portalTarget
    );
};
