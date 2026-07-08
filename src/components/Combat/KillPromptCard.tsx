/**
 * @file KillPromptCard.tsx
 * @description Transient card shown after the player lands a kill, offering a
 * quick LOOT action for the fresh corpse.
 */

import React from 'react';
import { Skull } from 'lucide-react';
import { useKillPromptStore } from '../../stores/useKillPromptStore';
import { useGame } from '../../context/GameContext';

const AUTO_DISMISS_MS = 12000;
const CLOSE_ANIM_MS = 260;

const KillPromptCard: React.FC = () => {
    const prompt = useKillPromptStore(s => s.prompt);
    const clearKill = useKillPromptStore(s => s.clearKill);
    const { executeCommand, triggerHaptic } = useGame() as any;
    const [closing, setClosing] = React.useState(false);

    // Restart the auto-dismiss countdown whenever a new kill arrives.
    React.useEffect(() => {
        if (!prompt) return;
        setClosing(false);
        const t = setTimeout(() => setClosing(true), AUTO_DISMISS_MS);
        return () => clearTimeout(t);
    }, [prompt?.id]);

    // Remove from the store once the close animation finishes.
    React.useEffect(() => {
        if (!closing) return;
        const t = setTimeout(() => clearKill(), CLOSE_ANIM_MS);
        return () => clearTimeout(t);
    }, [closing, clearKill]);

    if (!prompt) return null;

    const dismiss = () => {
        triggerHaptic?.(10);
        setClosing(true);
    };

    const loot = () => {
        executeCommand?.('get all corpse');
        triggerHaptic?.(20);
        setClosing(true);
    };

    return (
        <div
            className={`kill-prompt-card${closing ? ' closing' : ''}`}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
        >
            <div className="kill-prompt-header">
                <Skull size={13} strokeWidth={2.5} />
                <span className="kill-prompt-title">{prompt.name} is dead! R.I.P.</span>
                <button className="kill-prompt-close" onClick={dismiss} aria-label="Dismiss">×</button>
            </div>
            <button className="kill-prompt-loot" onClick={loot}>LOOT</button>
        </div>
    );
};

export default KillPromptCard;
