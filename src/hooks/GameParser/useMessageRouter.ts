/**
 * @file useMessageRouter.ts
 * @description Logic for determining message visibility and routing to various UI logs.
 */

import { useCallback, useRef } from 'react';
import { InlineCategoryConfig } from '../../types';
import type { GmcpOccupant } from '../../types';
import { isEnvironmentEventLine } from '../../utils/environmentEventUtils';
import { hasXmlTag } from '../../utils/xmlTagUtils';
import { getTraitsForName } from '../../utils/inlineActionModel';
import { getPlainRoomObjectDescription, getRoomObjectEntityNames, getTaggedRoomObjectNames, isRoomItemPresenceLine, parseRoomSurfaceItemList } from './roomItemDetection';
import type { Token } from '../../types';

interface RoomItemDetectionOptions {
    isRoomContext?: boolean;
    expectedCaptureType?: string;
    tokens?: Token[];
}

export const isEquipmentObjectContext = (textOnly: string, cleanLine: string, expectedCaptureType?: string) => {
    const decodedLine = cleanLine
        .replace(/&lt;/gi, '<')
        .replace(/&gt;/gi, '>')
        .replace(/&amp;/gi, '&');
    const isRoomDescription = /<room\b/i.test(decodedLine);
    const lowerText = textOnly.toLowerCase();
    const lowerLine = decodedLine.toLowerCase();

    return expectedCaptureType === 'equipment' ||
        expectedCaptureType === 'inventory' ||
        expectedCaptureType === 'container' ||
        /<\s*worn\b[^>]*>/i.test(decodedLine) ||
        (!isRoomDescription && /^<[^>]+>\s*(?:a|an|the|some)?\s*<object\b/i.test(decodedLine)) ||
        lowerText.includes('you are using') ||
        lowerText.includes('you are equipped with') ||
        lowerText.includes('you are carrying') ||
        lowerLine.includes('<header>');
};

export const shouldDetectRoomItemsFromLine = (
    textOnly: string,
    cleanLine: string,
    options: RoomItemDetectionOptions = {}
) => {
    const line = textOnly.trim();
    const isObjectActionResult = /^(?:You|[A-Z][\w' -]+)\s+(?:drop|drops|get|gets|take|takes|pick up|picks up)\s+/i.test(line);
    if (isObjectActionResult) return false;
    const isRoomItemLine = isRoomItemPresenceLine(textOnly, cleanLine, options.isRoomContext);
    if (isEquipmentObjectContext(textOnly, cleanLine, options.expectedCaptureType) && !isRoomItemLine) return false;
    const foodAppearance = line.match(/^(?:a|an|some)\s+(.+?)\s+(?:suddenly\s+)?appears[.!]?$/i);
    if (foodAppearance && getTraitsForName(foodAppearance[1]).some(trait => trait.id === 'trait-food')) return true;
    return isRoomItemLine;
};

export const isVisibleDuringSuppressedCapture = (
    isPromptBoundary: boolean,
    isImportantMessage: boolean,
    isRoomContent: boolean
): boolean => isPromptBoundary || isImportantMessage || isRoomContent;

export const isSelfPositionFeedback = (lower: string): boolean => {
    const line = lower.trim();
    return /^you (?:stand(?: up)?|sit(?: down)?|lie(?: down)?|wake(?: up)?|go to sleep|fall asleep|(?:start|stop) resting|rest)\b/i.test(line)
        || /^you are (?:now )?(?:standing|sitting|resting|sleeping)\b/i.test(line);
};

export const isLiveCharacterStateOrMovement = (lower: string): boolean =>
    /\b(?:panics?|panicked|panicking|flee|flees|fled|fleeing)\b/i.test(lower) ||
    /\b(?:leaves|flees|fled|rides)\b/i.test(lower) ||
    /\b(?:arrives?|arrived|enters?)\b/i.test(lower) ||
    /\b(?:stands? up|sits? down|lies? down|starts? resting|stops? resting|rests?|falls? asleep|wakes? up|goes? to sleep)\b/i.test(lower) ||
    /\bis\s+(?:now\s+)?(?:standing|sitting|resting|sleeping|lying|asleep)\b/i.test(lower);

export const classifyRoutedMessageType = (
    msgType: string,
    textOnly: string,
    lower: string,
    cleanLine: string,
    attachedText: string,
    isMatch: boolean,
    isSpectateMode: boolean,
    isSnoop?: boolean
) => {
    let finalType = msgType;
    const trimmed = textOnly.trim();

    if (lower.startsWith('exits:')) finalType = 'room-exits';
    else if (isSpectateMode && isSnoop && trimmed.startsWith('>') && trimmed.length > 1) finalType = 'snoop-command';
    else if (isMatch && attachedText.length <= 2) finalType = 'prompt';
    else if (hasXmlTag(cleanLine, 'weather')) finalType = 'weather';
    else if (hasXmlTag(cleanLine, 'status')) finalType = 'status-event';
    else if (isEnvironmentEventLine(lower)) finalType = 'weather';
    else if (lower.startsWith('you go ') || lower.includes(' leaves ') || lower.includes(' arrives from ') || lower.includes(' arrived from ') || lower.includes(' flees ') || lower.includes(' fled ') || lower.includes(' panics') || lower.includes(' attempts') || lower.includes('alas, you cannot go that way') || lower.includes('there is no exit')) finalType = 'move';

    return finalType;
};

interface MessageRouterDeps {
    capture: import('../../types/capture').CaptureController;
    setWhoList: (val: string[] | ((prev: string[]) => string[])) => void;
    setWhereList: (val: any[] | ((prev: any[]) => any[])) => void;
    setRoomItems: React.Dispatch<React.SetStateAction<import('../../types').GmcpOccupant[]>>;
    registerEntity: (id: string, name: string, location: import('../../types').EntityLocation, category?: string) => import('../../types').GameEntity;
    setCharacterInfo: (val: any) => void;
    setDiscoveredItems: (val: string[] | ((prev: string[]) => string[])) => void;
    extractNoun: (name: string) => string;
    ansiConvert: any;
    playerPosition?: string;
    inlineCategories?: InlineCategoryConfig[];
    isSpectateMode: boolean;
}

export const useMessageRouter = (deps: MessageRouterDeps) => {
    const pendingRoomSurfaceListRef = useRef<{ surface: string; pendingItem: string } | null>(null);
    const {
        capture,
        setWhoList, setWhereList, setRoomItems, registerEntity, setDiscoveredItems, extractNoun,
        playerPosition, isSpectateMode
    } = deps;

    const determineVisibility = useCallback((lower: string, isSnoop?: boolean) => {
        // --- Snoop Visibility ---
        if (isSnoop) return true;

        // --- Sleeping Suppression ---
        if (playerPosition === 'sleeping') {
            const isWeatherOrLighting = isEnvironmentEventLine(lower);
            if (isWeatherOrLighting) return false;
        }

        return true;
    }, [playerPosition]);

    const routeMessage = useCallback((msgType: string, textOnly: string, lower: string, cleanLine: string, attachedText: string, isMatch: boolean, isSnoop?: boolean) => {
        return classifyRoutedMessageType(msgType, textOnly, lower, cleanLine, attachedText, isMatch, isSpectateMode, isSnoop);
    }, [isSpectateMode]);

    const normalizeRoomObjectName = useCallback((name: string) => {
        return name
            .replace(/\x1b\[[0-9;]*m/g, '')
            .replace(/<\/?[a-zA-Z][a-zA-Z0-9_-]*(?:\s+[^>]*)?>/g, '')
            .replace(/^(?:a|an|the|some)\s+/i, '')
            .replace(/\s+/g, ' ')
            .replace(/[.!?]$/g, '')
            .trim();
    }, []);

    const detectItemsInRoom = useCallback((textOnly: string, cleanLine: string, isDrawerHiding: boolean, options: RoomItemDetectionOptions = {}) => {
        const plainObjectCandidate = getPlainRoomObjectDescription(textOnly);
        const directSurfaceList = parseRoomSurfaceItemList(textOnly);
        let surfaceItems = directSurfaceList?.items || [];
        let isSurfaceContinuation = false;
        if (directSurfaceList) {
            pendingRoomSurfaceListRef.current = directSurfaceList.pendingItem
                ? { surface: directSurfaceList.surface, pendingItem: directSurfaceList.pendingItem }
                : null;
        } else if (pendingRoomSurfaceListRef.current) {
            const hasCharacterEntity = options.tokens?.some(token => token.type === 'entity'
                && ['character', 'player', 'npc', 'enemy', 'neutral', 'ally', 'mount'].includes(token.metadata?.kind?.toLowerCase() || ''));
            const hasRoomEntity = options.tokens?.some(token => token.type === 'entity'
                && (token.metadata?.kind?.toLowerCase() === 'room' || token.metadata?.category?.toLowerCase() === 'cat-room'));
            const continuation = textOnly.trim();
            if (!hasCharacterEntity && !hasRoomEntity && continuation
                && !/^(?:exits?:|obvious exits:)/i.test(continuation)) {
                const pending = pendingRoomSurfaceListRef.current;
                const continuedList = parseRoomSurfaceItemList(`On the ${pending.surface}, there are ${pending.pendingItem} ${continuation}`);
                if (continuedList) {
                    isSurfaceContinuation = true;
                    surfaceItems = continuedList.items;
                    pendingRoomSurfaceListRef.current = continuedList.pendingItem
                        ? { surface: pending.surface, pendingItem: continuedList.pendingItem }
                        : null;
                }
            } else {
                pendingRoomSurfaceListRef.current = null;
            }
        }
        const candidateName = plainObjectCandidate ? normalizeRoomObjectName(plainObjectCandidate).toLowerCase() : '';
        const matchesCharacterEntity = Boolean(candidateName && options.tokens?.some(token => {
            if (token.type !== 'entity') return false;
            const kind = token.metadata?.kind?.toLowerCase();
            const category = token.metadata?.category?.toLowerCase();
            const isCharacter = ['character', 'player', 'npc', 'enemy', 'neutral', 'ally', 'mount'].includes(kind || '')
                || ['cat-npc', 'cat-mount', 'cat-enemy', 'cat-neutral', 'cat-ally'].includes(category || '');
            if (!isCharacter) return false;
            const characterName = normalizeRoomObjectName(token.content).toLowerCase();
            return characterName && (candidateName.includes(characterName) || characterName.includes(candidateName));
        }));
        const plainRoomObjectName = matchesCharacterEntity ? null : plainObjectCandidate;
        const appearanceMatch = textOnly.trim().match(/^(?:a|an|some)\s+(.+?)\s+(?:suddenly\s+)?appears[.!]?$/i);
        const isFoodAppearance = Boolean(appearanceMatch && getTraitsForName(appearanceMatch[1]).some(trait => trait.id === 'trait-food'));
        const isRoomItemLine = isSurfaceContinuation || directSurfaceList !== null
            || isRoomItemPresenceLine(textOnly, cleanLine, options.isRoomContext);
        const taggedObjects = isRoomItemLine ? getTaggedRoomObjectNames(cleanLine) : [];
        const tokenObjects = isRoomItemLine ? getRoomObjectEntityNames(options.tokens || []) : [];
        // A `look` response is commonly handled as a capture session. Corpses
        // are nevertheless loot sources, so retain them in roomItems even while
        // that response is being captured; otherwise `get <item> ` has no way
        // to offer the corpse as a source. Food spawn messages also describe
        // new room targets and must survive an overlapping capture.
        const containsCorpse = /\bcorpse\b/i.test(textOnly) || /<object\b[^>]*>[^<]*\bcorpse\b/i.test(cleanLine);
        if ((capture.hasSession() && !containsCorpse && !isFoodAppearance && !plainRoomObjectName && surfaceItems.length === 0 && taggedObjects.length === 0 && tokenObjects.length === 0) || isDrawerHiding) return;
        if (!isSurfaceContinuation && !shouldDetectRoomItemsFromLine(textOnly, cleanLine, options)) return;

        const hasIncompleteSurfaceChunk = Boolean(directSurfaceList?.pendingItem) || isSurfaceContinuation;
        const observedTaggedObjects = hasIncompleteSurfaceChunk ? [] : taggedObjects.length > 0 ? taggedObjects : tokenObjects;
        const objects: string[] = observedTaggedObjects.map(name => normalizeRoomObjectName(name) || 'object');

        surfaceItems.forEach(name => {
            const normalizedName = normalizeRoomObjectName(name).toLowerCase();
            if (normalizedName && !objects.some(objectName => normalizeRoomObjectName(objectName).toLowerCase() === normalizedName)) {
                objects.push(name);
            }
        });

        // Some room descriptions include visible objects in plain prose, with
        // no <object> tag. Preserve those targets for Get and command menus.
        if (plainRoomObjectName && !objects.some(name => normalizeRoomObjectName(name).toLowerCase() === normalizeRoomObjectName(plainRoomObjectName).toLowerCase())) {
            objects.push(normalizeRoomObjectName(plainRoomObjectName));
        }

        // Createfood reports its new mushroom as a plain-text appearance event,
        // rather than as a room-description object. Track it so Eat can target it.
        if (isFoodAppearance && appearanceMatch) {
            objects.push(normalizeRoomObjectName(appearanceMatch[1]));
        }

        const skipNouns = /^(here|to|at|is|are|the|some|you|it|from|with|in|on|by)$/i;
        const objectCounts = new Map<string, { name: string; count: number }>();
        objects.forEach(objName => {
            const noun = extractNoun(objName);
            if (noun && noun.length > 2 && !skipNouns.test(noun)) {
                setDiscoveredItems(prev => Array.from(new Set([...prev, noun])));
                const key = normalizeRoomObjectName(objName).toLowerCase();
                const current = objectCounts.get(key);
                objectCounts.set(key, { name: objName, count: (current?.count || 0) + 1 });
            }
        });
        if (objectCounts.size > 0) {
            setRoomItems(prev => {
                const next = [...prev];
                objectCounts.forEach(({ name, count }, normalizedName) => {
                    const currentCount = next.filter(item => normalizeRoomObjectName(
                        typeof item === 'string' ? item : item.name || item.short || ''
                    ).toLowerCase() === normalizedName).length;
                    for (let occurrence = currentCount; occurrence < count; occurrence += 1) {
                        const id = `roomitems:${normalizedName}:${Date.now()}:${occurrence}:${Math.random().toString(36).slice(2, 7)}`;
                        next.push({ id, objectId: id, name, short: name });
                        registerEntity(id, name, 'room', 'cat-room-object');
                    }
                });
                return next;
            });
        }

        return objects;
    }, [
        capture, extractNoun, normalizeRoomObjectName,
        setDiscoveredItems, setRoomItems, registerEntity
    ]);

    const getRoomItemName = useCallback((item: GmcpOccupant) => {
        return normalizeRoomObjectName(item.name || item.short || item.shortdesc || item.keyword || '');
    }, [normalizeRoomObjectName]);

    const trackRoomItemAction = useCallback((textOnly: string, cleanLine: string, isDrawerHiding: boolean) => {
        if (isDrawerHiding) return;

        const objectMatches = Array.from(cleanLine.matchAll(/<object\b[^>]*>(.*?)<\/object>/gis));
        if (objectMatches.length === 0) return;

        const line = textOnly.trim();
        if (!line || line.includes(':')) return;

        const dropMatch = line.match(/^(?:You|[A-Z][\w' -]+)\s+(?:drop|drops)\s+/i);
        if (dropMatch) {
            // The action tracker moves the player's selected inventory instance
            // into the room. Keep this fallback for other visible actors only.
            if (/^You\s+drop\s+/i.test(line)) return;
            objectMatches.forEach((objectMatch, index) => {
                const objName = normalizeRoomObjectName(objectMatch[1]) || 'object';
                const noun = extractNoun(objName);
                if (noun) setDiscoveredItems(prev => Array.from(new Set([...prev, noun])));

                const id = `roomitems:${objName}:${Date.now()}:${index}:${Math.random().toString(36).slice(2, 7)}`;
                const newItem: GmcpOccupant = { name: objName, short: objName, id, objectId: id };
                registerEntity(id, objName, 'room', 'cat-room-object');
                setRoomItems(prev => [...prev, newItem]);
            });
            return;
        }

        const getMatch = line.match(/^(?:You|[A-Z][\w' -]+)\s+(?:get|gets|take|takes|pick up|picks up)\s+/i);
        if (!getMatch || /\s+from\s+/i.test(line)) return;
        // The action tracker transfers the player's selected room occurrence
        // into inventory, preserving its client object ID.
        if (/^You\s+(?:get|take|pick up)\s+/i.test(line)) return;

        setRoomItems(prev => {
            if (prev.length === 0) return prev;

            const next = [...prev];
            objectMatches.forEach(objectMatch => {
                if (next.length === 0) return;

                const objName = normalizeRoomObjectName(objectMatch[1]) || 'object';
                const targetName = objName.toLowerCase();
                const targetNoun = extractNoun(objName).toLowerCase();
                const matchIndex = next.findIndex(item => {
                    const itemName = getRoomItemName(item).toLowerCase();
                    const itemNoun = extractNoun(itemName).toLowerCase();
                    return itemName === targetName ||
                        itemName.includes(targetName) ||
                        targetName.includes(itemName) ||
                        (targetNoun.length > 0 && itemNoun === targetNoun);
                });

                // A remote character may act on an item that is not in this
                // room snapshot (for example, an item inside a container).
                // Never remove an unrelated last room object as a fallback.
                if (matchIndex >= 0) next.splice(matchIndex, 1);
            });
            return next;
        });
    }, [
        extractNoun, getRoomItemName, normalizeRoomObjectName,
        registerEntity, setDiscoveredItems, setRoomItems
    ]);

    return { determineVisibility, routeMessage, detectItemsInRoom, trackRoomItemAction };
};
