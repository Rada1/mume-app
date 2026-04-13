/**
 * @file useStageManager.ts
 * @description Manages the lifecycle of capture stages for game data (inventory, equipment, stats, etc.).
 */

import { useCallback } from 'react';
import { CaptureStage, DrawerLine, GameEntity, EntityLocation, MessageType, PopoverState } from '../../types';

export interface StageManagerDeps {
    captureStage: React.MutableRefObject<CaptureStage>;
    isDrawerCapture: React.MutableRefObject<number>;
    isSilentCapture: React.MutableRefObject<number>;
    isWaitingForStats: React.MutableRefObject<boolean>;
    isWaitingForEq: React.MutableRefObject<boolean>;
    isWaitingForInv: React.MutableRefObject<boolean>;
    isWaitingForInfo: React.MutableRefObject<boolean>;
    addDiagnosticLog?: (msg: string) => void;
    addMessage: (type: MessageType, text: string, ...args: any[]) => void;
    setEqLines: React.Dispatch<React.SetStateAction<DrawerLine[]>>;
    setInventoryLines: React.Dispatch<React.SetStateAction<DrawerLine[]>>;
    setStatsLines: React.Dispatch<React.SetStateAction<DrawerLine[]>>;
    setInfoLines: React.Dispatch<React.SetStateAction<DrawerLine[]>>;
    setScoreLines: React.Dispatch<React.SetStateAction<DrawerLine[]>>;
    setQuestLines: React.Dispatch<React.SetStateAction<DrawerLine[]>>;
    setPracticeLines: React.Dispatch<React.SetStateAction<DrawerLine[]>>;
    setWhoLines: React.Dispatch<React.SetStateAction<DrawerLine[]>>;
    setWhereLines: React.Dispatch<React.SetStateAction<DrawerLine[]>>;
    setEntities: React.Dispatch<React.SetStateAction<Record<string, GameEntity>>>;
    registerEntity: (id: string, name: string, location: import('../../types').EntityLocation, category?: string) => import('../../types').GameEntity;
    practice: any;
    shop: any;
    quests: any;
    finalizeQuests: () => void;
    tempEqRef: React.MutableRefObject<DrawerLine[]>;
    tempInvRef: React.MutableRefObject<DrawerLine[]>;
    tempStatsRef: React.MutableRefObject<DrawerLine[]>;
    tempScoreRef: React.MutableRefObject<DrawerLine[]>;
    tempInfoRef: React.MutableRefObject<DrawerLine[]>;
    tempPracticeRef: React.MutableRefObject<DrawerLine[]>;
    tempQuestRef: React.MutableRefObject<DrawerLine[]>;
    tempWhoRef: React.MutableRefObject<DrawerLine[]>;
    tempWhereRef: React.MutableRefObject<DrawerLine[]>;
    tempEntitiesRef: React.MutableRefObject<Record<string, GameEntity>>;
}

export function useStageManager(deps: StageManagerDeps) {
    const {
        captureStage,
        isDrawerCapture,
        isSilentCapture,
        isWaitingForStats,
        isWaitingForEq,
        isWaitingForInv, isWaitingForInfo,
        addDiagnosticLog,
        addMessage,
        setPopoverState,
        setEqLines,
        setInventoryLines,
        setStatsLines,
        setInfoLines,
        setScoreLines,
        setQuestLines,
        setPracticeLines,
        setWhoLines,
        setWhereLines,
        setEntities,
        practice,
        shop,
        quests,
        finalizeQuests,
        tempEqRef,
        tempInvRef,
        tempStatsRef,
        tempScoreRef,
        tempInfoRef,
        tempPracticeRef,
        tempQuestRef,
        tempWhoRef,
        tempWhereRef,
        tempEntitiesRef
    } = deps;

    const finalizeCapture = useCallback((targetStage?: CaptureStage) => {
        const currentStage = captureStage.current as CaptureStage;

        // If targetStage is provided, only finalize if we match
        if (targetStage && currentStage !== targetStage) return false;

        // --- Silent Capture Fallback ---
        // We handle this before the early 'none' return so background commands (which have no stage)
        // are correctly cleaned up when a prompt arrives.
        if (currentStage === 'none' && isSilentCapture.current > 0) {
            isSilentCapture.current--; // Decrement background silence on a prompt
            return false;
        }

        if (currentStage === 'none') {
            // Clear stale waiting flags when a prompt arrives but no capture stage was
            // initialized. This happens when e.g. "score" output doesn't match the
            // expected stats header pattern — isWaitingForStats stays true forever,
            // blocking room name detection in useRoomParser.
            if (isWaitingForStats.current) {
                console.log('[StageManager] Clearing stale isWaitingForStats flag on prompt');
                isWaitingForStats.current = false;
            }
            if (isWaitingForEq.current) isWaitingForEq.current = false;
            if (isWaitingForInv.current) isWaitingForInv.current = false;
            if (isWaitingForInfo.current) isWaitingForInfo.current = false;
            return false;
        }

        const stagesToTerminate: CaptureStage[] = ['who', 'where', 'inv', 'eq', 'stat', 'container', 'shop', 'shop-detail', 'practice', 'description', 'whois', 'info', 'quest'];
        if (stagesToTerminate.includes(currentStage)) {
            const eqLen = tempEqRef.current.length;
            const invLen = tempInvRef.current.length;
            
            addDiagnosticLog?.(`Finalizing ${currentStage} capture. Eq: ${eqLen}, Inv: ${invLen}`);
            
            if (currentStage === 'practice') {
                const suppressPracticeLog = isDrawerCapture.current > 0 || isSilentCapture.current > 0 || practice.silentSyncPendingRef.current;
                practice.finalizePractice(
                    suppressPracticeLog ? undefined : addMessage, 
                    suppressPracticeLog ? undefined : setPopoverState
                );
                practice.setIsPracticeActive(false);
                practice.setIsUiRequested(false);
            } else if (currentStage === 'shop') {
                shop.finalizeShop(addMessage, setPopoverState);
            } else if (currentStage === 'shop-detail') {
                shop.finalizeShopDetail(setPopoverState);
            } else if (currentStage === 'quest') {
                setQuestLines([...tempQuestRef.current]);
                tempQuestRef.current = [];
                finalizeQuests();
            } else if (currentStage === 'who') {
                setWhoLines([...tempWhoRef.current]);
                tempWhoRef.current = [];
            } else if (currentStage === 'where') {
                setWhereLines([...tempWhereRef.current]);
                tempWhereRef.current = [];
            } else if (currentStage === 'stat') {
                setStatsLines([...tempStatsRef.current]);
                tempStatsRef.current = [];
            } else if (currentStage === 'score') {
                setScoreLines([...tempScoreRef.current]);
                tempScoreRef.current = [];
            } else if (currentStage === 'info') {
                setInfoLines([...tempInfoRef.current]);
                tempInfoRef.current = [];
            } else if (currentStage === 'practice') {
                setPracticeLines([...tempPracticeRef.current]);
                tempPracticeRef.current = [];
            } else if (currentStage === 'eq' || currentStage === 'inv' || currentStage === 'container') {
                if (currentStage === 'eq') {
                    setEqLines([...tempEqRef.current]);
                    tempEqRef.current = [];
                } else if (currentStage === 'inv') {
                    setInventoryLines([...tempInvRef.current]);
                    tempInvRef.current = [];
                }
                
                // Flush entities to registry
                const loc = currentStage as EntityLocation;
                setEntities(prev => {
                    const next = { ...prev };
                    // Clear old location data
                    Object.keys(next).forEach(id => {
                        if (next[id].location === loc) delete next[id];
                    });
                    // Add new data
                    Object.assign(next, tempEntitiesRef.current);
                    return next;
                });
                tempEntitiesRef.current = {};
            }

            captureStage.current = 'none';
            isDrawerCapture.current = 0;
            // Decrement silent capture
            if (isSilentCapture.current > 0) isSilentCapture.current--;
            return true;
        }

        // Final fallback for silent capture
        if (isSilentCapture.current > 0) {
            isSilentCapture.current--;
        }

        return false;
    }, [
        captureStage,
        isDrawerCapture,
        isSilentCapture,
        isWaitingForStats,
        isWaitingForEq,
        isWaitingForInv, isWaitingForInfo,
        addDiagnosticLog,
        addMessage,
        setPopoverState,
        setEqLines,
        setInventoryLines,
        setEntities,
        practice,
        shop,
        finalizeQuests,
        tempEqRef,
        tempInvRef,
        tempEntitiesRef
    ]);

    return { finalizeCapture };
}
