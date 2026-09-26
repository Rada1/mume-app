/**
 * @file ThisIsYouVitalsTier.tsx
 * @description Tier 2 telemetry for This is You console: numerical vitals & combat ratings.
 */

// --- Logic Section ---
import React, { FC } from 'react';
import { StatDelta } from './StatDelta';
import { formatRegen } from '../../utils/regenUtils';

export interface VitalsTierDeltas {
    hp?: { amount: number; id: number } | null;
    mana?: { amount: number; id: number } | null;
    move?: { amount: number; id: number } | null;
    ob?: { amount: number; id: number } | null;
    pb?: { amount: number; id: number } | null;
    db?: { amount: number; id: number } | null;
    armour?: { amount: number; id: number } | null;
    wimpy?: { amount: number; id: number } | null;
}

export interface ThisIsYouVitalsTierProps {
    hp: number | null | undefined;
    maxHp?: number | null | undefined;
    mana: number | null | undefined;
    maxMana?: number | null | undefined;
    move: number | null | undefined;
    maxMove?: number | null | undefined;
    ob: number | null | undefined;
    pb: number | null | undefined;
    db: number | null | undefined;
    armour: number | null | undefined;
    wimpy: number | null | undefined;
    regen: { hp: number; mana: number; move: number };
    deltas: VitalsTierDeltas;
}

// --- Render Section ---
export const ThisIsYouVitalsTier: FC<ThisIsYouVitalsTierProps> = ({
    hp,
    maxHp,
    mana,
    maxMana,
    move,
    maxMove,
    ob,
    pb,
    db,
    armour,
    wimpy,
    regen,
    deltas
}) => {
    return (
        <div className="this-is-you-tier-vitals">
            {/* Pure Numerical Vitals */}
            <div className="this-is-you-vitals-group" role="group" aria-label="Vitals">
                <div className="this-is-you-telemetry-cell">
                    <div className="this-is-you-cell-header">
                        <span className="label hp">HEALTH</span>
                        <span className="regen" title="Regen rate per tick">({formatRegen(regen.hp)})</span>
                    </div>
                    <div className={`this-is-you-cell-val${(hp ?? 100) < 30 ? ' is-critical' : ''}`}>
                        {hp ?? '—'}{maxHp ? ` / ${maxHp}` : ''}<StatDelta delta={deltas.hp} />
                    </div>
                </div>

                <div className="this-is-you-telemetry-cell">
                    <div className="this-is-you-cell-header">
                        <span className="label mana">MANA</span>
                        <span className="regen" title="Regen rate per tick">({formatRegen(regen.mana)})</span>
                    </div>
                    <div className="this-is-you-cell-val">
                        {mana ?? '—'}{maxMana ? ` / ${maxMana}` : ''}<StatDelta delta={deltas.mana} />
                    </div>
                </div>

                <div className="this-is-you-telemetry-cell">
                    <div className="this-is-you-cell-header">
                        <span className="label move">MOVES</span>
                        <span className="regen" title="Regen rate per tick">({formatRegen(regen.move)})</span>
                    </div>
                    <div className="this-is-you-cell-val">
                        {move ?? '—'}{maxMove ? ` / ${maxMove}` : ''}<StatDelta delta={deltas.move} />
                    </div>
                </div>
            </div>

            {/* Combat capabilities */}
            <div className="this-is-you-combat-slot" role="group" aria-label="Combat">
                <div className="this-is-you-capabilities-cell">
                    <div className="this-is-you-cell-header">
                        <span>Combat Ratings</span>
                        <span className="sub">Gear &amp; Stance</span>
                    </div>
                    <div className="this-is-you-capabilities-row">
                        <span title="Offensive Power (OB): strike accuracy and damage">Offense: <strong>{ob ?? '—'}</strong><StatDelta delta={deltas.ob} /></span>
                        <span title="Parry Deflection (PB): weapon blocking rating">Parry: <strong>{pb ?? '—'}</strong><StatDelta delta={deltas.pb} /></span>
                        <span title="Defensive Evasion (DB): makes you harder to hit">Dodge: <strong>{db ?? '—'}</strong><StatDelta delta={deltas.db} /></span>
                        <span title="Armor Absorption (ARM): physical damage reduction">Armor: <strong>{armour ?? '—'}</strong><StatDelta delta={deltas.armour} /></span>
                        <span title="Wimpy Threshold (%y): automatically flee combat when health drops below this value">Wimpy: <strong>{wimpy !== undefined && wimpy !== null ? wimpy : '—'}</strong><StatDelta delta={deltas.wimpy} /></span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ThisIsYouVitalsTier;
