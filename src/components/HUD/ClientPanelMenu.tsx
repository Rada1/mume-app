/** @file ClientPanelMenu.tsx — Labeled shortcuts for the former header panels. */
import { HelpCircle, MessageSquare } from 'lucide-react';
import { useGame } from '../../context/GameContext';
import { useMobileHeaderTabs } from '../../hooks/useMobileHeaderTabs';

// --- Panel actions ---
export const ClientPanelMenu = ({ close }: { close: () => void }) => {
    const { viewport, triggerHaptic, executeCommand } = useGame();
    const tabs = useMobileHeaderTabs(viewport.isMobile, false, () => close());
    const entries = [
        { id: 'chat', label: 'Chat', icon: MessageSquare, active: tabs.showChatWindow },
        { id: 'help', label: 'Game help', icon: HelpCircle, active: tabs.isHelpOpen }
    ] as const;
    return <section className="client-menu-section" aria-label="Panels">
        <h3>Panels</h3>
        {entries.map(({ id, label, icon: Icon, active }) => <button key={id} type="button" aria-pressed={active}
            onClick={() => {
                if (id === 'help' && !tabs.isHelpOpen && !tabs.helpData) executeCommand('help', false, false, false, true);
                tabs.toggleHeaderTab(id); triggerHaptic?.(10); close();
            }}><Icon size={16} /><span>{label}</span>{active && <span aria-hidden="true">✓</span>}</button>)}
    </section>;
};
