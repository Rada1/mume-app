/**
 * @file useMessageRouter.ts
 * @description Logic for determining message visibility and routing to various UI logs.
 */

import { useCallback } from 'react';
import { InlineCategoryConfig, DrawerType } from '../../types';

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

    const detectItemsInRoom = useCallback((textOnly: string, cleanLine: string, isDrawerHiding: boolean) => {
        if (capture.hasSession() || isDrawerHiding) return;

        const objects: string[] = [];
        const colorSequenceMatcher = /\x1b\[[0-9;]*38;5;159[0-9;]*m([^\x1b]+)/g;
        let match;
        while ((match = colorSequenceMatcher.exec(cleanLine)) !== null) {
            const name = match[1].trim();
            if (name.length > 1 && !name.includes(' - ') && !name.includes('Obvious exits')) {
                objects.push(name);
            }
        }

        if (objects.length === 0) {
            const itemMatch = textOnly.match(/^(?:A|An|The|Some|a|an|the|some)\s+(.+?)\s+(?:is|are)\s+(?:here|mounted here|floating(?: in the air)? here|lying here|resting here|sitting here)\s*[.!]?$/i) ||
                textOnly.match(/^(?:A|An|The|Some|a|an|the|some)\s+(.+?)\s+stands\s+here\s*[.!]?$/i);
            if (itemMatch) {
                const potentialName = itemMatch[1].trim();
                if (!/^(you|it|they|he|she|to|at|here)$/i.test(potentialName)) {
                    objects.push(potentialName);
                }
            }
        }

        const skipNouns = /^(here|to|at|is|are|the|some|you|it|from|with|in|on|by)$/i;
        objects.forEach(objName => {
            const noun = extractNoun(objName);
            if (noun && noun.length > 2 && !skipNouns.test(noun)) {
                setDiscoveredItems(prev => Array.from(new Set([...prev, noun])));
                setRoomItems(prev => {
                    const alreadyExists = prev.some(item => 
                        (typeof item === 'string' ? item : item.name) === objName
                    );
                    if (alreadyExists) return prev;
                    
                    const newItem = { name: objName, short: objName, id: `roomitems:${objName}` };
                    registerEntity(`roomitems:${objName}`, objName, 'room', 'inline-obj-room');
                    return [...prev, newItem];
                });
            }
        });

        return objects;
    }, [capture, extractNoun, setDiscoveredItems, setRoomItems, registerEntity]);

    return { determineVisibility, routeMessage, detectItemsInRoom };
};
