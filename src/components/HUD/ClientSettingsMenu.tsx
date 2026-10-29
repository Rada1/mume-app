/** @file ClientSettingsMenu.tsx — Settings, replay and session actions in the compact menu. */
import { Activity, Cog, DraftingCompass, Film, HelpCircle, Layers, LogOut, Map, Music, Palette, Settings } from 'lucide-react';
import { useGame, useUI } from '../../context/GameContext';
import { useModeStore } from '../../stores/useModeStore';
import { useClientSessionMenu } from '../../hooks/useClientSessionMenu';

// --- Settings and session actions ---
export const ClientSettingsMenu = ({ close }: { close: () => void }) => {
    const { btn } = useGame();
    const { setSettingsTab, setIsSettingsOpen } = useUI();
    const session = useClientSessionMenu(close);
    const mode = useModeStore();
    const settings = [
        { tab: 'general', label: 'General', icon: Cog },
        { tab: 'appearance', label: 'Appearance', icon: Palette },
        { tab: 'sound', label: 'Sound', icon: Music },
        { tab: 'actions', label: 'Actions / macros', icon: Activity },
        { tab: 'buttons', label: 'Buttons', icon: Settings },
        { tab: 'map', label: 'Map', icon: Map },
        { tab: 'replays', label: 'Replays', icon: Film },
        { tab: 'help', label: 'Client help', icon: HelpCircle }
    ] as const;
    return <>
        {mode.isSpectating && <section className="client-menu-section" aria-label="Spectating">
            <h3>Spectating {mode.spectateTarget}</h3>
            <button type="button" aria-pressed={mode.activeView === 'self'} onClick={() => { mode.setActiveView('self'); close(); }}>My view</button>
            <button type="button" aria-pressed={mode.activeView === 'target'} onClick={() => { mode.setActiveView('target'); close(); }}>Spectatee view</button>
        </section>}
        {session.hasReplay && <section className="client-menu-section" aria-label="Replay">
            <h3>Replay</h3>
            <button type="button" onClick={session.toggleReplay}>Show / minimize replay controls</button>
            <button type="button" onClick={session.exitReplay}>Exit replay</button>
        </section>}
        <section className="client-menu-section" aria-label="Settings">
            <h3>Settings</h3>
            {settings.map(({ tab, label, icon: Icon }) => <button key={tab} type="button"
                onClick={() => { setSettingsTab(tab); setIsSettingsOpen(true); close(); }}><Icon size={16} /><span>{label}</span></button>)}
            <button type="button" onClick={session.openShaper}>
                <DraftingCompass size={16} /><span>{session.canOpenShaper ? 'Shaper' : 'Unlock Shaper'}</span>
            </button>
        </section>
        {btn.isEditMode && <section className="client-menu-section" aria-label="Button sets"><h3><Layers size={14} /> Button set</h3>
            {btn.availableSets.map(set => <button key={set} type="button" aria-pressed={btn.activeSet === set}
                onClick={() => { btn.setActiveSet(set); close(); }}>{set}</button>)}
        </section>}
        {session.playing && <section className="client-menu-section">
            <button type="button" className="client-exit-action" onClick={session.exitGame}><LogOut size={16} /><span>Exit game</span></button>
        </section>}
    </>;
};
