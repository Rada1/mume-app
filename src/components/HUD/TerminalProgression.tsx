/**
 * @file TerminalProgression.tsx
 * @description Compact terminal XP and TP progress with transient gain feedback.
 */

import React, { FC } from 'react';
import { useCharacterSessionProgress } from '../../hooks/useCharacterSessionProgress';
import './TerminalProgression.css';

type TerminalProgressionProps = {
    characterName: string;
    xp: number | null | undefined;
    tp: number | null | undefined;
    tnl: number | null | undefined;
    tpnl: number | null | undefined;
};

// --- Render Section ---
export const TerminalProgression: FC<TerminalProgressionProps> = props => {
    const { sessionXp, sessionTp, floatingGains } = useCharacterSessionProgress(
        props.characterName, props.xp, props.tp, props.tnl, props.tpnl
    );
    const xpGain = floatingGains.filter(gain => gain.type === 'xp').at(-1);
    const tpGain = floatingGains.filter(gain => gain.type === 'tp').at(-1);
    return (
        <div className="terminal-progress" role="group" aria-label="Experience earned this session">
            <span className="terminal-progress-row">
                <span className="terminal-progress-kind">XP:</span>
                <strong className="terminal-progress-session">+{sessionXp.toLocaleString()}</strong>
                {xpGain && <span key={xpGain.id} className="terminal-progress-gain" role="status">+{xpGain.amount.toLocaleString()}</span>}
            </span>
            <span className="terminal-progress-row">
                <span className="terminal-progress-kind">TP:</span>
                <strong className="terminal-progress-session">+{sessionTp.toLocaleString()}</strong>
                {tpGain && <span key={tpGain.id} className="terminal-progress-gain" role="status">+{tpGain.amount.toLocaleString()}</span>}
            </span>
        </div>
    );
};
