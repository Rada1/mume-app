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
    addDiagnosticLog?: (msg: string) => void;
    addMessage: (type: MessageType, text: string, ...args: any[]) => void;
    setPopoverState: React.Dispatch<React.SetStateAction<PopoverState | null>>;
    setEqLines: React.Dispatch<React.SetStateAction<DrawerLine[]>>;
    setInventoryLines: React.Dispatch<React.SetStateAction<DrawerLine[]>>;
    setEntities: React.Dispatch<React.SetStateAction<Record<string, GameEntity>>>;
    registerEntity: (id: string, name: string, location: import('../../types').EntityLocation, category?: string) => import('../../types').GameEntity;
    practice: any;
    shop: any;
    quests: any;
    finalizeQuests: () => void;
    tempEqRef: React.MutableRefObject<DrawerLine[]>;
    tempInvRef: React.MutableRefObject<DrawerLine[]>;
    tempEntitiesRef: React.MutableRefObject<Record<string, GameEntity>>;
}

export function useStageManager(deps: StageManagerDeps) {
    const {
        captureStage,
        isDrawerCapture,
        isSilentCapture,
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
    } = deps;

    const finalizeCapture = useCallback((targetStage?: CaptureStage) => {
        const currentStage = captureStage.current as CaptureStage;
        if (currentStage === 'none') return false;
        
        // If targetStage is provided, only finalize if we match
        if (targetStage && currentStage !== targetStage) return false;

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
                finalizeQuests();
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
            // Decrement silent capture instead of resetting to 0 to support multiple concurrent background commands
            if (isSilentCapture.current > 0) isSilentCapture.current--;
            return true;
        }
        return false;
    }, [
        captureStage,
        isDrawerCapture,
        isSilentCapture,
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
