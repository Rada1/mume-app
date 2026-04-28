/**
 * @file useMessageRouter.ts
 * @description Logic for determining message visibility and routing to various UI logs.
 */

import { useCallback } from 'react';
import { InlineCategoryConfig, DrawerType } from '../../types';
import type { GmcpOccupant } from '../../types';

interface MessageRouterDeps {
    capture: import('../../types/capture').CaptureController;
    drawer: DrawerType;
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
    const {
        capture,
        drawer,
        setWhoList, setWhereList, setRoomItems, registerEntity, setDiscoveredItems, extractNoun,
        playerPosition, isSpectateMode
    } = deps;

    const determineVisibility = useCallback((lower: string, isImportantMessage: boolean, isRoomContent: boolean, isRoomDescription: boolean, isEndPrompt: boolean, isNewbieMode: boolean, cleanLine: string, isRoomWindow?: boolean, isSnoop?: boolean) => {
        // --- Snoop Visibility ---
        if (isSnoop) return true;

        // --- Sleeping Suppression ---
        if (playerPosition === 'sleeping') {
            const isWeatherOrLighting = /starts to (rain|snow)|it is (raining|snowing|foggy)|rain stops|snow stops|clouds disappear|starts to fog|fog has (thinned|thickened|lifted|dissipated|disappeared)|thick fog covers|disappears into the fog|flash of lightning|lightning illuminates/i.test(lower);
            if (isWeatherOrLighting) return false;
        }

        let isDrawerHiding = false;
        const stage = capture.getActiveType();
        const fromDrawer = capture.isFromDrawer();
        const isSilent = capture.isSilent();

        // Check if current capture session should hide this line from the main log.
        if (capture.hasSession()) {
            const drawerMatchesCapture =
                ((stage === 'inventory' || stage === 'equipment') && drawer === 'equipment') ||
                (['stats', 'info', 'quests', 'whois', 'practice'].includes(stage) && drawer === 'character') ||
                (['who', 'where'].includes(stage) && drawer === 'players');

            if (stage === 'equipment' && drawer === 'character') isDrawerHiding = true;
            else if (drawerMatchesCapture) isDrawerHiding = true;
            else if (fromDrawer) isDrawerHiding = true;
            else if (stage === 'practice' && isSilent) isDrawerHiding = true;
            else if (stage === 'container' && (fromDrawer || isSilent)) isDrawerHiding = true;
            else if (stage === 'score' || stage === 'help') isDrawerHiding = true;
            
            // Safety: if silent capture is active but no specific hiding logic triggered yet
            if (!isDrawerHiding && isSilent) isDrawerHiding = true;
        }

        // --- Final Visibility Calculation ---
        if (isDrawerHiding) {
            return isImportantMessage || isRoomContent;
        }

        // Spacing: Always show truly empty lines to preserve game pacing
        if (lower === '' && !capture.hasSession()) {
            return true;
        }

        // Bypassing silence for who/where lists to ensure they appear in the log when manually typed
        const isWhoWhereList = (stage === 'who' || stage === 'where');
        const classicBypass = (!isNewbieMode && isRoomWindow);
        const isVisibleResult = !isSilent || isWhoWhereList || isImportantMessage || isRoomContent || isRoomDescription || classicBypass;
        
        return isVisibleResult;
    }, [capture, drawer, playerPosition]);

    const routeMessage = useCallback((msgType: string, textOnly: string, lower: string, cleanLine: string, attachedText: string, isMatch: boolean, isSnoop?: boolean) => {
        let finalType = msgType;
        const trimmed = textOnly.trim();
        
        if (lower.startsWith('exits:')) finalType = 'room-exits';
        else if (isSpectateMode && isSnoop && (trimmed.startsWith('>') || (trimmed.startsWith('[') && trimmed.endsWith(']')) || (trimmed.startsWith('(') && trimmed.endsWith(')'))) && trimmed.length > 1) finalType = 'snoop-command';
        else if (isMatch && attachedText.length <= 2) finalType = 'prompt';
        else if (lower.startsWith('you go ') || lower.includes(' leaves ') || lower.includes(' arrives from ') || lower.includes(' arrived from ') || lower.includes(' flees ') || lower.includes(' fled ') || lower.includes(' panics') || lower.includes(' attempts') || lower.includes('alas, you cannot go that way') || lower.includes('there is no exit')) finalType = 'move';

        return finalType;
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

    const detectItemsInRoom = useCallback((textOnly: string, cleanLine: string, isDrawerHiding: boolean) => {
        if (capture.hasSession() || isDrawerHiding) return;

        const objects: string[] = [];
        const objectMatcher = /<object\b[^>]*>(.*?)<\/object>/gis;
        let match;
        while ((match = objectMatcher.exec(cleanLine)) !== null) {
            objects.push(normalizeRoomObjectName(match[1]) || 'object');
        }

        const skipNouns = /^(here|to|at|is|are|the|some|you|it|from|with|in|on|by)$/i;
        objects.forEach(objName => {
            const noun = extractNoun(objName);
            if (noun && noun.length > 2 && !skipNouns.test(noun)) {
                setDiscoveredItems(prev => Array.from(new Set([...prev, noun])));
                setRoomItems(prev => {
                    const normalizedObjName = normalizeRoomObjectName(objName).toLowerCase();
                    const alreadyExists = prev.some(item => 
                        normalizeRoomObjectName(typeof item === 'string' ? item : item.name || item.short || '').toLowerCase() === normalizedObjName
                    );
                    if (alreadyExists) return prev;
                    
                    const newItem = { name: objName, short: objName, id: `roomitems:${objName}` };
                    registerEntity(`roomitems:${objName}`, objName, 'room', 'inline-obj-room');
                    return [...prev, newItem];
                });
            }
        });

        return objects;
    }, [capture, extractNoun, normalizeRoomObjectName, setDiscoveredItems, setRoomItems, registerEntity]);

    const getRoomItemName = useCallback((item: GmcpOccupant) => {
        return normalizeRoomObjectName(item.name || item.short || item.shortdesc || item.keyword || '');
    }, [normalizeRoomObjectName]);

    const trackRoomItemAction = useCallback((textOnly: string, cleanLine: string, isDrawerHiding: boolean) => {
        if (capture.hasSession() || isDrawerHiding) return;

        const objectMatches = Array.from(cleanLine.matchAll(/<object\b[^>]*>(.*?)<\/object>/gis));
        if (objectMatches.length === 0) return;

        const line = textOnly.trim();
        if (!line || line.includes(':')) return;

        const dropMatch = line.match(/^(?:You|[A-Z][\w' -]+)\s+(?:drop|drops)\s+/i);
        if (dropMatch) {
            objectMatches.forEach((objectMatch, index) => {
                const objName = normalizeRoomObjectName(objectMatch[1]) || 'object';
                const noun = extractNoun(objName);
                if (noun) setDiscoveredItems(prev => Array.from(new Set([...prev, noun])));

                const id = `roomitems:${objName}:${Date.now()}:${index}:${Math.random().toString(36).slice(2, 7)}`;
                const newItem: GmcpOccupant = { name: objName, short: objName, id };
                registerEntity(id, objName, 'room', 'inline-obj-room');
                setRoomItems(prev => [...prev, newItem]);
            });
            return;
        }

        const getMatch = line.match(/^(?:You|[A-Z][\w' -]+)\s+(?:get|gets|take|takes|pick up|picks up)\s+/i);
        if (!getMatch || /\s+from\s+/i.test(line)) return;

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

                next.splice(matchIndex >= 0 ? matchIndex : next.length - 1, 1);
            });
            return next;
        });
    }, [
        capture, extractNoun, getRoomItemName, normalizeRoomObjectName,
        registerEntity, setDiscoveredItems, setRoomItems
    ]);

    return { determineVisibility, routeMessage, detectItemsInRoom, trackRoomItemAction };
};
