/** @file ClientPanelMenu.tsx — Labeled shortcuts for the former header panels. */
import { BookOpen, FileText, HelpCircle, MessageSquare, Shield, TerminalSquare, UsersRound } from 'lucide-react';
import { useGame } from '../../context/GameContext';
import { useMobileHeaderTabs } from '../../hooks/useMobileHeaderTabs';
import { useClientPanelStackStore } from '../../stores/useClientPanelStackStore';

// --- Panel actions ---
export const ClientPanelMenu = ({ close }: { close: () => void }) => {
    const { viewport, triggerHaptic, executeCommand } = useGame();
    const tabs = useMobileHeaderTabs(viewport.isMobile, false, () => close());
    const details = useClientPanelStackStore(state => state.detailsEnabled);
    const toggleDetails = useClientPanelStackStore(state => state.toggleDetailsEnabled);
    const entries = [
        { id: 'commands', label: 'Commands', icon: TerminalSquare, active: tabs.isCommandPanelOpen },
        { id: 'skills', label: 'Skills & practice', icon: BookOpen, active: tabs.isSkillsPanelOpen },
        { id: 'gear', label: 'Equipment & inventory', icon: Shield, active: tabs.isGearPanelOpen },
        { id: 'chat', label: 'Chat', icon: MessageSquare, active: tabs.showChatWindow },
        { id: 'group', label: 'Entities & group', icon: UsersRound, active: tabs.showGroupPanel },
        { id: 'help', label: 'Game help', icon: HelpCircle, active: tabs.isHelpOpen }
    ] as const;
    return <section className="client-menu-section" aria-label="Panels">
        <h3>Panels</h3>
        {entries.map(({ id, label, icon: Icon, active }) => <button key={id} type="button" aria-pressed={active}
            onClick={() => {
                if (id === 'help' && !tabs.isHelpOpen && !tabs.helpData) executeCommand('help', false, false, false, true);
                tabs.toggleHeaderTab(id); triggerHaptic?.(10); close();
            }}><Icon size={16} /><span>{label}</span>{active && <span aria-hidden="true">✓</span>}</button>)}
        <button type="button" aria-pressed={details} onClick={() => { toggleDetails(); close(); }}>
            <FileText size={16} /><span>Details</span>{details && <span aria-hidden="true">✓</span>}
        </button>
    </section>;
};
