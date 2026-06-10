/**
 * @file ShaperRoomTileBadges.tsx
 * @description Compact content indicators for Shaper room tiles.
 */

import { listShaperComRoomEntities } from '../model/shaperComCommands';
import type { ShaperCommandNode, ShaperItemRef, ShaperMobPlacement, ShaperRoomDraft } from '../model/shaperTypes';
import './ShaperRoomTileBadges.css';

interface ShaperRoomTileBadgesProps {
    room: ShaperRoomDraft;
    commandNodes: Record<string, ShaperCommandNode>;
}

interface TileBadge {
    id: string;
    label: string;
    count: number;
    kind: 'mob' | 'object';
}

const MAX_BADGES = 4;

// --- Summary Section ---
const shortEntityName = (name: string, vnum: string): string => {
    const shortName = name.split(':')[0]?.trim();
    return shortName || name.trim() || vnum || 'unnamed';
};

const summarizeEntities = (
    mobs: ShaperMobPlacement[],
    objects: ShaperItemRef[]
): TileBadge[] => {
    const summaries = new Map<string, TileBadge>();
    const addSummary = (kind: TileBadge['kind'], vnum: string, name: string) => {
        const label = shortEntityName(name, vnum);
        const id = `${kind}:${vnum}:${label.toLocaleLowerCase()}`;
        const existing = summaries.get(id);
        if (existing) summaries.set(id, { ...existing, count: existing.count + 1 });
        else summaries.set(id, { id, label, count: 1, kind });
    };

    mobs.forEach(mob => {
        addSummary('mob', mob.vnum, mob.name);
        mob.items.forEach(item => addSummary('object', item.vnum, item.name));
    });
    objects.forEach(item => addSummary('object', item.vnum, item.name));
    return [...summaries.values()];
};

// --- Component Section ---
export const ShaperRoomTileBadges: React.FC<ShaperRoomTileBadgesProps> = ({ room, commandNodes }) => {
    const entities = listShaperComRoomEntities(commandNodes, room.id);
    const badges = summarizeEntities(entities.mobs, entities.objects);
    const annotationCount = room.annotations.length;

    if (badges.length === 0 && annotationCount === 0) return null;

    const visibleBadges = badges.slice(0, MAX_BADGES);
    const overflow = badges.length - visibleBadges.length;
    const label = [
        ...badges.map(badge => `${badge.count}x ${badge.label}`),
        annotationCount > 0 ? `${annotationCount} annotations` : ''
    ].filter(Boolean).join(', ');

    return (
        <>
            {annotationCount > 0 && <span className="shaper-room-annotation-marker" title={`${annotationCount} annotations`}>{annotationCount}</span>}
            {badges.length > 0 && (
                <div className="shaper-room-badges" aria-label={label} title={label}>
                    {visibleBadges.map(badge => (
                        <span key={badge.id} className={`shaper-room-badge ${badge.kind}`}>
                            {badge.count}x {badge.label}
                        </span>
                    ))}
                    {overflow > 0 && <span className="shaper-room-badge more">+{overflow} more</span>}
                </div>
            )}
        </>
    );
};
