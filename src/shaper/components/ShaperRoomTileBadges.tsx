/**
 * @file ShaperRoomTileBadges.tsx
 * @description Compact content indicators for Shaper room tiles.
 */

import type { MouseEvent as ReactMouseEvent } from 'react';
import { listShaperComRoomEntities } from '../model/shaperComCommands';
import type {
    ShaperCommandLimit,
    ShaperCommandNode,
    ShaperItemRef,
    ShaperLibraryInstall,
    ShaperMobPlacement,
    ShaperRoomDraft
} from '../model/shaperTypes';
import type { ShaperHoverContent } from './ShaperHoverCard';
import './ShaperRoomTileBadges.css';

interface ShaperRoomTileBadgesProps {
    room: ShaperRoomDraft;
    commandNodes: Record<string, ShaperCommandNode>;
    libraries: Record<string, ShaperLibraryInstall>;
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
    hasLibrary?: boolean;
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

const formatLimitSuffix = (limit: ShaperCommandLimit | null | undefined): string => {
    if (!limit) return '';
    const parts: string[] = [];
    if (limit.world && limit.world > 0) parts.push(`w${limit.world}`);
    if (limit.zone && limit.zone > 0) parts.push(`z${limit.zone}`);
    if (limit.room && limit.room > 0) parts.push(`r${limit.room}`);
    return parts.join(' ');
};

const summarizeEntities = (
    mobs: ShaperMobPlacement[],
    objects: ShaperItemRef[],
    libraries: Record<string, ShaperLibraryInstall>
): TileBadge[] => {
    const summaries = new Map<string, TileBadge>();

    const addSummary = (
        kind: TileBadge['kind'],
        vnum: string,
        name: string,
        resetType: string | undefined,
        limit: ShaperCommandLimit | null | undefined,
        entity: ShaperMobPlacement | ShaperItemRef
    ) => {
        const limitSuffix = formatLimitSuffix(limit);
        const label = [shortEntityName(name, vnum), limitSuffix].filter(Boolean).join(' ');
        const lowChance = !!limit && limit.chancePercent < 100;
        const hasLimits = !!limitSuffix;
        const hasLibrary = Object.values(libraries).some(install => install.targetId === entity.id);

        const id = `${kind}:${vnum}:${resetType || 'default'}:${label.toLocaleLowerCase()}:${hasLibrary ? 'lib' : 'plain'}`;
        const existing = summaries.get(id);
        if (existing) {
            summaries.set(id, {
                ...existing,
                count: existing.count + 1,
                hasLibrary: existing.hasLibrary || hasLibrary
            });
        } else {
            summaries.set(id, {
                id, label, count: 1, kind, resetType, lowChance, hasLimits, hasLibrary,
                mob: kind === 'mob' ? (entity as ShaperMobPlacement) : undefined,
                object: kind === 'object' ? (entity as ShaperItemRef) : undefined
            });
        }
    };

    const processItem = (item: ShaperItemRef) => {
        addSummary('object', item.vnum, item.name, item.resetType, item.limit, item);
        item.contents?.forEach(child => processItem(child));
    };

    const processMob = (mob: ShaperMobPlacement) => {
        addSummary('mob', mob.vnum, mob.name, mob.resetType, mob.limit, mob);
        mob.items.forEach(item => processItem(item));
        mob.followers?.forEach(follower => processMob(follower));
    };

    mobs.forEach(mob => processMob(mob));
    objects.forEach(item => processItem(item));

    return [...summaries.values()];
};

const formatBadgeText = (badge: TileBadge): string =>
    `${badge.count > 1 ? `${badge.count}x ` : ''}${badge.label}`;

// --- Component Section ---
export const ShaperRoomTileBadges: React.FC<ShaperRoomTileBadgesProps> = ({
    room,
    commandNodes,
    libraries,
    showComOverlay = false,
    onHover,
    onSelectEntity
}) => {
    const entities = listShaperComRoomEntities(commandNodes, room.id);
    const badges = summarizeEntities(entities.mobs, entities.objects, libraries);
    const annotationCount = room.annotations.length;

    if (badges.length === 0 && annotationCount === 0) return null;

    const visibleBadges = badges.slice(0, MAX_BADGES);
    const overflow = badges.length - visibleBadges.length;
    const label = [
        ...badges.map(badge => `${formatBadgeText(badge)}${badge.hasLibrary ? ' lib' : ''}`),
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
                            badge.hasLibrary ? 'has-library' : '',
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
                                <span className="shaper-room-badge-text">{formatBadgeText(badge)}</span>
                                {badge.hasLibrary && <span className="shaper-room-badge-lib" aria-label="Has library">L</span>}
                            </span>
                        );
                    })}
                    {overflow > 0 && <span className="shaper-room-badge more">+{overflow} more</span>}
                </div>
            )}
        </>
    );
};
