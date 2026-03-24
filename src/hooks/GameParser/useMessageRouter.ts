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
    setWhoList: (val: string[] | ((prev: string[]) => string[])) => void;
    setWhereList: (val: any[] | ((prev: any[]) => any[])) => void;
    setCharacterInfo: (val: any) => void;
    setDiscoveredItems: (val: string[] | ((prev: string[]) => string[])) => void;
    extractNoun: (name: string) => string;
    ansiConvert: any;
}

export const useMessageRouter = (deps: MessageRouterDeps) => {
    const {
        captureStage, isSilentCapture, isDrawerCapture,
        isInventoryOpen, isEquipmentOpen, isCharacterOpen, isStatsOpen, isPlayersOpen,
        isWaitingForInv, isWaitingForEq, isWaitingForStats,
        setWhoList, setWhereList, setCharacterInfo, setDiscoveredItems, extractNoun, ansiConvert
    } = deps;

    const determineVisibility = useCallback((textOnly: string, lower: string, isImportantMessage: boolean, isRoomName: boolean, isEndPrompt: boolean) => {
        let isDrawerHiding = false;
        
        if (textOnly.includes('*** Return:') || textOnly.includes('*** [Hit Return to continue]')) {
            isDrawerHiding = true;
        }

        const stage = captureStage.current as any;
        if (stage !== 'none') {
            if (stage === 'inv' && isInventoryOpen) isDrawerHiding = true;
            else if (stage === 'eq' && (isInventoryOpen || isEquipmentOpen || isCharacterOpen)) isDrawerHiding = true;
            else if (stage === 'stat' && (isStatsOpen || isCharacterOpen)) isDrawerHiding = true;
            else if (stage === 'practice') isDrawerHiding = true;
            else if (['info', 'quest', 'description', 'whois'].includes(stage) && isCharacterOpen) isDrawerHiding = true;
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
                 if (isCharacterOpen && (isWaitingForStats.current || isWaitingForEq.current || captureStage.current === 'practice' || captureStage.current === 'info' || captureStage.current === 'quest' || captureStage.current === 'shop')) isDrawerHiding = true;
                 if (isStatsOpen && isWaitingForStats.current) isDrawerHiding = true;
                 if (isPlayersOpen && captureStage.current === 'none') isDrawerHiding = true;
            }
        }

        return (isSilentCapture.current === 0 && !isDrawerHiding) || isImportantMessage || isRoomName;
    }, [captureStage, isSilentCapture, isDrawerCapture, isInventoryOpen, isEquipmentOpen, isCharacterOpen, isStatsOpen, isPlayersOpen, isWaitingForInv, isWaitingForEq, isWaitingForStats]);

    const routeMessage = useCallback((msgType: string, textOnly: string, lower: string, cleanLine: string, attachedText: string, isMatch: boolean) => {
        let finalType = msgType;
        const stage = captureStage.current;

        const trimmed = textOnly.trim();
        if (stage === 'who' && trimmed !== 'who:' && trimmed.toLowerCase() !== 'allies' && trimmed.toLowerCase() !== 'minions' && !trimmed.startsWith('---')) finalType = 'who-list';
        else if (stage === 'where' && !trimmed.startsWith('Player') && !trimmed.startsWith('Who') && !trimmed.startsWith('---')) finalType = 'where-list';
        else if (stage === 'description') finalType = 'room-description';
        else if (stage === 'eq') finalType = 'equipment-list';
        else if (stage === 'inv') finalType = 'inventory-list';
        else if (lower.startsWith('exits:')) finalType = 'room-exits';
        else if (isMatch && attachedText.length <= 2) finalType = 'prompt';

        if (finalType === 'who-list') {
            const nameMatch = textOnly.match(/\s*((?:[<\[].*?[>\]]\s*)*)([A-Z\u00C0-\u00DE][a-zA-Z\u00C0-\u00FF]+)/);
            if (nameMatch && nameMatch[2].length > 1) {
                // IMPORTANT: Do NOT trim() here, as leading spaces are used for alignment
                const htmlDisplay = ansiConvert.toHtml(cleanLine);
                setWhoList(prev => [...prev, `${htmlDisplay}|${nameMatch[2]}`]);
            }
        } else if (finalType === 'where-list') {
            const parts = textOnly.trim().split(/\s{2,}/);
            const name = parts[0]?.trim().replace(/^-\s*/, '');
            if (name && /^[A-Z\u00C0-\u00DE]/.test(name) && name.length > 1) setWhereList(prev => [...prev, { name, room: parts.slice(1).join(' ').replace(/^-\s*/, '').trim() || '' }]);
        } else if (stage === 'whois') setCharacterInfo((prev: any) => ({ ...prev, whois: (prev.whois || '') + textOnly + '\n' }));
        else if (stage === 'description') setCharacterInfo((prev: any) => ({ ...prev, description: (prev.description || '') + textOnly + '\n' }));

        return finalType;
    }, [captureStage, setWhoList, setWhereList, setCharacterInfo, ansiConvert]);

    const detectItemsInRoom = useCallback((textOnly: string, isDrawerHiding: boolean) => {
        if (captureStage.current !== 'none' || isDrawerHiding) return;
        const itemMatch = textOnly.match(/^(?:A|An|The|Some)\s+(.*?)\s+(?:is|are)\s+here\s*[.!]?$/i);
        if (itemMatch) {
            const noun = extractNoun(itemMatch[1]);
            if (noun && noun.length > 2) setDiscoveredItems(prev => Array.from(new Set([...prev, noun])));
        }
    }, [captureStage, extractNoun, setDiscoveredItems]);

    return { determineVisibility, routeMessage, detectItemsInRoom };
};
