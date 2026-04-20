import { useCallback } from 'react';
import { CaptureStage, InlineCategoryConfig, GmcpOccupant, EntityLocation, GameEntity } from '../../types';
import { getCategoryForName } from '../../utils/categorizationUtils';

interface MessageRouterDeps {
    captureStage: React.MutableRefObject<CaptureStage>;
    isSilentCapture: React.MutableRefObject<number>;
    isDrawerCapture: React.MutableRefObject<number>;
    captureOwnerDrawer: React.MutableRefObject<'none' | 'stats' | 'equipment' | 'inventory' | 'character' | 'players'>;
    isInventoryOpen: boolean;
    isEquipmentOpen: boolean;
    isCharacterOpen: boolean;
    isStatsOpen: boolean;
    isPlayersOpen: boolean;
    isWaitingForInv: React.MutableRefObject<boolean>;
    isWaitingForEq: React.MutableRefObject<boolean>;
    isWaitingForStats: React.MutableRefObject<boolean>;
    isWaitingForInfo: React.MutableRefObject<boolean>;
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
        captureStage, isSilentCapture, isDrawerCapture, captureOwnerDrawer,
        isInventoryOpen, isEquipmentOpen, isCharacterOpen, isStatsOpen, isPlayersOpen,
        isWaitingForInv, isWaitingForEq, isWaitingForStats, isWaitingForInfo,
        setWhoList, setWhereList, setRoomItems, registerEntity, setCharacterInfo, setDiscoveredItems, extractNoun, ansiConvert,
        playerPosition, inlineCategories
    } = deps;

    const determineVisibility = useCallback((lower: string, isImportantMessage: boolean, isRoomContent: boolean, isRoomDescription: boolean, isEndPrompt: boolean, isNewbieMode: boolean, isRoomWindow?: boolean) => {
        // --- Sleeping Suppression ---
        // If the player is sleeping, suppress weather and lighting updates
        if (playerPosition === 'sleeping') {
            const isWeatherOrLighting = /starts to (rain|snow)|it is (raining|snowing|foggy)|rain stops|snow stops|clouds disappear|starts to fog|fog has (thinned|thickened|lifted|dissipated|disappeared)|thick fog covers|disappears into the fog|flash of lightning|lightning illuminates/i.test(lower);
            if (isWeatherOrLighting) return false;
        }

        let isDrawerHiding = false;

        const stage = captureStage.current as any;
        // Use captureOwnerDrawer (stamped when the capture started) so that
        // visibility decisions are stable even if the user switches drawers
        // while a capture is in flight.
        const owner = captureOwnerDrawer.current;
        const ownerIsInventory = owner === 'inventory';
        const ownerIsEquipment = owner === 'equipment';
        const ownerIsCharacter = owner === 'character';
        const ownerIsStats = owner === 'stats';
        const ownerIsPlayers = owner === 'players';

        if (stage !== 'none') {
            if (stage === 'inv' && (ownerIsInventory || isInventoryOpen)) isDrawerHiding = true;
            else if (stage === 'eq' && (ownerIsInventory || ownerIsEquipment || ownerIsCharacter || isInventoryOpen || isEquipmentOpen || isCharacterOpen)) isDrawerHiding = true;
            else if (stage === 'stat' && (ownerIsStats || ownerIsCharacter || isStatsOpen || isCharacterOpen)) isDrawerHiding = true;
            else if (['info', 'quest', 'whois'].includes(stage) && (ownerIsCharacter || isCharacterOpen)) isDrawerHiding = true;
            else if (stage === 'practice' && (ownerIsCharacter || isCharacterOpen || isSilentCapture.current > 0 || isDrawerCapture.current > 0)) isDrawerHiding = true;
            else if (stage === 'container' && (isDrawerCapture.current > 0 || isSilentCapture.current > 0)) isDrawerHiding = true;
            else if (['who', 'where'].includes(stage) && (ownerIsPlayers || isPlayersOpen)) isDrawerHiding = true;
            else if (stage === 'shop' || stage === 'help') isDrawerHiding = true;
        } else if (isSilentCapture.current > 0 || isDrawerCapture.current > 0) {
            if (/you are carrying|your inventory contains/i.test(lower) && (ownerIsInventory || isInventoryOpen)) isDrawerHiding = true;
            if ((/you are (using|equipped with)/i.test(lower) || /ob:|armor:|mood:|str:|exp:|level:/i.test(lower) || /practice sessions left/i.test(lower)) && (ownerIsCharacter || isCharacterOpen)) isDrawerHiding = true;
            if (/ob:|armor:|mood:|str:|exp:|level:/i.test(lower) && (ownerIsStats || isStatsOpen)) isDrawerHiding = true;
            if ((lower === 'who' || lower === 'where') && (ownerIsPlayers || isPlayersOpen)) isDrawerHiding = true;
            if (isEndPrompt) {
                 if ((ownerIsInventory || ownerIsEquipment || isInventoryOpen || isEquipmentOpen) && (isWaitingForInv.current || isWaitingForEq.current)) isDrawerHiding = true;
                 if ((ownerIsCharacter || isCharacterOpen) && (isWaitingForStats.current || isWaitingForEq.current || isWaitingForInfo.current || captureStage.current === 'practice' || captureStage.current === 'info' || captureStage.current === 'quest' || captureStage.current === 'shop')) isDrawerHiding = true;
                 if ((ownerIsStats || isStatsOpen) && isWaitingForStats.current) isDrawerHiding = true;
                 if ((ownerIsPlayers || isPlayersOpen) && captureStage.current === 'none') isDrawerHiding = true;
            }
            // Fallback: if silent commands are in flight (isSilentCapture > 0)
            // but no capture stage has started, this is likely a stale response
            // from a previous drawer whose waiting flags were cleared on switch.
            // Suppress it so it doesn't leak into the log. Important messages
            // and room content still pass through via the isDrawerHiding check below.
            if (!isDrawerHiding && isSilentCapture.current > 0 && owner !== 'none') {
                isDrawerHiding = true;
            }
        }

        // --- Final Visibility Calculation ---
        // 1. If currently capturing for an open drawer, hide unless it's a critical message/room name
        if (isDrawerHiding) {
            return isImportantMessage || isRoomContent;
        }

        // 3. Spacing: Always show truly empty lines to preserve game pacing/formatting
        // unless we are specifically in a capture mode or hiding drawer content.
        if (lower === '' && !isDrawerHiding && isSilentCapture.current === 0 && isDrawerCapture.current === 0 && captureStage.current === 'none') {
            return true;
        }

        // 2. Normal visibility: not silent OR it's a special high-priority message
        // If Newbie Mode is OFF, we are much more lenient about showing descriptions and room content
        // to ensure the classic experience isn't "flickery".
        const classicBypass = (!isNewbieMode && isRoomWindow);
        return (isSilentCapture.current === 0) || isImportantMessage || isRoomContent || isRoomDescription || classicBypass;
    }, [captureStage, isSilentCapture, isDrawerCapture, isInventoryOpen, isEquipmentOpen, isCharacterOpen, isStatsOpen, isPlayersOpen, isWaitingForInv, isWaitingForEq, isWaitingForStats, isWaitingForInfo, playerPosition]);

    const routeMessage = useCallback((msgType: string, textOnly: string, lower: string, cleanLine: string, attachedText: string, isMatch: boolean) => {
        let finalType = msgType;
        const stage = captureStage.current;

        const trimmed = textOnly.trim();
        if (stage === 'who' && trimmed !== 'who:' && trimmed.toLowerCase() !== 'allies' && trimmed.toLowerCase() !== 'minions' && !trimmed.startsWith('---')) finalType = 'who-list';
        else if (stage === 'where' && !trimmed.startsWith('Player') && !trimmed.startsWith('Who') && !trimmed.startsWith('---')) finalType = 'where-list';
        else if (stage === 'eq') finalType = 'equipment-list';
        else if (stage === 'inv') finalType = 'inventory-list';
        else if (lower.startsWith('exits:')) finalType = 'room-exits';
        // In spectate mode, ANY line starting with '>' is a commanded action from the spectated player
        else if (deps.isSpectateMode && trimmed.startsWith('>') && trimmed.length > 1) finalType = 'snoop-command';
        else if (isMatch && attachedText.length <= 2) finalType = 'prompt';
        else if (lower.startsWith('you go ') || lower.includes(' leaves ') || lower.includes(' arrives from ') || lower.includes(' arrived from ') || lower.includes(' flees ') || lower.includes(' fled ') || lower.includes(' panics') || lower.includes(' attempts') || lower.includes('alas, you cannot go that way') || lower.includes('there is no exit')) finalType = 'move';

        if (finalType === 'who-list') {
            const nameMatch = textOnly.match(/\s*((?:[<\[].*?[>\]]\s*)*)([A-Z\u00C0-\u00DE][a-zA-Z\u00C0-\u00FF]+)/);
            if (nameMatch && nameMatch[2].length > 1 && nameMatch[2].toLowerCase() !== 'players') {
                // IMPORTANT: Do NOT trim() here, as leading spaces are used for alignment
                const htmlDisplay = ansiConvert.toHtml(cleanLine);
                setWhoList(prev => [...prev, `${htmlDisplay}|${nameMatch[2]}`]);
            }
        } else if (finalType === 'where-list') {
            const parts = textOnly.trim().split(/\s{2,}/);
            const name = parts[0]?.trim().replace(/^-\s*/, '');
            if (name && /^[A-Z\u00C0-\u00DE]/.test(name) && name.length > 1) setWhereList(prev => [...prev, { name, room: parts.slice(1).join(' ').replace(/^-\s*/, '').trim() || '' }]);
        } else if (stage === 'whois') setCharacterInfo((prev: any) => ({ ...prev, whois: (prev.whois || '') + textOnly + '\n' }));

        return finalType;
    }, [captureStage, setWhoList, setWhereList, setCharacterInfo, ansiConvert]);

    const detectItemsInRoom = useCallback((textOnly: string, cleanLine: string, isDrawerHiding: boolean) => {
        if (captureStage.current !== 'none' || isDrawerHiding) return;

        // --- MUME Specific Signal Identification (&355 / ANSI Color 159) ---
        // Look for \x1b[38;5;159m sequences which precede objects
        const objects: string[] = [];
        const objectMatchRe = /\x1b\[38(?:;5;159|;5;159;1|;1;38;5;159|;5;159;[0-9]+|;[0-9]+;38;5;159)m([^\x1b]+)/g;
        // Simpler regex to catch variations of SGR sequences containing 38;5;159
        // Example: \x1b[1;38;5;159m
        let match;
        const colorSequenceMatcher = /\x1b\[[0-9;]*38;5;159[0-9;]*m([^\x1b]+)/g;
        while ((match = colorSequenceMatcher.exec(cleanLine)) !== null) {
            const name = match[1].trim();
            if (name.length > 1 && !name.includes(' - ') && !name.includes('Obvious exits')) {
                objects.push(name);
            }
        }

        // --- Generic Fallback (e.g. A carrot is here) ---
        if (objects.length === 0) {
            // Refined regex to ensure the object name itself isn't just a filler word
            const itemMatch = textOnly.match(/^(?:A|An|The|Some|a|an|the|some)\s+(.+?)\s+(?:is|are)\s+here\s*[.!]?$/i);
            if (itemMatch) {
                const potentialName = itemMatch[1].trim();
                // Avoid matching "You are here" (if snoop prefix missed) or "It is here"
                if (!/^(you|it|they|he|she|to|at|here)$/i.test(potentialName)) {
                    objects.push(potentialName);
                }
            }
        }

        // --- Add Identified Objects to Tracker ---
        const skipNouns = /^(here|to|at|is|are|the|some|you|it|from|with|in|on|by)$/i;
        objects.forEach(objName => {
            const noun = extractNoun(objName);
            if (noun && noun.length > 2 && !skipNouns.test(noun)) {
                // Add to discovered items for highlighter
                setDiscoveredItems(prev => Array.from(new Set([...prev, noun])));
                
                // Add to roomItems for tracking
                setRoomItems(prev => {
                    const alreadyExists = prev.some(item => 
                        (typeof item === 'string' ? item : item.name) === objName || 
                        (typeof item === 'object' && item.name === objName)
                    );
                    if (alreadyExists) return prev;
                    
                    const newItem = { name: objName, short: objName, id: `roomitems:${objName}` };
                    // Ensure it is registered so clicking the tag works with accurate theme and buttons
                    const specCat = getCategoryForName(objName, deps.inlineCategories);
                    registerEntity(`roomitems:${objName}`, objName, 'roomitems', specCat || 'inline-obj-room');
                    
                    return [...prev, newItem];
                });
            }
        });
    }, [captureStage, extractNoun, setDiscoveredItems, setRoomItems, registerEntity]);

    return { determineVisibility, routeMessage, detectItemsInRoom };
};
