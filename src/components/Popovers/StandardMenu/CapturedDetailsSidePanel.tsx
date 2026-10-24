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
    className?: string;
    ariaLabel?: string;
}

// --- UI Section ---
export const CapturedDetailsSidePanel: React.FC<CapturedDetailsSidePanelProps> = ({ onClose, className, ariaLabel, ...detailsProps }) => {
    const { viewport } = useGame();
    const setDetailsOpen = useClientPanelStackStore(state => state.setDetailsOpen);
    const detailsEnabled = useClientPanelStackStore(state => state.detailsEnabled);
    const setDetailsEnabled = useClientPanelStackStore(state => state.setDetailsEnabled);
    const [stackTarget, setStackTarget] = useState<HTMLElement | null>(null);
    const stacked = !viewport?.isMobile;

    useEffect(() => {
        if (typeof document === 'undefined') return;
        document.body.classList.add('has-unified-command-details');
        return () => {
            document.body.classList.remove('has-unified-command-details');
        };
    }, []);

    useEffect(() => {
        if (!detailsEnabled) setDetailsEnabled(true);
    }, [stacked]);

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
    const panelClasses = [
        'popover-inspection-panel',
        detailsProps.shopTitle ? 'command-shop-output-panel' : '',
        detailsProps.practiceSkillName ? 'command-practice-output-panel' : '',
        className || '',
        stacked ? 'client-panel-stack-item' : ''
    ].filter(Boolean).join(' ');
    const label = ariaLabel || (detailsProps.shopTitle ? 'Shop output' : detailsProps.practiceSkillName ? 'Practice response' : 'Target details');

    return createPortal(
        <aside className={panelClasses} aria-label={label}>
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

