import { useCallback } from 'react';
import { CaptureStage, QuestData } from '../../types';

interface StageInitializerDeps {
    captureStage: React.MutableRefObject<CaptureStage>;
    isSilentCapture: React.MutableRefObject<number>;
    isDrawerCapture: React.MutableRefObject<number>;
    isWaitingForStats: React.MutableRefObject<boolean>;
    isWaitingForEq: React.MutableRefObject<boolean>;
    isWaitingForInv: React.MutableRefObject<boolean>;
    isInventoryOpen: boolean;
    isEquipmentOpen: boolean;
    isCharacterOpen: boolean;
    isPlayersOpen: boolean;
    practice: any;
    quests: QuestData;
    setCharacterInfo: (val: any) => void;
    setWhoList: (val: string[]) => void;
    setWhereList: (val: any[]) => void;
    setPopoverState: (val: any) => void;
    setStatsLines: (val: any[]) => void;
    setPracticeLines: (val: any[]) => void;
    setWhoLines: (val: any[]) => void;
    setWhereLines: (val: any[]) => void;
    finalizeCapture: () => void;
}

export const useStageInitializer = (deps: StageInitializerDeps) => {
    const {
        captureStage, isSilentCapture, isDrawerCapture, isWaitingForStats, isWaitingForEq, isWaitingForInv,
        isInventoryOpen, isEquipmentOpen, isCharacterOpen, isPlayersOpen,
        practice, quests, setCharacterInfo, setWhoList, setWhereList, setPopoverState, setStatsLines, setPracticeLines, setWhoLines, setWhereLines,
        finalizeCapture
    } = deps;

    const initializeStage = useCallback((textOnly: string, lower: string, content: string, contentLower: string, attachedText?: string) => {
        const strippedLower = (attachedText || textOnly).toLowerCase();

        // 1. Practice
        if (lower.includes('skill') && lower.includes('knowledge')) {
            if (practice.isUiRequested || isCharacterOpen || lower.includes('class') || practice.silentSyncPendingRef.current) {
                if (captureStage.current === 'practice') return;
                if (captureStage.current !== 'none') finalizeCapture();
                captureStage.current = 'practice';
                setPracticeLines([]);
                if (practice.isUiRequested || practice.silentSyncPendingRef.current) {
                    if (isSilentCapture.current === 0) isSilentCapture.current = 1;
                }
            }
        }
        else if (lower.includes('practice sessions left')) {
            if (captureStage.current === 'practice') return;
            if (captureStage.current !== 'none') finalizeCapture();
            captureStage.current = 'practice';
            setPracticeLines([]);
            if (isCharacterOpen || practice.silentSyncPendingRef.current) {
                if (isSilentCapture.current === 0) isSilentCapture.current = 1;
            }
        }

        // 2. Quests
        else if (lower.includes('learnt of a quest') || lower.includes('unfinished quest') || lower.includes('not found any new quests') || lower.includes('no unfinished quests') || quests.activeQuests?.some(q => {
            const qName = q.name.toLowerCase().trim().replace(/\s+/g, ' ');
            const lName = lower.trim().replace(/\s+/g, ' ');
            return qName === lName || lName.includes(qName) || qName.includes(lName);
        })) {
            if (captureStage.current === 'quest') return;
            if (captureStage.current !== 'none') finalizeCapture();
            captureStage.current = 'quest';
            if (isCharacterOpen) {
                if (isSilentCapture.current === 0) isSilentCapture.current = 1;
            }
        }

        // 3. Who / Where
        else if (strippedLower === 'who' || strippedLower === 'who:' || strippedLower === 'players' || strippedLower === 'allies' || strippedLower === 'minions' || strippedLower.startsWith("who's online") || strippedLower.startsWith("allies online") || strippedLower.startsWith("minions online")) {
            if (captureStage.current === 'who') return;
            if (captureStage.current !== 'none') finalizeCapture();
            captureStage.current = 'who'; setWhoList([]); setWhoLines([]);
            if (isPlayersOpen) {
                if (isSilentCapture.current === 0) isSilentCapture.current = 1;
            }
        }
        else if ((textOnly.startsWith('Player') && textOnly.includes('Room')) || (textOnly.startsWith('Who') && textOnly.includes('Location'))) {
            if (captureStage.current === 'where') return;
            if (captureStage.current !== 'none') finalizeCapture();
            captureStage.current = 'where'; setWhereList([]); setWhereLines([]);
            if (isPlayersOpen) {
                if (isSilentCapture.current === 0) isSilentCapture.current = 1;
            }
        }

        // 4. Shop
        else if (lower.includes('you can buy:') || lower.includes('items matching') || lower.includes('for sale:')) {
            if (captureStage.current === 'shop') return;
            if (captureStage.current !== 'none') finalizeCapture();
            captureStage.current = 'shop'; practice.shop?.setIsShopListingActive(true);
        }

        // 5. Container
        else if (((contentLower.includes('in the ') || contentLower.includes('in your ') || contentLower.includes('in a ')) && contentLower.endsWith(':') && !contentLower.includes('equipped')) || (contentLower.includes('corpse') && contentLower.includes('contains:'))) {
            if (captureStage.current === 'container') return;
            if (captureStage.current !== 'none') finalizeCapture();
            captureStage.current = 'container';
            // isDrawerCapture logic handled by orchestrator via pending refs
        }

        // 6. Stats / Score
        else if (isWaitingForStats.current && /\b(ob|db|pb|armor|arm|mood|str|exp|level)\b/i.test(lower)) {
            if (captureStage.current === 'stat') return;
            if (captureStage.current !== 'none') finalizeCapture();
            isWaitingForStats.current = false; captureStage.current = 'stat';
            setStatsLines([]);
            if (isCharacterOpen) {
                if (isDrawerCapture.current === 0) isDrawerCapture.current = 1;
            }
        }

        // 7. Equipment
        else if ((isWaitingForEq.current || captureStage.current === 'none') && (/you are using|you are equipped with/i.test(lower) || (isWaitingForEq.current && lower.startsWith('<')))) {
            if (captureStage.current === 'eq') return;
            if (captureStage.current !== 'none') finalizeCapture();
            isWaitingForEq.current = false; captureStage.current = 'eq';
            if (isEquipmentOpen || isCharacterOpen) {
                if (isDrawerCapture.current === 0) isDrawerCapture.current = 1;
            }
        }

        // 8. Inventory
        else if ((isWaitingForInv.current || captureStage.current === 'none') && /you are carrying|your inventory contains|is carrying:|is using:/i.test(lower)) {
            if (captureStage.current === 'inv') return;
            if (captureStage.current !== 'none') finalizeCapture();
            isWaitingForInv.current = false; captureStage.current = 'inv';
            if (isInventoryOpen) {
                if (isDrawerCapture.current === 0) isDrawerCapture.current = 1;
            }
        }

        // 9. Info / Whois / Description
        else if (lower.startsWith('you are a ') || 
                 lower.includes('old.') ||
                 lower.includes('real time') ||
                 lower.includes('ranks you as') ||
                 lower.includes('weigh') ||
                 lower.includes('vision (') ||
                 lower.includes('alertness:') ||
                 (lower.includes('exp:') && (lower.includes('level:') || lower.includes('tnl:'))) || 
                 (lower.includes('str:') && lower.includes('int:')) ||
                 lower.startsWith('you are welcome in the ') ||
                 lower.includes('your equipment weighs ')) {
            if (captureStage.current === 'info') return;
            if (captureStage.current !== 'none') finalizeCapture();
            captureStage.current = 'info';
            setStatsLines([]);
            setCharacterInfo((prev: any) => ({ ...prev, description: '' }));
            if (isCharacterOpen) {
                if (isSilentCapture.current === 0) isSilentCapture.current = 1;
            }
        }
        else if (lower.includes('whois information for') || lower.startsWith('whois:') || lower.startsWith('whois status:')) {
            if (captureStage.current === 'whois') return;
            if (captureStage.current !== 'none') finalizeCapture();
            captureStage.current = 'whois';
            setCharacterInfo((prev: any) => ({ ...prev, whois: '' }));
            if (isCharacterOpen) {
                if (isSilentCapture.current === 0) isSilentCapture.current = 1;
            }
        }
        // NOTE: 'description' captureStage removed — the Room Card handles descriptions
        // via GMCP exclusively. Keeping this stage caused room description lines to silence
        // all subsequent room content (NPCs, exits, items) until the next prompt.
    }, [
        captureStage, isSilentCapture, isDrawerCapture, isWaitingForStats, isWaitingForEq, isWaitingForInv,
        isInventoryOpen, isEquipmentOpen, isCharacterOpen, isPlayersOpen,
        practice, quests, setCharacterInfo, setWhoList, setWhereList, setPopoverState, setStatsLines, setPracticeLines, setWhoLines, setWhereLines,
        finalizeCapture
    ]);

    return { initializeStage };
};
