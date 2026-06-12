/**
 * @file ShaperHoverCard.tsx
 * @description Hover tooltip card for Shaper rooms, mobs, objects, and doors.
 */

import type {
    ShaperCommandLimit,
    ShaperExitDraft,
    ShaperItemRef,
    ShaperLibraryInstall,
    ShaperMobPlacement,
    ShaperRoomDraft
} from '../model/shaperTypes';

// Discriminated union of everything that can surface a hover card.
export type ShaperHoverContent =
    | { kind: 'room'; room: ShaperRoomDraft }
    | { kind: 'mob'; mob: ShaperMobPlacement }
    | { kind: 'object'; object: ShaperItemRef }
    | { kind: 'door'; exit: ShaperExitDraft };

interface ShaperHoverCardProps {
    content: ShaperHoverContent;
    libraries: Record<string, ShaperLibraryInstall>;
}

const DIR_LABELS: Record<string, string> = {
    n: 'North', e: 'East', s: 'South', w: 'West', u: 'Up', d: 'Down'
};

const formatLimit = (limit: ShaperCommandLimit | null | undefined): string | null => {
    if (!limit) return null;
    const parts: string[] = [];
    if (limit.world != null) parts.push(`w${limit.world}`);
    if (limit.zone != null) parts.push(`z${limit.zone}`);
    if (limit.room != null) parts.push(`r${limit.room}`);
    const base = parts.length > 0 ? parts.join(' ') : '∞';
    return limit.chancePercent && limit.chancePercent !== 100 ? `${base} · ${limit.chancePercent}%` : base;
};

const librariesFor = (
    libraries: Record<string, ShaperLibraryInstall>,
    targetType: ShaperLibraryInstall['targetType'],
    targetId: string
): ShaperLibraryInstall[] =>
    Object.values(libraries).filter(lib => lib.targetType === targetType && lib.targetId === targetId);

const Chip: React.FC<{ tone?: string; children: React.ReactNode }> = ({ tone, children }) => (
    <span className={`shaper-hovercard-chip${tone ? ` ${tone}` : ''}`}>{children}</span>
);

// --- Component Section ---
export const ShaperHoverCard: React.FC<ShaperHoverCardProps> = ({ content, libraries }) => {
    if (content.kind === 'room') {
        const { room } = content;
        const libs = librariesFor(libraries, 'room', room.id);
        return (
            <>
                <div className="shaper-hovercard-name">{room.name || 'Unnamed room'}</div>
                {room.description && <div className="shaper-hovercard-desc">{room.description}</div>}
                <div className="shaper-hovercard-chips">
                    {room.sector && <Chip tone="sector">{room.sector}</Chip>}
                    {room.flags.map(flag => <Chip key={flag} tone="flag">{flag}</Chip>)}
                    {libs.map(lib => <Chip key={lib.id} tone="lib">{lib.name}</Chip>)}
                </div>
            </>
        );
    }

    if (content.kind === 'mob') {
        const { mob } = content;
        const libs = librariesFor(libraries, 'mobile', mob.id);
        const limit = formatLimit(mob.limit);
        return (
            <>
                <div className="shaper-hovercard-name">{mob.name || `mob ${mob.vnum}`}</div>
                <div className="shaper-hovercard-chips">
                    {mob.resetType && <Chip tone="mob">{mob.resetType}</Chip>}
                    {limit && <Chip tone="limit">{limit}</Chip>}
                    {mob.items.length > 0 && <Chip>{mob.items.length} eq</Chip>}
                    {mob.followers && mob.followers.length > 0 && <Chip>{mob.followers.length} follower{mob.followers.length > 1 ? 's' : ''}</Chip>}
                    {libs.map(lib => <Chip key={lib.id} tone="lib">{lib.name}</Chip>)}
                </div>
            </>
        );
    }

    if (content.kind === 'object') {
        const { object } = content;
        const libs = librariesFor(libraries, 'object', object.id);
        const limit = formatLimit(object.limit);
        return (
            <>
                <div className="shaper-hovercard-name">{object.name || `object ${object.vnum}`}</div>
                <div className="shaper-hovercard-chips">
                    {object.resetType && <Chip tone="object">{object.resetType}</Chip>}
                    {object.resetDetail && <Chip>{object.resetDetail}</Chip>}
                    {limit && <Chip tone="limit">{limit}</Chip>}
                    {object.contents && object.contents.length > 0 && <Chip>{object.contents.length} inside</Chip>}
                    {libs.map(lib => <Chip key={lib.id} tone="lib">{lib.name}</Chip>)}
                </div>
            </>
        );
    }

    const { exit } = content;
    const flags = exit.doorFlags ?? [];
    return (
        <>
            <div className="shaper-hovercard-name">{exit.doorName || 'Door'}</div>
            <div className="shaper-hovercard-chips">
                <Chip tone="door">{DIR_LABELS[exit.direction] || exit.direction}</Chip>
                {flags.map(flag => <Chip key={flag} tone="flag">{flag}</Chip>)}
                {exit.keyMode && exit.keyMode !== 'none' && <Chip tone="lib">key: {exit.keyMode}</Chip>}
                {exit.keyVnum && <Chip tone="vnum">#{exit.keyVnum}</Chip>}
            </div>
        </>
    );
};
