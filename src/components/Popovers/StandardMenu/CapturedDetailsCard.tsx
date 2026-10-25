/**
 * @file CapturedDetailsCard.tsx
 * @description Presents captured inspection and room-report output as structured details.
 */

import React from 'react';
import { splitLookLines, sanitizeLines, stripHtml } from '../../../utils/lookTextUtils';
import { escapeHtml, sanitizeMumeHtml } from '../../../utils/securityUtils';

// --- Types Section ---

interface CapturedDetailsCardProps {
    examineLines?: string[];
    examineMode?: 'look' | 'examine';
    considerLines?: string[];
    isCapturingExamine?: boolean;
    isCapturingConsider?: boolean;
    helpLines?: string[];
    helpTopic?: string;
    isCapturingHelp?: boolean;
    whoisLines?: string[];
    isCapturingWhois?: boolean;
    whoLines?: string[];
    isCapturingWho?: boolean;
    whereLines?: string[];
    isCapturingWhere?: boolean;
    roomActionLines?: string[];
    roomActionKind?: 'exits' | 'map' | 'weather global' | 'weather fog' | 'weather local';
    isCapturingRoomAction?: boolean;
    personalActionLines?: string[];
    personalActionKind?: 'info' | 'stat' | 'score';
    isCapturingPersonalAction?: boolean;
    commandReportLines?: string[];
    commandReportLabel?: string;
    isCapturingCommandReport?: boolean;
    shopLines?: Array<{ id: string | number; text: string; html?: string }>;
    shopTitle?: string;
    isShopPending?: boolean;
    practiceLines?: Array<{ id: string | number; text: string; html?: string }> | string[];
    practiceSkillName?: string;
    isPracticePending?: boolean;
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

const renderCapturedReport = (title: string, lines: string[] | undefined, isCapturing: boolean, loadingLabel: string, emptyLabel: string) => {
    const safeLines = sanitizeLines(lines);
    return (
        <section className={`captured-details-card${title === 'Map' ? ' captured-map-report' : ''}${title.startsWith('Help') ? ' captured-help-report' : ''}`} onPointerDown={(e) => e.stopPropagation()}>
            <div className="captured-details-grid captured-details-grid-single">
                <div className="captured-detail-panel whois-panel">
                    <div className="captured-detail-kicker">{title}</div>
                    {isCapturing && safeLines.length === 0 ? (
                        <div className="captured-detail-loading">
                            <span className="captured-spinner" />
                            <span>{loadingLabel}</span>
                        </div>
                    ) : safeLines.length > 0 ? (
                        <pre className="captured-report-copy" dangerouslySetInnerHTML={{ __html: safeLines.map(line => line || '&nbsp;').join('\n') }} />
                    ) : (
                        <div className="captured-detail-empty">{emptyLabel}</div>
                    )}
                </div>
            </div>
        </section>
    );
};

// --- Component Section ---

export const CapturedDetailsCard: React.FC<CapturedDetailsCardProps> = ({
    examineLines,
    examineMode = 'look',
    considerLines,
    isCapturingExamine,
    isCapturingConsider,
    helpLines,
    helpTopic,
    isCapturingHelp,
    whoisLines,
    isCapturingWhois,
    whoLines,
    isCapturingWho,
    whereLines,
    isCapturingWhere,
    roomActionLines,
    roomActionKind,
    isCapturingRoomAction,
    personalActionLines,
    personalActionKind,
    isCapturingPersonalAction,
    commandReportLines,
    commandReportLabel,
    isCapturingCommandReport,
    shopLines,
    shopTitle,
    isShopPending,
    practiceLines,
    practiceSkillName,
    isPracticePending
}) => {
    if (isShopPending || shopLines !== undefined || shopTitle) {
        return (
            <section className="captured-details-card captured-shop-report" onPointerDown={(e) => e.stopPropagation()}>
                <div className="captured-details-grid captured-details-grid-single">
                    <div className="captured-detail-panel whois-panel">
                        <div className="captured-detail-kicker">{shopTitle || 'Shop'}</div>
                        {isShopPending ? (
                            <div className="captured-detail-loading">
                                <span className="captured-spinner" />
                                <span>Waiting for shop response…</span>
                            </div>
                        ) : shopLines && shopLines.length > 0 ? (
                            <div className="command-shop-output-lines" aria-live="polite">
                                {shopLines.map((line, index) => (
                                    <div key={`${line.id}:${index}`} dangerouslySetInnerHTML={{ __html: sanitizeMumeHtml(line.html || escapeHtml(line.text)) }} />
                                ))}
                            </div>
                        ) : (
                            <div className="captured-detail-empty">No shop information returned.</div>
                        )}
                    </div>
                </div>
            </section>
        );
    }
    if (practiceSkillName || isPracticePending || practiceLines !== undefined) {
        return (
            <section className="captured-details-card captured-practice-report" onPointerDown={(e) => e.stopPropagation()}>
                <div className="captured-details-grid captured-details-grid-single">
                    <div className="captured-detail-panel whois-panel">
                        <div className="captured-detail-kicker">{practiceSkillName ? `Practice · ${practiceSkillName}` : 'Practice'}</div>
                        {isPracticePending ? (
                            <div className="captured-detail-loading">
                                <span className="captured-spinner" />
                                <span>Waiting for training response…</span>
                            </div>
                        ) : practiceLines && practiceLines.length > 0 ? (
                            <div className="command-practice-output-lines" aria-live="polite">
                                {practiceLines.map((line, index) => {
                                    const key = typeof line === 'object' && line ? `${line.id}:${index}` : index;
                                    const html = typeof line === 'object' && line ? (line.html || escapeHtml(line.text)) : escapeHtml(line);
                                    return <div key={key} dangerouslySetInnerHTML={{ __html: sanitizeMumeHtml(html) }} />;
                                })}
                            </div>
                        ) : (
                            <div className="captured-detail-empty">No training response returned.</div>
                        )}
                    </div>
                </div>
            </section>
        );
    }
    if (isCapturingHelp || helpLines !== undefined) {
        return renderCapturedReport(helpTopic ? `Help · ${helpTopic}` : 'Help', helpLines, !!isCapturingHelp, 'Loading help...', 'No help information returned.');
    }
    if (isCapturingWho || whoLines !== undefined) {
        return renderCapturedReport('Who', whoLines, !!isCapturingWho, 'Loading players...', 'No players found.');
    }
    if (isCapturingWhere || whereLines !== undefined) {
        return renderCapturedReport('Where', whereLines, !!isCapturingWhere, 'Finding nearby players...', 'No nearby players found.');
    }
    // Remote allies aren't in the room, so they get identified via "whois"
    // instead of the look/consider grid.
    if (isCapturingWhois || whoisLines !== undefined) {
        return renderCapturedReport('Identify', whoisLines, !!isCapturingWhois, 'Identifying...', 'No info found.');
    }
    if (isCapturingRoomAction || roomActionLines !== undefined) {
        const title = roomActionKind === 'map' ? 'Map' : roomActionKind?.startsWith('weather ')
            ? `Weather · ${roomActionKind.endsWith('fog') ? 'Fog' : roomActionKind.endsWith('local') ? 'Local' : 'Global'}`
            : 'Exits';
        return renderCapturedReport(title, roomActionLines, !!isCapturingRoomAction, `Loading ${title.toLowerCase()}...`, `No ${title.toLowerCase()} information returned.`);
    }
    if (isCapturingPersonalAction || personalActionLines !== undefined) {
        const title = (personalActionKind || 'info').replace(/^./, letter => letter.toUpperCase());
        return renderCapturedReport(title, personalActionLines, !!isCapturingPersonalAction, `Loading ${title.toLowerCase()}...`, `No ${title.toLowerCase()} information returned.`);
    }
    if (isCapturingCommandReport || commandReportLines !== undefined) {
        const title = commandReportLabel || 'Command';
        return renderCapturedReport(title, commandReportLines, !!isCapturingCommandReport, `Loading ${title.toLowerCase()}...`, `No ${title.toLowerCase()} information returned.`);
    }

    const look = splitLookLines(examineLines);
    const conditionLines = look.condition.map(toAssessmentLine);
    const assessmentLines = (considerLines || []).map(toAssessmentLine);
    const showLook = !!isCapturingExamine || examineLines !== undefined;
    const showConsider = !!isCapturingConsider || considerLines !== undefined;

    if (!showLook && !showConsider) return null;

    return (
        <section className="captured-details-card" onPointerDown={(e) => e.stopPropagation()}>
            <div className={`captured-details-grid${showLook && showConsider ? '' : ' captured-details-grid-single'}`}>
                {showLook && <div className="captured-detail-panel look-panel">
                    <div className="captured-detail-kicker">{examineMode === 'examine' ? 'Examine' : 'Look'}</div>
                    {isCapturingExamine && look.description.length === 0 ? (
                        <div className="captured-detail-loading">
                            <span className="captured-spinner" />
                            <span>{examineMode === 'examine' ? 'Examining...' : 'Looking...'}</span>
                        </div>
                    ) : look.description.length > 0 ? (
                        <div className="captured-look-copy">
                            {look.description.map((line, idx) => (
                                <p key={`look-${idx}`} dangerouslySetInnerHTML={{ __html: line || '&nbsp;' }} />
                            ))}
                        </div>
                    ) : (
                        <div className="captured-detail-empty"><span>{examineMode === 'examine' ? 'No examine details yet.' : 'No look details yet.'}</span></div>
                    )}

                    {conditionLines.length > 0 && (
                        <div className="captured-look-condition">
                            <div className="captured-equipment-kicker">Condition</div>
                            <div className="captured-look-copy">
                                {conditionLines.map((line, idx) => (
                                    <p key={`condition-${idx}`} dangerouslySetInnerHTML={{ __html: line.html || '&nbsp;' }} />
                                ))}
                            </div>
                        </div>
                    )}

                    {look.equipment.length > 0 && (
                        <div className="captured-look-equipment">
                            <div className="captured-equipment-kicker">Equipment</div>
                            <ul className="captured-equipment-list">
                                {look.equipment.map((line, idx) => (
                                    <li key={`eq-${idx}`} dangerouslySetInnerHTML={{ __html: line || '&nbsp;' }} />
                                ))}
                            </ul>
                        </div>
                    )}
                </div>}

                {showConsider && <div className="captured-detail-panel con-panel">
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
                                    <span className="captured-assessment-text" dangerouslySetInnerHTML={{ __html: line.html }} />
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="captured-detail-empty"><span>No assessment yet.</span></div>
                    )}
                </div>}
            </div>
        </section>
    );
};
