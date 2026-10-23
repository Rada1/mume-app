/**
 * @file ThisIsYouVitalsTier.tsx
 * @description Tier 2 telemetry for This is You console: numerical vitals & combat ratings.
 */

// --- Logic Section ---
import React, { FC } from 'react';
import { StatDelta } from './StatDelta';
import { formatRegen } from '../../utils/regenUtils';
import { getVitalPercent, isVitalLow, type VitalKind } from '../../utils/vitalStatus';
import type { VitalsScoreSnapshot } from '../../types';

export interface VitalsTierDeltas {
    hp?: { amount: number; id: number } | null;
    mana?: { amount: number; id: number } | null;
    move?: { amount: number; id: number } | null;
    ob?: { amount: number; id: number } | null;
    pb?: { amount: number; id: number } | null;
    db?: { amount: number; id: number } | null;
    armour?: { amount: number; id: number } | null;
}

export interface ThisIsYouVitalsTierProps {
    hpStatus?: string | null;
    manaStatus?: string | null;
    moveStatus?: string | null;
    ob: number | null | undefined;
    pb: number | null | undefined;
    db: number | null | undefined;
    armour: number | null | undefined;
    regen: { hp: number; mana: number; move: number };
    deltas: VitalsTierDeltas;
    vitalPercentages: Record<VitalKind, number | null>;
    scoreSnapshot: VitalsScoreSnapshot | null;
    isVitalsRefreshHeld: boolean;
    isVitalsRefreshDisabled: boolean;
    isRequestingVitalsScore: boolean;
    onVitalsRefreshStart: () => void;
    onVitalsRefreshEnd: () => void;
}

type VitalStatusTone = 'good' | 'warning' | 'critical' | 'neutral';

const getVitalStatusTone = (status: string | null | undefined): VitalStatusTone => {
    const normalized = status?.trim().toLowerCase();
    if (!normalized) return 'neutral';
    if (['healthy', 'fine', 'full', 'burning', 'hot', 'warm', 'unwearied', 'steadfast', 'rested'].includes(normalized)) {
        return 'good';
    }
    if (['hurt', 'wounded', 'cold', 'icy', 'tired', 'slow'].includes(normalized)) return 'warning';
    if (['bad', 'awful', 'dying', 'stunned', 'frozen', 'weak', 'fainting', 'exhausted'].includes(normalized)) {
        return 'critical';
    }
    return 'neutral';
};

// --- Render Section ---
export const ThisIsYouVitalsTier: FC<ThisIsYouVitalsTierProps> = ({
    hpStatus,
    manaStatus,
    moveStatus,
    ob,
    pb,
    db,
    armour,
    regen,
    deltas,
    vitalPercentages,
    scoreSnapshot,
    isVitalsRefreshHeld,
    isVitalsRefreshDisabled,
    isRequestingVitalsScore,
    onVitalsRefreshStart,
    onVitalsRefreshEnd
}) => {
    const formatScoreValue = (value: number, maximum: number): string =>
        maximum > 0 ? `${value} / ${maximum}` : String(value);
    const getVitalValueClass = (kind: VitalKind, status?: string | null): string => {
        const snapshotPercent = scoreSnapshot
            ? getVitalPercent(kind, scoreSnapshot[kind === 'health' ? 'hp' : kind === 'mana' ? 'mana' : 'move'], scoreSnapshot[kind === 'health' ? 'maxHp' : kind === 'mana' ? 'maxMana' : 'maxMove'], status)
            : null;
        const percent = scoreSnapshot ? snapshotPercent : vitalPercentages[kind];
        const lowClass = isVitalLow(percent) ? ' is-low-vital' : '';
        return scoreSnapshot
            ? `this-is-you-vital-numbers${lowClass}`
            : `this-is-you-vital-status is-${getVitalStatusTone(status)}${lowClass}`;
    };

    return (
            <div className="this-is-you-tier-vitals" role="group" aria-label="Vitals and combat ratings">
            <div className="this-is-you-vitals-cluster">
            {/* Pure Numerical Vitals */}
            <div
                className={`this-is-you-vitals-group this-is-you-vitals-refresh${isVitalsRefreshHeld ? ' is-holding' : ''}`}
                role="button"
                aria-disabled={isVitalsRefreshDisabled}
                aria-pressed={isVitalsRefreshHeld}
                aria-busy={isRequestingVitalsScore}
                title="Hold to reveal exact vitals and request an updated score"
                tabIndex={isVitalsRefreshDisabled ? -1 : 0}
                onPointerDown={(event) => {
                    if (isVitalsRefreshDisabled || event.button !== 0) return;
                    event.currentTarget.setPointerCapture(event.pointerId);
                    onVitalsRefreshStart();
                }}
                onPointerUp={onVitalsRefreshEnd}
                onPointerCancel={onVitalsRefreshEnd}
                onLostPointerCapture={onVitalsRefreshEnd}
                onKeyDown={(event) => {
                    if (isVitalsRefreshDisabled || event.repeat || (event.key !== 'Enter' && event.key !== ' ')) return;
                    event.preventDefault();
                    onVitalsRefreshStart();
                }}
                onKeyUp={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') onVitalsRefreshEnd();
                }}
                onBlur={onVitalsRefreshEnd}
            >
                <div className="this-is-you-telemetry-cell this-is-you-health-cell">
                    <div className="this-is-you-cell-header this-is-you-health-header">
                        <span className="label hp">HEALTH</span>
                        <span className="regen" title="Regen rate per tick">({formatRegen(regen.hp)})</span>
                    </div>
                    <div className="this-is-you-cell-val" data-vital-type="health">
                        <span className={getVitalValueClass('health', hpStatus)}>
                            {scoreSnapshot
                                ? formatScoreValue(scoreSnapshot.hp, scoreSnapshot.maxHp)
                                : hpStatus?.trim() || '—'}
                        </span>
                        {scoreSnapshot && <StatDelta delta={deltas.hp} />}
                    </div>
                </div>

                <div className="this-is-you-telemetry-cell">
                    <div className="this-is-you-cell-header">
                        <span className="label mana">MANA</span>
                        <span className="regen" title="Regen rate per tick">({formatRegen(regen.mana)})</span>
                    </div>
                    <div className="this-is-you-cell-val" data-vital-type="mana">
                        <span className={getVitalValueClass('mana', manaStatus)}>
                            {scoreSnapshot
                                ? formatScoreValue(scoreSnapshot.mana, scoreSnapshot.maxMana)
                                : manaStatus?.trim() || '—'}
                        </span>
                        {scoreSnapshot && <StatDelta delta={deltas.mana} />}
                    </div>
                </div>

                <div className="this-is-you-telemetry-cell">
                    <div className="this-is-you-cell-header">
                        <span className="label move">MOVES</span>
                        <span className="regen" title="Regen rate per tick">({formatRegen(regen.move)})</span>
                    </div>
                    <div className="this-is-you-cell-val" data-vital-type="move">
                        <span className={getVitalValueClass('move', moveStatus)}>
                            {scoreSnapshot
                                ? formatScoreValue(scoreSnapshot.move, scoreSnapshot.maxMove)
                                : moveStatus?.trim() || '—'}
                        </span>
                        {scoreSnapshot && <StatDelta delta={deltas.move} />}
                    </div>
                </div>
            </div>
            </div>

            {/* Combat capabilities */}
            <div className="this-is-you-combat-slot" role="group" aria-label="Combat stats">
                <div className="this-is-you-combat-heading">
                    <span>COMBAT STATS</span>
                </div>
                <div className="this-is-you-capabilities-cell">
                    <div className="this-is-you-capabilities-row">
                        <span title="Offensive Power (OB): strike accuracy and damage"><span className="this-is-you-capability-label">Offense:</span><strong>{ob ?? '—'}</strong><StatDelta delta={deltas.ob} /></span>
                        <span title="Parry Deflection (PB): weapon blocking rating"><span className="this-is-you-capability-label">Parry:</span><strong>{pb ?? '—'}</strong><StatDelta delta={deltas.pb} /></span>
                        <span title="Defensive Evasion (DB): makes you harder to hit"><span className="this-is-you-capability-label">Dodge:</span><strong>{db ?? '—'}</strong><StatDelta delta={deltas.db} /></span>
                        <span title="Armor Absorption (ARM): physical damage reduction"><span className="this-is-you-capability-label">Armor:</span><strong>{armour ?? '—'}</strong><StatDelta delta={deltas.armour} /></span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ThisIsYouVitalsTier;
