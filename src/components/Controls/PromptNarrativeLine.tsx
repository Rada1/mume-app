/**
 * @file PromptNarrativeLine.tsx
 * @description A concise, second-person narrative summary line docked above the prompt box.
 * Distills player health, posture, location, and active focus into a single sentence.
 */

import React, { useMemo } from 'react';
import { useActiveVitals, useActiveRoom, useActiveCombat } from '../../stores/useActiveGameState';
import { useActionTimerStore } from '../../stores/useActionTimerStore';
import { useInputStore } from '../../stores/useInputStore';
import './PromptNarrativeLine.css';

// --- Logic Section: Health & Action Extraction ---

interface HealthDescriptor {
    text: string;
    colorClass: string;
}

const getHealthDescriptor = (
    hpStatus: string | null,
    hp: number,
    maxHp: number
): HealthDescriptor => {
    const raw = (hpStatus || '').toLowerCase().trim();
    if (raw && raw !== 'none') {
        if (raw === 'healthy') return { text: 'healthy', colorClass: 'health-healthy' };
        if (raw === 'fine') return { text: 'fine', colorClass: 'health-fine' };
        if (raw === 'hurt') return { text: 'hurt', colorClass: 'health-hurt' };
        if (raw === 'wounded') return { text: 'wounded', colorClass: 'health-wounded' };
        if (raw === 'bad' || raw === 'awful' || raw === 'dying' || raw === 'stunned') {
            return { text: raw, colorClass: 'health-critical' };
        }
        return { text: raw, colorClass: 'health-fine' };
    }

    if (maxHp > 0) {
        const pct = (hp / maxHp) * 100;
        if (pct >= 99) return { text: 'healthy', colorClass: 'health-healthy' };
        if (pct >= 70) return { text: 'fine', colorClass: 'health-fine' };
        if (pct >= 45) return { text: 'hurt', colorClass: 'health-hurt' };
        if (pct >= 25) return { text: 'wounded', colorClass: 'health-wounded' };
        return { text: 'dying', colorClass: 'health-critical' };
    }

    return { text: 'healthy', colorClass: 'health-healthy' };
};

const getActionPhrase = (
    activeTimerName: string | null,
    posture: string,
    lastCommand: string | null
): string => {
    if (activeTimerName) {
        const cleaned = activeTimerName.trim();
        if (/^casting:\s*/i.test(cleaned)) {
            return `casting ${cleaned.replace(/^casting:\s*/i, '').toLowerCase()}`;
        }
        return cleaned.toLowerCase();
    }

    if (posture === 'resting') return 'resting';
    if (posture === 'sitting') return 'sitting';
    if (posture === 'sleeping') return 'sleeping';

    if (lastCommand) {
        const lower = lastCommand.toLowerCase().trim();
        if (lower.startsWith('track')) return 'looking for tracks';
        if (lower.startsWith('search')) return 'searching';
        if (lower.startsWith('scout')) return 'scouting';
        if (lower.startsWith('hide') || lower.startsWith('sneak')) return 'sneaking';
        if (lower.startsWith('bandage') || lower.startsWith('bind')) return 'applying bandages';
    }

    return 'alert';
};

// --- Component Section ---

export const PromptNarrativeLine: React.FC = () => {
    const vitals = useActiveVitals();
    const room = useActiveRoom();
    const combat = useActiveCombat();
    const activeTimer = useActionTimerStore(state => state.activeTimer);
    const history = useInputStore(state => state.history);

    const lastCommand = history.length > 0 ? history[history.length - 1] : null;
    const isFighting = vitals.inCombat || Boolean(combat.opponentName) || Boolean(vitals.target);

    const foe = useMemo(() => {
        return combat.opponentName || vitals.target || 'an opponent';
    }, [combat.opponentName, vitals.target]);

    const health = useMemo(() => {
        return getHealthDescriptor(vitals.hpStatus, vitals.hp, vitals.maxHp);
    }, [vitals.hpStatus, vitals.hp, vitals.maxHp]);

    const posture = useMemo(() => {
        if (vitals.isRiding) return 'riding';
        const pos = (vitals.position || '').toLowerCase();
        if (pos && pos !== 'fighting') return pos;
        return 'standing';
    }, [vitals.isRiding, vitals.position]);

    const locationName = useMemo(() => {
        if (room.roomZone && room.roomZone.trim()) {
            return room.roomZone.trim();
        }
        if (room.roomName && room.roomName.trim()) {
            return room.roomName.trim();
        }
        return 'Middle-earth';
    }, [room.roomZone, room.roomName]);

    const activeTimerName = activeTimer && !activeTimer.isFinished ? activeTimer.name : null;

    const actionPhrase = useMemo(() => {
        return getActionPhrase(
            activeTimerName,
            posture,
            lastCommand
        );
    }, [activeTimerName, posture, lastCommand]);

    const exitList = useMemo(() => {
        if (!room.exits || room.exits.length === 0) return null;
        // Take short initials: N, S, E, W, U, D
        const initials = room.exits.map(e => e.trim().charAt(0).toUpperCase()).join(', ');
        return initials;
    }, [room.exits]);

    return (
        <div className={`prompt-narrative-line${isFighting ? ' in-combat' : ''}`}>
            <div className="prompt-narrative-content">
                <span className="prompt-narrative-dot" />
                <span className="prompt-narrative-text">
                    You are <span className={`prompt-narrative-health ${health.colorClass}`}>{health.text}</span>,{' '}
                    {isFighting ? (
                        <>
                            fighting <span className="prompt-narrative-action">{foe}</span> in <span className="prompt-narrative-location">{locationName}</span>.
                        </>
                    ) : actionPhrase === 'alert' ? (
                        <>
                            <span className="prompt-narrative-posture">{posture}</span> in <span className="prompt-narrative-location">{locationName}</span>.
                        </>
                    ) : (
                        <>
                            <span className="prompt-narrative-posture">{posture}</span> in <span className="prompt-narrative-location">{locationName}</span>, <span className="prompt-narrative-action">{actionPhrase}</span>.
                        </>
                    )}
                </span>
            </div>
            {exitList && (
                <div className="prompt-narrative-exits" title={`Exits: ${room.exits.join(', ')}`}>
                    [<strong>{exitList}</strong>]
                </div>
            )}
        </div>
    );
};

export default React.memo(PromptNarrativeLine);
