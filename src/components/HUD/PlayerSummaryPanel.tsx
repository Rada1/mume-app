/**
 * @file PlayerSummaryPanel.tsx
 * @description Compact character progress panel for the desktop bottom bar.
 */

import React, { FC } from 'react';
import { useGame } from '../../context/GameContext';
import { getLearnedClassSkillCounts } from '../../utils/practiceClassCatalog';
import { CharacterProgressBoxes } from './CharacterProgressBoxes';
import './PlayerSummaryPanel.css';

interface PlayerSummaryPanelProps {
    compact?: boolean;
}

const formatNumber = (value: number | null | undefined) =>
    typeof value === 'number' && Number.isFinite(value) ? value.toLocaleString() : '—';

const HEIGHT_WORDS: Record<string, number> = {
    zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5,
    six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11,
    twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16,
    seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20
};

const parseHeightPart = (value: string) => {
    const normalized = value.trim().toLowerCase();
    if (/^\d+$/.test(normalized)) return Number(normalized);
    return HEIGHT_WORDS[normalized];
};

const formatHeight = (height: string | undefined) => {
    if (!height) return '—';
    const match = height.match(/^(\w+)\s+(?:feet|foot)\s+(\w+)(?:\s+inches?)?$/i);
    if (!match) return height;
    const feet = parseHeightPart(match[1]);
    const inches = parseHeightPart(match[2]);
    return Number.isFinite(feet) && Number.isFinite(inches) ? `${feet}' ${inches}\"` : height;
};

export const PlayerSummaryPanel: FC<PlayerSummaryPanelProps> = ({ compact = true }) => {
    // --- Logic Section ---
    const { characterInfo, characterName, abilities = {} } = useGame() as ReturnType<typeof useGame> & {
        abilities?: Record<string, number>;
    };

    const name = characterInfo.name || characterName || 'Adventurer';
    const title = characterInfo.title?.trim() || '';
    const displayName = title ? `${name} ${title}` : name;
    const ancestry = characterInfo.subrace?.trim() || characterInfo.race?.trim() || 'Unknown race';
    const subclass = characterInfo.subclass?.trim() || '';
    const agePart = characterInfo.age ? ` · Age ${characterInfo.age}` : '';
    const identity = compact
        ? `${subclass ? `${ancestry} · ${subclass}` : ancestry}${agePart}`
        : (subclass ? `${ancestry} · ${subclass}` : ancestry);

    const learnedCounts = getLearnedClassSkillCounts(abilities);
    const learnedSkills = learnedCounts.ranger + learnedCounts.thief + learnedCounts.warrior;
    const learnedSpells = learnedCounts.mage + learnedCounts.cleric;

    // --- Render Section ---
    return (
        <section className={`player-summary-panel${compact ? ' is-compact' : ''}`} aria-label="Character progress">
            <header className="player-summary-header">
                <span className="player-summary-name" title={displayName}>{displayName}</span>
                <span className="player-summary-level">Lv <strong>{characterInfo.level || '—'}</strong></span>
            </header>
            <div className="player-summary-ancestry" title={`Race: ${ancestry}${subclass ? ` · Subclass: ${subclass}` : ''}`}>{identity}</div>

            {!compact && (
                <div className="player-summary-bio" aria-label="Character bio">
                    <span>Age <strong>{characterInfo.age || '—'}</strong></span>
                    <span>Height <strong>{formatHeight(characterInfo.height)}</strong></span>
                </div>
            )}

            <div className="player-summary-achievements" aria-label="Character achievements">
                {!compact && <span className="player-summary-section-label">Progress</span>}
                <CharacterProgressBoxes
                    characterName={characterInfo.name || characterName}
                    xp={characterInfo.xp}
                    tp={characterInfo.tp}
                    tnl={characterInfo.tnl}
                    tpnl={characterInfo.tpnl}
                />
                {!compact && (
                    <div className="player-summary-metrics">
                        <div className="player-summary-metric"><span>Skills</span><strong>{learnedSkills}</strong></div>
                        <div className="player-summary-metric"><span>Spells</span><strong>{learnedSpells}</strong></div>
                        <div className="player-summary-metric"><span>Gold</span><strong>{formatNumber(characterInfo.gold)}</strong></div>
                        <div className="player-summary-metric"><span>Citizenships</span><strong>{formatNumber(characterInfo.citizenships)}</strong></div>
                        <div className="player-summary-metric"><span>War fame</span><strong>{formatNumber(characterInfo.warFame)}</strong></div>
                    </div>
                )}
            </div>
        </section>
    );
};

export default PlayerSummaryPanel;
