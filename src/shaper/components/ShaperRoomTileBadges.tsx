/**
 * @file ShaperRoomTileBadges.tsx
 * @description Compact content indicators for Shaper room tiles.
 */

import type { MouseEvent as ReactMouseEvent } from 'react';
import { listShaperComRoomEntities } from '../model/shaperComCommands';
import type { ShaperCommandNode, ShaperItemRef, ShaperMobPlacement, ShaperRoomDraft } from '../model/shaperTypes';
import type { ShaperHoverContent } from './ShaperHoverCard';
import './ShaperRoomTileBadges.css';

interface ShaperRoomTileBadgesProps {
    room: ShaperRoomDraft;
    commandNodes: Record<string, ShaperCommandNode>;
    showComOverlay?: boolean;
    onHover?: (content: ShaperHoverContent, event: ReactMouseEvent) => void;
    onSelectEntity?: (roomId: string, entityId: string) => void;
}

interface TileBadge {
    id: string;
    label: string;
    count: number;
    kind: 'mob' | 'object';
    resetType?: string;
    lowChance?: boolean;
    hasLimits?: boolean;
    // Representative entity for the hover card (first occurrence with this signature).
    mob?: ShaperMobPlacement;
    object?: ShaperItemRef;
}

const MAX_BADGES = 4;

// --- Summary Section ---
const shortEntityName = (name: string, vnum: string): string => {
    const shortName = name.split(':')[0]?.trim();
    return shortName || name.trim() || vnum || 'unnamed';
};

const summarizeEntities = (
    mobs: ShaperMobPlacement[],
    objects: ShaperItemRef[],
    showComOverlay: boolean
): TileBadge[] => {
    const summaries = new Map<string, TileBadge>();
    
    const addSummary = (
        kind: TileBadge['kind'],
        vnum: string,
        name: string,
        resetType: string | undefined,
        limitObj: any,
        entity: ShaperMobPlacement | ShaperItemRef
    ) => {
        let label = shortEntityName(name, vnum);
        let lowChance = false;
        let hasLimits = false;

        if (showComOverlay && limitObj) {
            const parts: string[] = [];
            if (limitObj.world !== null && limitObj.world !== undefined) parts.push(`w${limitObj.world}`);
            if (limitObj.zone !== null && limitObj.zone !== undefined) parts.push(`z${limitObj.zone}`);
            if (limitObj.room !== null && limitObj.room !== undefined) parts.push(`r${limitObj.room}`);
            
            const limitText = parts.length > 0 ? `[${parts.join('|')}]` : '[∞]';
            const chanceText = limitObj.chancePercent && limitObj.chancePercent !== 100 ? `🎲${limitObj.chancePercent}%` : '';
            
            label = `${chanceText} ${limitText} ${label}`.trim();
            lowChance = limitObj.chancePercent < 100;
            hasLimits = parts.length > 0;
        }

        const id = `${kind}:${vnum}:${resetType || 'default'}:${label.toLocaleLowerCase()}`;
        const existing = summaries.get(id);
        if (existing) {
            summaries.set(id, { ...existing, count: existing.count + 1 });
        } else {
            summaries.set(id, {
                id, label, count: 1, kind, resetType, lowChance, hasLimits,
                mob: kind === 'mob' ? (entity as ShaperMobPlacement) : undefined,
                object: kind === 'object' ? (entity as ShaperItemRef) : undefined
            });
        }
    };

    const processMob = (mob: ShaperMobPlacement) => {
        addSummary('mob', mob.vnum, mob.name, mob.resetType, mob.limit, mob);
        mob.items.forEach(item => processItem(item));
        if (mob.followers) {
            mob.followers.forEach(follower => processMob(follower));
        }
    };

    const processItem = (item: ShaperItemRef) => {
        addSummary('object', item.vnum, item.name, item.resetType, item.limit, item);
        if (item.contents) {
            item.contents.forEach(child => processItem(child));
        }
    };

    mobs.forEach(mob => processMob(mob));
    objects.forEach(item => processItem(item));

    return [...summaries.values()];
};

// --- Component Section ---
export const ShaperRoomTileBadges: React.FC<ShaperRoomTileBadgesProps> = ({
    room,
    commandNodes,
    showComOverlay = false,
    onHover,
    onSelectEntity
}) => {
    const entities = listShaperComRoomEntities(commandNodes, room.id);
    const badges = summarizeEntities(entities.mobs, entities.objects, showComOverlay);
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
                    {visibleBadges.map(badge => {
                        const badgeClasses = [
                            'shaper-room-badge',
                            badge.kind,
                            badge.resetType,
                            badge.lowChance ? 'low-chance' : '',
                            badge.hasLimits ? 'has-limits' : '',
                            showComOverlay ? 'com-mode' : ''
                        ].filter(Boolean).join(' ');

                        const entityId = badge.mob?.id || badge.object?.id;
                        const hoverContent: ShaperHoverContent | null = badge.mob
                            ? { kind: 'mob', mob: badge.mob }
                            : badge.object ? { kind: 'object', object: badge.object } : null;

                        return (
                            <span
                                key={badge.id}
                                className={`${badgeClasses}${entityId && onSelectEntity ? ' clickable' : ''}`}
                                onMouseMove={hoverContent && onHover ? (event => { event.stopPropagation(); onHover(hoverContent, event); }) : undefined}
                                onPointerDown={entityId && onSelectEntity ? (event => { event.stopPropagation(); onSelectEntity(room.id, entityId); }) : undefined}
                            >
                                {badge.count}x {badge.label}
                            </span>
                        );
                    })}
                    {overflow > 0 && <span className="shaper-room-badge more">+{overflow} more</span>}
                </div>
            )}
        </>
    );
};
