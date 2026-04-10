import { useCallback } from 'react';
import { CaptureStage } from '../../types';

interface MessageRouterDeps {
    captureStage: React.MutableRefObject<CaptureStage>;
    isSilentCapture: React.MutableRefObject<number>;
    isDrawerCapture: React.MutableRefObject<number>;
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
}

export const useMessageRouter = (deps: MessageRouterDeps) => {
    const {
        captureStage, isSilentCapture, isDrawerCapture,
        isInventoryOpen, isEquipmentOpen, isCharacterOpen, isStatsOpen, isPlayersOpen,
        isWaitingForInv, isWaitingForEq, isWaitingForStats, isWaitingForInfo,
        setWhoList, setWhereList, setRoomItems, registerEntity, setCharacterInfo, setDiscoveredItems, extractNoun, ansiConvert,
        playerPosition
    } = deps;

    const determineVisibility = useCallback((lower: string, isImportantMessage: boolean, isRoomName: boolean, isRoomDescription: boolean, isEndPrompt: boolean) => {
        // --- Sleeping Suppression ---
        // If the player is sleeping, suppress weather and lighting updates
        if (playerPosition === 'sleeping') {
            const isWeatherOrLighting = /starts to (rain|snow)|it is (raining|snowing|foggy)|rain stops|snow stops|clouds disappear|starts to fog|fog has (thinned|thickened|lifted|dissipated|disappeared)|thick fog covers|disappears into the fog|flash of lightning|lightning illuminates/i.test(lower);
            if (isWeatherOrLighting) return false;
        }

        let isDrawerHiding = false;
        
        const stage = captureStage.current as any;
        if (stage !== 'none') {
            if (stage === 'inv' && isInventoryOpen) isDrawerHiding = true;
            else if (stage === 'eq' && (isInventoryOpen || isEquipmentOpen || isCharacterOpen)) isDrawerHiding = true;
            else if (stage === 'stat' && (isStatsOpen || isCharacterOpen)) isDrawerHiding = true;
            else if (['info', 'quest', 'whois'].includes(stage) && isCharacterOpen) isDrawerHiding = true;
            else if (stage === 'practice' && (isCharacterOpen || isSilentCapture.current > 0 || isDrawerCapture.current > 0)) isDrawerHiding = true;
            else if (stage === 'container' && (isDrawerCapture.current > 0 || isSilentCapture.current > 0)) isDrawerHiding = true;
            else if (['who', 'where'].includes(stage) && isPlayersOpen) isDrawerHiding = true;
            else if (stage === 'shop') isDrawerHiding = true;
        } else if (isSilentCapture.current > 0 || isDrawerCapture.current > 0) {
            if (/you are carrying|your inventory contains/i.test(lower) && isInventoryOpen) isDrawerHiding = true;
            if ((/you are (using|equipped with)/i.test(lower) || /ob:|armor:|mood:|str:|exp:|level:/i.test(lower) || /practice sessions left/i.test(lower)) && isCharacterOpen) isDrawerHiding = true;
            if (/ob:|armor:|mood:|str:|exp:|level:/i.test(lower) && isStatsOpen) isDrawerHiding = true;
            if ((lower === 'who' || lower === 'where') && isPlayersOpen) isDrawerHiding = true;
            if (isEndPrompt) {
                 if ((isInventoryOpen || isEquipmentOpen) && (isWaitingForInv.current || isWaitingForEq.current)) isDrawerHiding = true;
                 if (isCharacterOpen && (isWaitingForStats.current || isWaitingForEq.current || isWaitingForInfo.current || captureStage.current === 'practice' || captureStage.current === 'info' || captureStage.current === 'quest' || captureStage.current === 'shop')) isDrawerHiding = true;
                 if (isStatsOpen && isWaitingForStats.current) isDrawerHiding = true;
                 if (isPlayersOpen && captureStage.current === 'none') isDrawerHiding = true;
            }
        }

        // --- Final Visibility Calculation ---
        // 1. If currently capturing for an open drawer, hide unless it's a critical message/room name
        if (isDrawerHiding) {
            return isImportantMessage || isRoomName;
        }

        // 2. Normal visibility: not silent OR it's a special high-priority message
        return (isSilentCapture.current === 0) || isImportantMessage || isRoomName || isRoomDescription;
    }, [captureStage, isSilentCapture, isDrawerCapture, isInventoryOpen, isEquipmentOpen, isCharacterOpen, isStatsOpen, isPlayersOpen, isWaitingForInv, isWaitingForEq, isWaitingForStats, isWaitingForInfo, playerPosition]);

    const routeMessage = useCallback((msgType: string, textOnly: string, lower: string, cleanLine: string, attachedText: string, isMatch: boolean) => {
        let finalType = msgType;
        const stage = captureStage.current;

        const trimmed = textOnly.trim();
        if (stage === 'who' && trimmed !== 'who:' && trimmed.toLowerCase() !== 'allies' && trimmed.toLowerCase() !== 'minions' && !trimmed.startsWith('---')) finalType = 'who-list';
        else if (stage === 'where' && !trimmed.startsWith('Player') && !trimmed.startsWith('Who') && !trimmed.startsWith('---')) finalType = 'where-list';
        // NOTE: 'description' stage routing removed — the Room Card handles room descriptions via GMCP.
        // Keeping this caused all post-description room content (NPCs, exits, items) to be swallowed.
        else if (stage === 'eq') finalType = 'equipment-list';
        else if (stage === 'inv') finalType = 'inventory-list';
        else if (lower.startsWith('exits:')) finalType = 'room-exits';
        else if (isMatch && attachedText.length <= 2) finalType = 'prompt';
        else if (lower.startsWith('you go ') || lower.includes(' leaves ') || lower.includes(' arrives from ') || lower.includes('alas, you cannot go that way') || lower.includes('there is no exit')) finalType = 'move';

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
            const itemMatch = textOnly.match(/^(?:A|An|The|Some|a|an|the|some)\s+(.*?)\s+(?:is|are)\s+here\s*[.!]?$/i);
            if (itemMatch) {
                objects.push(itemMatch[1]);
            }
        }

        // --- Add Identified Objects to Tracker ---
        objects.forEach(objName => {
            const noun = extractNoun(objName);
            if (noun && noun.length > 2) {
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
                    // Ensure it is registered so clicking the tag works
                    registerEntity(`roomitems:${objName}`, objName, 'roomitems', 'inline-obj-room');
                    
                    return [...prev, newItem];
                });
            }
        });
    }, [captureStage, extractNoun, setDiscoveredItems, setRoomItems, registerEntity]);

    return { determineVisibility, routeMessage, detectItemsInRoom };
};
