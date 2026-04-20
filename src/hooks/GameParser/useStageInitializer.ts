import { useCallback } from 'react';
import { CaptureStage, QuestData, DrawerLine } from '../../types';

interface StageInitializerDeps {
    captureStage: React.MutableRefObject<CaptureStage>;
    isSilentCapture: React.MutableRefObject<number>;
    isDrawerCapture: React.MutableRefObject<number>;
    isWaitingForStats: React.MutableRefObject<boolean>;
    isWaitingForEq: React.MutableRefObject<boolean>;
    isWaitingForInv: React.MutableRefObject<boolean>;
    isWaitingForInfo: React.MutableRefObject<boolean>;
    captureOwnerDrawer: React.MutableRefObject<'none' | 'stat' | 'eq' | 'inv' | 'practice' | 'who' | 'where' | 'container' | 'stats' | 'equipment' | 'inventory' | 'character' | 'players'>;
    isInventoryOpen: boolean;
    isEquipmentOpen: boolean;
    isCharacterOpen: boolean;
    isStatsOpen: boolean;
    isPlayersOpen: boolean;
    practice: any;
    quests: QuestData;
    setCharacterInfo: (val: any) => void;
    setWhoList: (val: string[]) => void;
    setWhereList: (val: any[]) => void;
    setPopoverState: (val: any) => void;
    setScoreLines: (val: DrawerLine[]) => void;
    setStatsLines: (val: DrawerLine[]) => void;
    setInfoLines: (val: DrawerLine[]) => void;
    tempStatsRef: React.MutableRefObject<DrawerLine[]>;
    tempScoreRef: React.MutableRefObject<DrawerLine[]>;
    tempInfoRef: React.MutableRefObject<DrawerLine[]>;
    tempPracticeRef: React.MutableRefObject<DrawerLine[]>;
    tempQuestRef: React.MutableRefObject<DrawerLine[]>;
    tempWhoRef: React.MutableRefObject<DrawerLine[]>;
    tempWhereRef: React.MutableRefObject<DrawerLine[]>;
    help: any;
    finalizeCapture: () => void;
    executeCommand: (cmd: string, silent?: boolean, isSystem?: boolean) => void;
    isMobile: boolean;
}

export const useStageInitializer = (deps: StageInitializerDeps) => {
    const {
        captureStage, isSilentCapture, isDrawerCapture, isWaitingForStats, isWaitingForEq, isWaitingForInv, isWaitingForInfo, captureOwnerDrawer,
        isInventoryOpen, isEquipmentOpen, isCharacterOpen, isStatsOpen, isPlayersOpen,
        practice, quests, setCharacterInfo, setWhoList, setWhereList, setPopoverState,
        setScoreLines, setStatsLines, setInfoLines,
        tempStatsRef, tempScoreRef, tempInfoRef, tempPracticeRef, tempQuestRef, tempWhoRef, tempWhereRef,
        help,
        finalizeCapture,
        executeCommand,
        isMobile
    } = deps;

    // Determine which drawer is currently open (used to stamp captureOwnerDrawer)
    const resolveOwner = (): 'none' | 'stats' | 'equipment' | 'inventory' | 'character' | 'players' => {
        if (isCharacterOpen) return 'character';
        if (isStatsOpen) return 'stats';
        if (isEquipmentOpen) return 'equipment';
        if (isInventoryOpen) return 'inventory';
        if (isPlayersOpen) return 'players';
        return 'none';
    };

    const startStage = (stage: CaptureStage) => {
        if (stage === 'help') help.setIsHelpActive(true);
        captureStage.current = stage;
        // Stamp which drawer initiated this capture so visibility decisions
        // remain stable even if the user switches drawers before it finalizes.
        captureOwnerDrawer.current = resolveOwner();
    };

    const initializeStage = useCallback((textOnly: string, lower: string, content: string, contentLower: string, attachedText?: string) => {
        const strippedLower = (attachedText || textOnly).trim().toLowerCase();
        
        // 1. Practice
        if ((lower.includes('skill') && lower.includes('knowledge')) || lower.includes('can teach you') || (captureStage.current === 'practice' && (lower.includes('knowledge:') || lower.includes('difficulty:')))) {
            if (captureStage.current === 'practice') return;
            if (captureStage.current !== 'none') finalizeCapture();
            startStage('practice');
            tempPracticeRef.current = [];

            // Only silence if explicitly requested by UI refresh or system sync.
            // Manual commands from the log remain visible.
            if (practice.isUiRequested || practice.silentSyncPendingRef.current) {
                if (isSilentCapture.current === 0) isSilentCapture.current = 1;
            }
        }
        else if (lower.includes('practice sessions left')) {
            if (captureStage.current === 'practice') return;
            if (captureStage.current !== 'none') finalizeCapture();
            startStage('practice');
            tempPracticeRef.current = [];
            if (practice.isUiRequested || practice.silentSyncPendingRef.current) {
                if (isSilentCapture.current === 0) isSilentCapture.current = 1;
            }
        }

        // 2. Quests
        else if (((lower.includes('learnt of') && lower.includes('quest')) || lower.includes('unfinished quest') || lower.includes('not found any new quests') || lower.includes('no unfinished quests') || quests.activeQuests?.some(q => {
            const qName = q.name.toLowerCase().trim().replace(/\s+/g, ' ');
            const lName = lower.trim().replace(/\s+/g, ' ');
            return qName === lName || lName.includes(qName) || qName.includes(lName);
        })) && captureStage.current !== 'practice') {
            if (captureStage.current === 'quest') return;
            if (captureStage.current !== 'none') finalizeCapture();
            startStage('quest');
            tempQuestRef.current = [];
            if (isCharacterOpen) {
                if (isSilentCapture.current === 0) isSilentCapture.current = 1;
            }
        }

        // 3. Who / Where
        else if (strippedLower === 'who' || strippedLower === 'who:' || strippedLower === 'players' || strippedLower === 'allies' || strippedLower === 'minions' || strippedLower.startsWith("who's online") || strippedLower.startsWith("allies online") || strippedLower.startsWith("minions online")) {
            if (captureStage.current === 'who') return;
            if (captureStage.current !== 'none') finalizeCapture();
            startStage('who');
            tempWhoRef.current = [];
            if (isPlayersOpen) {
                if (isSilentCapture.current === 0) isSilentCapture.current = 1;
            }
            // Still clear name lists immediately as they are processed differently
            if (isSilentCapture.current === 0 && isDrawerCapture.current === 0) {
                setWhoList([]); 
            }
        }
        else if ((textOnly.startsWith('Player') && textOnly.includes('Room')) || (textOnly.startsWith('Who') && textOnly.includes('Location'))) {
            if (captureStage.current === 'where') return;
            if (captureStage.current !== 'none') finalizeCapture();
            startStage('where');
            tempWhereRef.current = [];
            if (isPlayersOpen) {
                if (isSilentCapture.current === 0) isSilentCapture.current = 1;
            }
            if (isSilentCapture.current === 0 && isDrawerCapture.current === 0) {
                setWhereList([]); 
            }
        }

        // 4. Shop
        else if (
            lower.includes('you can buy:') ||
            lower.includes('items matching') ||
            lower.includes('for sale:') ||
            // Fallback: numbered item line with currency price (catches shops whose
            // header we don't recognize — MUME sometimes omits or changes the header).
            /^\s*\d+\.\s+.+\s+(?:up to|for)\s+.*\b(?:silver|copper|gold|bronze|mithril|tin|iron)\b/i.test(textOnly)
        ) {
            if (captureStage.current === 'shop') return;
            if (captureStage.current !== 'none') finalizeCapture();
            startStage('shop');
            if (practice.shop?.setIsShopListingActive) practice.shop.setIsShopListingActive(true);
            
            // Trigger gold check right when shop listing starts
            executeCommand('info %g', true, true);
        }

        // 5. Container
        else if (((contentLower.includes('in the ') || contentLower.includes('in your ') || contentLower.includes('in a ')) && contentLower.endsWith(':') && !contentLower.includes('equipped')) || (contentLower.includes('corpse') && contentLower.includes('contains:'))) {
            if (captureStage.current === 'container') return;
            if (captureStage.current !== 'none') finalizeCapture();
            startStage('container');
        }

        // 6. Stats / Score / Spell Speed / Affects
        else if (isWaitingForStats.current && /\b(stat|score|st|sc|at|ob|db|pb|armor|armour|arm|mood|str|int|wis|dex|con|wil|exp|level|hits|mana|moves|spell|speed|vision|gold|qp|tnl)\b/i.test(lower)) {
            const isScoreCommand = /\d+\/\d+ hits, \d+\/\d+ mana, and \d+\/\d+ moves/i.test(lower);
            const targetStage = isScoreCommand ? 'score' : 'stat';
            
            if (captureStage.current === targetStage) return;
            if (captureStage.current !== 'none') finalizeCapture();
            
            isWaitingForStats.current = false;
            startStage(targetStage);
            tempStatsRef.current = [];
            tempScoreRef.current = [];
            
            if (isCharacterOpen || isStatsOpen) {
                if (isDrawerCapture.current === 0) isDrawerCapture.current = 1;
            }

            // Only clear UI if entirely necessary (foreground refresh)
            if (isSilentCapture.current === 0 && isDrawerCapture.current === 0) {
                if (typeof setScoreLines === 'function') setScoreLines([]);
                if (typeof setStatsLines === 'function') setStatsLines([]);
            }
        }

        // 7. Equipment
        else if ((isWaitingForEq.current || captureStage.current === 'none') && (/you are using|you are equipped with/i.test(lower) || (isWaitingForEq.current && lower.startsWith('<')))) {
            if (captureStage.current === 'eq') return;
            if (captureStage.current !== 'none') finalizeCapture();
            isWaitingForEq.current = false; startStage('eq');
            if (isEquipmentOpen || isCharacterOpen) {
                if (isDrawerCapture.current === 0) isDrawerCapture.current = 1;
            }
        }

        // 8. Inventory
        else if ((isWaitingForInv.current || captureStage.current === 'none') && /you are carrying|your inventory contains|is carrying:|is using:/i.test(lower)) {
            if (captureStage.current === 'inv') return;
            if (captureStage.current !== 'none') finalizeCapture();
            isWaitingForInv.current = false; startStage('inv');
            if (isInventoryOpen) {
                if (isDrawerCapture.current === 0) isDrawerCapture.current = 1;
            }
        }

        // 9. Info / Whois / Description
        else if ((isWaitingForInfo.current || isCharacterOpen) && (
                 lower.includes(', a level ') || 
                 lower.startsWith('you are a ') ||
                 lower.includes('old.') ||
                 lower.includes('real time') ||
                 lower.includes('ranks you as') ||
                 lower.includes('weigh') ||
                 lower.includes('vision (') ||
                 lower.includes('alertness:') ||
                 (lower.includes('exp:') && (lower.includes('level:') || lower.includes('tnl:'))) || 
                 (lower.includes('str:') && lower.includes('int:')) ||
                 lower.startsWith('you are welcome in the ') ||
                 lower.includes('your equipment weighs ')
        )) {
            if (captureStage.current === 'info') return;
            if (captureStage.current !== 'none') finalizeCapture();
            startStage('info');
            tempInfoRef.current = [];
            
            if (isCharacterOpen || isStatsOpen) {
                if (isSilentCapture.current === 0) isSilentCapture.current = 1;
            }

            // Foreground clear
            if (isSilentCapture.current === 0 && isDrawerCapture.current === 0) {
                if (typeof setInfoLines === 'function') setInfoLines([]);
            }
            setCharacterInfo((prev: any) => ({ ...prev, description: '' }));
        }
        else if (lower.includes('whois information for') || lower.startsWith('whois:') || lower.startsWith('whois status:')) {
            if (captureStage.current === 'whois') return;
            if (captureStage.current !== 'none') finalizeCapture();
            startStage('whois');
            setCharacterInfo((prev: any) => ({ ...prev, whois: '' }));
            if (isCharacterOpen) {
                if (isSilentCapture.current === 0) isSilentCapture.current = 1;
            }
        }
        // 10. Help System
        else if (
            lower.startsWith('help on ') || 
            lower.startsWith('mume help system') || 
            lower.startsWith('topic:') ||
            (help.isUiRequested && (
                /^[A-Z0-9\s]+(\s*,\s*[A-Z0-9\s]+)*$/.test(textOnly.trim()) ||
                lower.startsWith('no help exists for') ||
                lower.includes('matches for help on')
            ))
        ) {
            if (captureStage.current === 'help') return;
            if (captureStage.current !== 'none') finalizeCapture();
            if (isMobile) {
                startStage('help');
            }
        }
    }, [
        captureStage, isSilentCapture, isDrawerCapture, isWaitingForStats, isWaitingForEq, isWaitingForInv, isWaitingForInfo, captureOwnerDrawer,
        isInventoryOpen, isEquipmentOpen, isCharacterOpen, isStatsOpen, isPlayersOpen,
        practice, quests, setCharacterInfo, setWhoList, setWhereList, setPopoverState, 
        setScoreLines, setStatsLines, setInfoLines,
        tempStatsRef, tempScoreRef, tempInfoRef, tempPracticeRef, tempQuestRef, tempWhoRef, tempWhereRef,
        help, // Important dependency

        finalizeCapture
    ]);

    return { initializeStage };
};
