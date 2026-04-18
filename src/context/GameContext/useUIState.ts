import { useState, useCallback, useRef } from 'react';
import { CaptureStage } from '../../types';

interface CaptureRefs {
    captureStage: React.MutableRefObject<CaptureStage>;
    isWaitingForStats: React.MutableRefObject<boolean>;
    isWaitingForEq: React.MutableRefObject<boolean>;
    isWaitingForInv: React.MutableRefObject<boolean>;
    isWaitingForInfo: React.MutableRefObject<boolean>;
    isSilentCapture: React.MutableRefObject<number>;
    isDrawerCapture: React.MutableRefObject<number>;
    captureOwnerDrawer: React.MutableRefObject<'none' | 'stats' | 'equipment' | 'inventory' | 'character' | 'players'>;
}

export const useUIState = (
    executeCommandRef: React.MutableRefObject<(cmd: string, silent?: boolean, isSystem?: boolean, isHistorical?: boolean, fromDrawer?: boolean) => void>,
    dataCounts: { stats: number; info: number; inventory: number; players: number },
    captureRefs: CaptureRefs
) => {
    const [ui, setUI] = useState<{
        drawer: 'none' | 'stats' | 'equipment' | 'inventory' | 'character' | 'players';
        isDrawerPeeking: boolean;
        peekingDrawer: 'none' | 'stats' | 'equipment' | 'inventory' | 'character' | 'players' | 'map';
        setManagerOpen: boolean;
        mapExpanded: boolean;
        isMenuOpen: boolean;
        isSetMenuOpen: boolean;
        menuView: 'main' | 'availableSets';
        peekingSource: 'none' | 'inventory' | 'equipment' | 'character' | 'stats' | 'players' | 'map';
        characterTab: 'info' | 'practice' | 'quests';
        showMapperToolbar: boolean;
    }>(() => {
        const isMobileInitial = typeof window !== 'undefined' &&
            (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 768);

        return {
            drawer: 'none',
            isDrawerPeeking: false,
            peekingDrawer: 'none',
            setManagerOpen: false,
            mapExpanded: true, // Persistent gutter: map is open by default
            isMenuOpen: false,
            isSetMenuOpen: false,
            menuView: 'main',
            peekingSource: 'none',
            characterTab: 'info',
            showMapperToolbar: false
        };
    });

    // Track pending refresh timeouts so they can be cancelled on rapid drawer switches
    const pendingRefreshTimers = useRef<ReturnType<typeof setTimeout>[]>([]);

    const handleTabClick = useCallback((drawer: 'stats' | 'character' | 'inventory' | 'players' | 'equipment', initialTab?: 'info' | 'practice' | 'quests') => {
        executeCommandRef.current?.('click-sound', true, true);

        // --- Cancel any pending refresh commands from the previous drawer ---
        // Without this, staggered setTimeout calls (100ms, 200ms) from the old
        // drawer fire after we've already switched, re-setting waiting flags and
        // causing data to leak into the log.
        for (const t of pendingRefreshTimers.current) clearTimeout(t);
        pendingRefreshTimers.current = [];

        // --- Clear stale capture state from the previous drawer ---
        const { captureStage, isWaitingForStats, isWaitingForEq, isWaitingForInv, isWaitingForInfo, isDrawerCapture, captureOwnerDrawer } = captureRefs;
        // Abort any active capture stage so stale data doesn't land in the
        // wrong drawer's state. But DON'T reset isSilentCapture — its counter
        // still correctly tracks how many silent commands are in flight
        // (old + new). Old responses will still be suppressed by the visibility
        // logic because isSilentCapture > 0 and captureOwnerDrawer is not 'none'.
        if (captureStage.current !== 'none') {
            captureStage.current = 'none';
            isDrawerCapture.current = 0;
        }
        isWaitingForStats.current = false;
        isWaitingForEq.current = false;
        isWaitingForInv.current = false;
        isWaitingForInfo.current = false;
        // Stamp the drawer as owner. This serves two purposes:
        // 1. The visibility fallback uses owner !== 'none' to suppress stale
        //    responses while isSilentCapture > 0 and no capture stage has started.
        // 2. startStage() will overwrite this when a capture actually begins,
        //    reflecting the correct drawer for stage-based visibility.
        captureOwnerDrawer.current = drawer;

        let hasData = false;
        if (drawer === 'stats') hasData = dataCounts.stats > 0;
        else if (drawer === 'character') hasData = dataCounts.info > 0;
        else if (drawer === 'inventory' || drawer === 'equipment') hasData = dataCounts.inventory > 0;
        else if (drawer === 'players') hasData = dataCounts.players > 0;

        // Helper: schedule a timeout and track it for cancellation
        const later = (fn: () => void, ms: number) => {
            const t = setTimeout(fn, ms);
            pendingRefreshTimers.current.push(t);
            return t;
        };

        const refreshData = () => {
            if (drawer === 'stats') {
                executeCommandRef.current?.('stat', true, true, true, true);
                later(() => executeCommandRef.current?.('score', true, true, true, true), 100);
                later(() => executeCommandRef.current?.('info %m', true, true, true, true), 200);
            } else if (drawer === 'character') {
                executeCommandRef.current?.('info', true, true, true, true);
                later(() => executeCommandRef.current?.('quest', true, true, true, true), 100);
                later(() => executeCommandRef.current?.('practice', true, true, true, true), 200);
            } else if (drawer === 'inventory' || drawer === 'equipment') {
                executeCommandRef.current?.('eq', true, true, true, true);
                later(() => executeCommandRef.current?.('inv', true, true, true, true), 100);
            } else if (drawer === 'players') {
                executeCommandRef.current?.('who', true, true, true, true);
                later(() => executeCommandRef.current?.('where', true, true, true, true), 150);
            }
        };

        setUI(prev => {
            if (prev.drawer === drawer) {
                // Persistent gutter: clicking the active tab does nothing
                return prev;
            } else {
                if (hasData) {
                    // If we already have data (from bootstrap or previous open),
                    // trigger refresh in background immediately and switch UI.
                    refreshData();
                    return { ...prev, drawer, mapExpanded: false, peekingSource: 'none' };
                } else {
                    // Fetch fresh data when opening for the first time
                    later(refreshData, 50);
                    // Switch directly to the new drawer
                    const update: any = { ...prev, drawer, mapExpanded: false, peekingSource: 'none' };
                    if (drawer === 'character' && initialTab) update.characterTab = initialTab;
                    return update;
                }
            }
        });
    }, [executeCommandRef, dataCounts, captureRefs]);

    const toggleMap = useCallback(() => {
        executeCommandRef.current?.('click-sound', true, true);
        // Cancel any pending drawer refresh timers
        for (const t of pendingRefreshTimers.current) clearTimeout(t);
        pendingRefreshTimers.current = [];
        // Clear stale capture state
        const { captureStage, isWaitingForStats, isWaitingForEq, isWaitingForInv, isWaitingForInfo, isDrawerCapture } = captureRefs;
        if (captureStage.current !== 'none') {
            captureStage.current = 'none';
            isDrawerCapture.current = 0;
        }
        isWaitingForStats.current = false;
        isWaitingForEq.current = false;
        isWaitingForInv.current = false;
        isWaitingForInfo.current = false;

        setUI(prev => {
            const isMobile = window.innerWidth <= 1024;
            if (prev.drawer !== 'none' || !prev.mapExpanded) {
                return { ...prev, drawer: 'none', mapExpanded: true, peekingSource: 'none' };
            }
            if (isMobile) return prev;
            return prev;
        });
    }, [executeCommandRef, captureRefs]);

    const setIsStatsOpen = useCallback((open: boolean) => {
        if (open) handleTabClick('stats');
        else setUI(prev => ({ ...prev, drawer: 'none', mapExpanded: window.innerWidth <= 1024 ? true : prev.mapExpanded }));
    }, [handleTabClick]);

    const setIsCharacterOpen = useCallback((open: boolean, tab?: 'info' | 'practice' | 'quests') => {
        if (open) handleTabClick('character', tab);
        else setUI(prev => ({ ...prev, drawer: 'none', mapExpanded: window.innerWidth <= 1024 ? true : prev.mapExpanded }));
    }, [handleTabClick]);

    const setIsEquipmentOpen = useCallback((open: boolean) => {
        if (open) handleTabClick('equipment'); 
        else setUI(prev => ({ ...prev, drawer: 'none', mapExpanded: window.innerWidth <= 1024 ? true : prev.mapExpanded }));
    }, [handleTabClick]);

    const setIsInventoryOpen = useCallback((open: boolean) => {
        if (open) handleTabClick('inventory');
        else setUI(prev => ({ ...prev, drawer: 'none', mapExpanded: window.innerWidth <= 1024 ? true : prev.mapExpanded }));
    }, [handleTabClick]);

    const setIsPlayersOpen = useCallback((open: boolean) => {
        if (open) handleTabClick('players');
        else setUI(prev => ({ ...prev, drawer: 'none', mapExpanded: window.innerWidth <= 1024 ? true : prev.mapExpanded }));
    }, [handleTabClick]);

    const setIsMapExpanded = useCallback((open: boolean) => setUI(prev => {
        const isDesktop = window.innerWidth > 1024;
        if (isDesktop && !open) return prev;
        
        // Persistent gutter: cannot close the map if no drawer is open
        if (!isDesktop && !open && prev.drawer === 'none') return prev;
        
        return { ...prev, mapExpanded: open, peekingSource: 'none' };
    }), []);
    const setIsSetManagerOpen = useCallback((open: boolean) => setUI(prev => ({ ...prev, setManagerOpen: open, peekingSource: 'none' })), []);

    return {
        ui, setUI,
        setIsStatsOpen, setIsCharacterOpen, setIsEquipmentOpen, setIsInventoryOpen,
        setIsPlayersOpen, setIsMapExpanded, setIsSetManagerOpen,
        handleTabClick, toggleMap
    };
};