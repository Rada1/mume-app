import { useState, useCallback } from 'react';

export const useUIState = (executeCommandRef: React.MutableRefObject<(cmd: string, silent?: boolean, isSystem?: boolean, isHistorical?: boolean, fromDrawer?: boolean) => void>) => {
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
            peekingSource: 'none'
        };
    });

    const handleTabClick = useCallback((drawer: 'stats' | 'character' | 'inventory' | 'players') => {
        executeCommandRef.current?.('click-sound', true, true);
        setUI(prev => {
            if (prev.drawer === drawer) {
                // Persistent gutter: clicking the active tab does nothing
                return prev;
            } else {
                // Fetch fresh data when opening
                setTimeout(() => {
                    if (drawer === 'stats') {
                        executeCommandRef.current?.('stat', true, true, true, true);
                        setTimeout(() => executeCommandRef.current?.('at', true, true, true, true), 100);
                    } else if (drawer === 'character') {
                        executeCommandRef.current?.('info', true, true, true, true);
                        setTimeout(() => executeCommandRef.current?.('quest', true, true, true, true), 100);
                        setTimeout(() => executeCommandRef.current?.('practice', true, true, true, true), 200);
                    } else if (drawer === 'inventory') {
                        executeCommandRef.current?.('eq', true, true, true, true);
                        setTimeout(() => executeCommandRef.current?.('inv', true, true, true, true), 100);
                    } else if (drawer === 'players') {
                        executeCommandRef.current?.('who', true, true, true, true);
                        setTimeout(() => executeCommandRef.current?.('where', true, true, true, true), 150);
                    }
                }, 50);
                // Switch directly to the new drawer
                return { ...prev, drawer, mapExpanded: false, peekingSource: 'none' };
            }
        });
    }, [executeCommandRef]);

    const toggleMap = useCallback(() => {
        executeCommandRef.current?.('click-sound', true, true);
        setUI(prev => {
            const isMobile = window.innerWidth <= 1024;
            if (prev.drawer !== 'none' || !prev.mapExpanded) {
                // Switch back to the map and ensure it is expanded
                return { ...prev, drawer: 'none', mapExpanded: true, peekingSource: 'none' };
            }
            // If already on the map, do nothing on mobile (it's persistent)
            if (isMobile) return prev;
            
            // On desktop, it can stay as it is (managed by other logic if needed)
            return prev;
        });
    }, [executeCommandRef]);

    const setIsStatsOpen = useCallback((open: boolean) => {
        if (open) handleTabClick('stats');
        else setUI(prev => ({ ...prev, drawer: 'none', mapExpanded: window.innerWidth <= 1024 ? true : prev.mapExpanded }));
    }, [handleTabClick]);

    const setIsCharacterOpen = useCallback((open: boolean) => {
        if (open) handleTabClick('character');
        else setUI(prev => ({ ...prev, drawer: 'none', mapExpanded: window.innerWidth <= 1024 ? true : prev.mapExpanded }));
    }, [handleTabClick]);

    const setIsEquipmentOpen = useCallback((open: boolean) => {
        if (open) handleTabClick('inventory'); // Equipment is now part of inventory drawer
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