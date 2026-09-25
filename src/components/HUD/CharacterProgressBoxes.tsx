/**
 * @file CharacterProgressBoxes.tsx
 * @description Inset progress modules displaying Total XP and TP, TNL targets,
 * session gains, and floating gain animations (+115 XP).
 */

import React, { FC, memo } from 'react';
import { useCharacterSessionProgress } from '../../hooks/useCharacterSessionProgress';
import {
    formatCompactProgNumber,
    formatFullNumber
} from '../../utils/characterProgressUtils';

export interface CharacterProgressBoxesProps {
    characterName: string | null | undefined;
    xp: number | null | undefined;
    tp: number | null | undefined;
    tnl: number | null | undefined;
    tpnl: number | null | undefined;
}

export const CharacterProgressBoxes: FC<CharacterProgressBoxesProps> = ({
    characterName,
    xp,
    tp,
    tnl,
    tpnl
}) => {
    const {
        sessionXp,
        sessionTp,
        floatingGains,
        lastXpGainKey,
        lastTpGainKey,
        statusText,
        statusClass,
        isXpMet,
        isTpMet
    } = useCharacterSessionProgress(characterName, xp, tp, tnl, tpnl);

    const showBottleneck = statusText !== 'PROGRESSING';
    const xpFloatingGains = floatingGains.filter(item => item.type === 'xp');
    const tpFloatingGains = floatingGains.filter(item => item.type === 'tp');

    return (
        <div className="char-prog-boxes-container" aria-label="Character Level Progress">
            {showBottleneck && (
                <div className={`char-prog-status-pill ${statusClass}`}>
                    {statusText}
                </div>
            )}

            <div className="char-prog-boxes-grid">
                {/* XP Module */}
                <div className="char-prog-box char-prog-box-xp" title={`Total XP: ${formatFullNumber(xp)}\nNeeded for next level: ${formatFullNumber(tnl)}`}>
                    {/* Floating XP Gain Animations */}
                    <div className="char-prog-floating-anchor" aria-hidden="true">
                        {xpFloatingGains.map(item => (
                            <span key={item.id} className="floating-gain-item floating-gain-xp">
                                +{item.amount.toLocaleString()} XP
                            </span>
                        ))}
                    </div>

                    <div className="char-prog-box-header">
                        <span className="char-prog-box-title xp-title">Total XP</span>
                        <span
                            className="char-prog-sess-pill sess-pill-xp"
                            title={`+${(sessionXp || 0).toLocaleString()} XP gained this session`}
                        >
                            +{formatCompactProgNumber(sessionXp)}
                        </span>
                    </div>

                    <div
                        key={lastXpGainKey}
                        className={`char-prog-box-value${lastXpGainKey > 0 ? ' flash-xp' : ''}`}
                    >
                        {formatFullNumber(xp)}
                    </div>

                    <div className="char-prog-box-footer">
                        <span className="char-prog-box-footer-label">Next:</span>
                        <strong className={isXpMet ? 'char-prog-met-xp' : 'char-prog-tnl-xp'}>
                            {isXpMet ? 'Met \u2713' : formatFullNumber(tnl)}
                        </strong>
                    </div>
                </div>

                {/* TP Module */}
                <div className="char-prog-box char-prog-box-tp" title={`Total TP: ${formatFullNumber(tp)}\nNeeded for next level: ${formatFullNumber(tpnl)}`}>
                    {/* Floating TP Gain Animations */}
                    <div className="char-prog-floating-anchor" aria-hidden="true">
                        {tpFloatingGains.map(item => (
                            <span key={item.id} className="floating-gain-item floating-gain-tp">
                                +{item.amount.toLocaleString()} TP
                            </span>
                        ))}
                    </div>

                    <div className="char-prog-box-header">
                        <span className="char-prog-box-title tp-title">Total TP</span>
                        <span
                            className="char-prog-sess-pill sess-pill-tp"
                            title={`+${(sessionTp || 0).toLocaleString()} TP gained this session`}
                        >
                            +{formatCompactProgNumber(sessionTp)}
                        </span>
                    </div>

                    <div
                        key={lastTpGainKey}
                        className={`char-prog-box-value${lastTpGainKey > 0 ? ' flash-tp' : ''}`}
                    >
                        {formatFullNumber(tp)}
                    </div>

                    <div className="char-prog-box-footer">
                        <span className="char-prog-box-footer-label">Next:</span>
                        <strong className={isTpMet ? 'char-prog-met-tp' : 'char-prog-tnl-tp'}>
                            {isTpMet ? 'Met \u2713' : formatFullNumber(tpnl)}
                        </strong>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default memo(CharacterProgressBoxes);
