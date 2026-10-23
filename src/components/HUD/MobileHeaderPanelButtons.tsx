/** @file MobileHeaderPanelButtons.tsx — Mobile shortcuts to full-screen gear and skills panels. */
import { BookOpen, Shield } from 'lucide-react';
import { useGame } from '../../context/GameContext';
import type { useMobileHeaderTabs } from '../../hooks/useMobileHeaderTabs';

// --- Panel Shortcuts Section ---
export function MobileHeaderPanelButtons({ tabs }: { tabs: ReturnType<typeof useMobileHeaderTabs> }) {
    const { triggerHaptic } = useGame();
    return <>
        <button
            className={`menu-toggle-btn${tabs.isSkillsPanelOpen ? ' active' : ''}`}
            onClick={() => { tabs.toggleHeaderTab('skills'); triggerHaptic?.(10); }}
            title="Skills and Practice"
            aria-label="Skills and Practice panel"
            aria-pressed={tabs.isSkillsPanelOpen}
            style={{ width: '32px', height: '32px', padding: 0, justifyContent: 'center' }}
        >
            <BookOpen size={17} />
        </button>
        <button
            className={`menu-toggle-btn${tabs.isGearPanelOpen ? ' active' : ''}`}
            onClick={() => { tabs.toggleHeaderTab('gear'); triggerHaptic?.(10); }}
            title="Equipment and Inventory"
            aria-label="Gear panel"
            aria-pressed={tabs.isGearPanelOpen}
            style={{ width: '32px', height: '32px', padding: 0, justifyContent: 'center' }}
        >
            <Shield size={17} />
        </button>
    </>;
}
