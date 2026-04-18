import { useState, useCallback } from 'react';

export const useUIState = (
    executeCommandRef: React.MutableRefObject<(cmd: string, silent?: boolean, isSystem?: boolean, isHistorical?: boolean, fromDrawer?: boolean) => void>,
    dataCounts: { stats: number; info: number; inventory: number; players: number }
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

    const handleTabClick = useCallback((drawer: 'stats' | 'character' | 'inventory' | 'players' | 'equipment', initialTab?: 'info' | 'practice' | 'quests') => {
        executeCommandRef.current?.('click-sound', true, true);

        // Only fetch data on the very first open (when we have nothing cached).
        // Subsequent switches just show cached data — no commands fired, no races.
        // Users can refresh via the refresh button inside each drawer.
        let hasData = false;
        if (drawer === 'stats') hasData = dataCounts.stats > 0;
        else if (drawer === 'character') hasData = dataCounts.info > 0;
        else if (drawer === 'inventory' || drawer === 'equipment') hasData = dataCounts.inventory > 0;
        else if (drawer === 'players') hasData = dataCounts.players > 0;

        const fetchInitialData = () => {
            if (drawer === 'stats') {
                executeCommandRef.current?.('stat', true, true, true, true);
                setTimeout(() => executeCommandRef.current?.('score', true, true, true, true), 100);
                setTimeout(() => executeCommandRef.current?.('info %m', true, true, true, true), 200);
            } else if (drawer === 'character') {
                executeCommandRef.current?.('info', true, true, true, true);
                setTimeout(() => executeCommandRef.current?.('quest', true, true, true, true), 100);
                setTimeout(() => executeCommandRef.current?.('practice', true, true, true, true), 200);
            } else if (drawer === 'inventory' || drawer === 'equipment') {
                executeCommandRef.current?.('eq', true, true, true, true);
                setTimeout(() => executeCommandRef.current?.('inv', true, true, true, true), 100);
            } else if (drawer === 'players') {
                executeCommandRef.current?.('who', true, true, true, true);
                setTimeout(() => executeCommandRef.current?.('where', true, true, true, true), 150);
            }
        };

        setUI(prev => {
            if (prev.drawer === drawer) {
                return prev;
            }
            const update: any = { ...prev, drawer, mapExpanded: false, peekingSource: 'none' };
            if (drawer === 'character' && initialTab) update.characterTab = initialTab;
            if (!hasData) {
                // First-ever open — fetch data (only fires once per drawer per session)
                setTimeout(fetchInitialData, 50);
            }
            return update;
        });
    }, [executeCommandRef, dataCounts]);

    const toggleMap = useCallback(() => {
        executeCommandRef.current?.('click-sound', true, true);
        setUI(prev => {
            const isMobile = window.innerWidth <= 1024;
            if (prev.drawer !== 'none' || !prev.mapExpanded) {
                return { ...prev, drawer: 'none', mapExpanded: true, peekingSource: 'none' };
            }
            if (isMobile) return prev;
            return prev;
        });
    }, [executeCommandRef]);

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