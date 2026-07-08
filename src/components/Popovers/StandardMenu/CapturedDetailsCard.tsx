/**
 * @file CapturedDetailsCard.tsx
 * @description Presents captured look and consider output as structured popover details.
 */

import React from 'react';
import { splitLookLines, sanitizeLines, stripHtml } from '../../../utils/lookTextUtils';
import { sanitizeMumeHtml } from '../../../utils/securityUtils';

// --- Types Section ---

interface CapturedDetailsCardProps {
    examineLines?: string[];
    considerLines?: string[];
    isCapturingExamine?: boolean;
    isCapturingConsider?: boolean;
    whoisLines?: string[];
    isCapturingWhois?: boolean;
}

interface AssessmentLine {
    label: string;
    html: string;
    tone: 'neutral' | 'good' | 'warning' | 'danger';
}

// --- Logic Section ---

const getAssessmentLabel = (text: string): string => {
    const lower = text.toLowerCase();
    // Mob consider
    if (lower.includes('condition')) return 'Condition';
    if (lower.includes('level')) return 'Threat';
    if (lower.includes('luck') || lower.includes('handle')) return 'Odds';
    // Object consider (weapon / armour assessment from `con <object>`)
    if (/\bweighs?\b|\bpounds?\b|\bweight\b/.test(lower)) return 'Weight';
    if (/\bfits?\s+you\b|\btoo\s+(?:small|large|big|tight)\b/.test(lower)) return 'Fit';
    if (/absorb|protection|provide(?:s)?\s+\w*\s*protection/.test(lower)) return 'Armour';
    if (/attack|defend|damage|speed|inflict|wielded|one-handed|two-handed|reach|weapon/.test(lower)) return 'Combat';
    if (/made of|forged|metal|leather|wooden|wood|cloth|cotton|silk|fur|bone|crystal/.test(lower)) return 'Material';
    if (/^(?:it is a|they are a|this is a)\b/.test(lower) || /\b(worn out|brand[- ]?new|tattered|battered|pristine|neglected)\b/.test(lower)) return 'Item';
    if (lower.includes('easy') || lower.includes('hard')) return 'Odds';
    return 'Read';
};

const getAssessmentTone = (text: string): AssessmentLine['tone'] => {
    const lower = text.toLowerCase();
    if (/excellent|perfect|healthy|lower level|easy|no problem/.test(lower)) return 'good';
    if (/luck|higher level|hard|wound|hurt|danger/.test(lower)) return 'warning';
    if (/awful|dying|deadly|impossible|break your neck/.test(lower)) return 'danger';
    // Object assessment quality cues
    if (/\b(good|well|sturdy|remarkable|superb|great|sharp|fine)\b/.test(lower)) return 'good';
    if (/\b(poor|slow|badly|cheap|flimsy|brittle|fragile|clumsy)\b/.test(lower)) return 'warning';
    return 'neutral';
};

const toAssessmentLine = (html: string): AssessmentLine => {
    const text = stripHtml(html);
    return {
        label: getAssessmentLabel(text),
        html: sanitizeMumeHtml(html),
        tone: getAssessmentTone(text)
    };
};

// --- Component Section ---

export const CapturedDetailsCard: React.FC<CapturedDetailsCardProps> = ({
    examineLines,
    considerLines,
    isCapturingExamine,
    isCapturingConsider,
    whoisLines,
    isCapturingWhois
}) => {
    // Remote allies aren't in the room, so they get identified via "whois"
    // instead of the look/consider grid.
    if (isCapturingWhois || (whoisLines && whoisLines.length > 0)) {
        const lines = sanitizeLines(whoisLines);
        return (
            <section className="captured-details-card" onPointerDown={(e) => e.stopPropagation()}>
                <div className="captured-details-grid captured-details-grid-single">
                    <div className="captured-detail-panel whois-panel">
                        <div className="captured-detail-kicker">Identify</div>
                        {isCapturingWhois && lines.length === 0 ? (
                            <div className="captured-detail-loading">
                                <span className="captured-spinner" />
                                <span>Identifying...</span>
                            </div>
                        ) : lines.length > 0 ? (
                            <div className="captured-look-copy">
                                {lines.map((line, idx) => (
                                    <p key={`whois-${idx}`} dangerouslySetInnerHTML={{ __html: line }} />
                                ))}
                            </div>
                        ) : (
                            <div className="captured-detail-empty">No info found.</div>
                        )}
                    </div>
                </div>
            </section>
        );
    }

    const look = splitLookLines(examineLines);
    const conditionLines = look.condition.map(toAssessmentLine);
    const assessmentLines = (considerLines || []).map(toAssessmentLine);
    const isLoading = !!(isCapturingExamine || isCapturingConsider);

    if (!isLoading && look.description.length === 0 && look.equipment.length === 0 && conditionLines.length === 0 && assessmentLines.length === 0) return null;

    return (
        <section className="captured-details-card" onPointerDown={(e) => e.stopPropagation()}>
            {conditionLines.length > 0 && (
                <div className="captured-condition-strip">
                    {conditionLines.map((line, idx) => (
                        <div className={`captured-condition-pill tone-${line.tone}`} key={`condition-${idx}`}>
                            <span className="captured-condition-label">Condition</span>
                            <span className="captured-condition-text" dangerouslySetInnerHTML={{ __html: line.html }} />
                        </div>
                    ))}
                </div>
            )}
            <div className="captured-details-grid">
                <div className="captured-detail-panel look-panel">
                    <div className="captured-detail-kicker">Look</div>
                    {isCapturingExamine && look.description.length === 0 ? (
                        <div className="captured-detail-loading">
                            <span className="captured-spinner" />
                            <span>Looking...</span>
                        </div>
                    ) : look.description.length > 0 ? (
                        <div className="captured-look-copy">
                            {look.description.map((line, idx) => (
                                <p key={`look-${idx}`} dangerouslySetInnerHTML={{ __html: line }} />
                            ))}
                        </div>
                    ) : (
                        <div className="captured-detail-empty">No look details yet.</div>
                    )}

                    {look.equipment.length > 0 && (
                        <div className="captured-look-equipment">
                            <div className="captured-equipment-kicker">Equipment</div>
                            <ul className="captured-equipment-list">
                                {look.equipment.map((line, idx) => (
                                    <li key={`eq-${idx}`} dangerouslySetInnerHTML={{ __html: line }} />
                                ))}
                            </ul>
                        </div>
                    )}
                </div>

                <div className="captured-detail-panel con-panel">
                    <div className="captured-detail-kicker">Consider</div>
                    {isCapturingConsider && assessmentLines.length === 0 ? (
                        <div className="captured-detail-loading">
                            <span className="captured-spinner" />
                            <span>Considering...</span>
                        </div>
                    ) : assessmentLines.length > 0 ? (
                        <div className="captured-assessment-list">
                            {assessmentLines.map((line, idx) => (
                                <div className={`captured-assessment-row tone-${line.tone}`} key={`con-${idx}`}>
                                    <span className="captured-assessment-label">{line.label}</span>
                                    <span className="captured-assessment-text" dangerouslySetInnerHTML={{ __html: line.html }} />
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="captured-detail-empty">No assessment yet.</div>
                    )}
                </div>
            </div>
        </section>
    );
};
