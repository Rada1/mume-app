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
            mapExpanded: !isMobileInitial, // Open by default on desktop
            isMenuOpen: false,
            isSetMenuOpen: false,
            menuView: 'main',
            peekingSource: 'none'
        };
    });

    const setIsStatsOpen = useCallback((open: boolean) => {
        setUI(prev => {
            if (open && prev.drawer !== 'stats') {
                setTimeout(() => {
                    executeCommandRef.current?.('stat', true, true, true, true);
                    setTimeout(() => executeCommandRef.current?.('at', true, true, true, true), 100);
                }, 50);
            }
            return { ...prev, drawer: open ? 'stats' : 'none' };
        });
    }, [executeCommandRef]);

    const setIsCharacterOpen = useCallback((open: boolean) => {
        setUI(prev => {
            if (open && prev.drawer !== 'character') {
                setTimeout(() => {
                    executeCommandRef.current?.('info', true, true, true, true);
                    setTimeout(() => executeCommandRef.current?.('score', true, true, true, true), 100);
                    setTimeout(() => executeCommandRef.current?.('at', true, true, true, true), 200);
                    setTimeout(() => executeCommandRef.current?.('look self', true, true, true, true), 300);
                    setTimeout(() => executeCommandRef.current?.('whois', true, true, true, true), 400);
                    setTimeout(() => executeCommandRef.current?.('quest', true, true, true, true), 500);
                    setTimeout(() => executeCommandRef.current?.('practice', true, true, true, true), 600);
                }, 50);
            }
            return { ...prev, drawer: open ? 'character' : 'none' };
        });
    }, [executeCommandRef]);

    const setIsEquipmentOpen = useCallback((open: boolean) => {
        setUI(prev => {
            if (open && prev.drawer !== 'equipment') {
                setTimeout(() => {
                    executeCommandRef.current?.('eq', true, true, true, true);
                    setTimeout(() => executeCommandRef.current?.('at', true, true, true, true), 150);
                }, 50);
            }
            return { ...prev, drawer: open ? 'equipment' : 'none' };
        });
    }, [executeCommandRef]);

    const setIsInventoryOpen = useCallback((open: boolean) => {
        setUI(prev => {
            if (open && prev.drawer !== 'inventory') {
                setTimeout(() => {
                    executeCommandRef.current?.('inv', true, true, true, true);
                }, 50);
            }
            return { ...prev, drawer: open ? 'inventory' : 'none' };
        });
    }, [executeCommandRef]);

    const setIsPlayersOpen = useCallback((open: boolean) => {
        setUI(prev => ({ ...prev, drawer: open ? 'players' : 'none', peekingSource: 'none' }));
    }, []);

    const setIsMapExpanded = useCallback((open: boolean) => setUI(prev => {
        const isDesktop = window.innerWidth > 1024;
        if (isDesktop && !open) return prev;
        return { ...prev, mapExpanded: open, peekingSource: 'none' };
    }), []);
    const setIsSetManagerOpen = useCallback((open: boolean) => setUI(prev => ({ ...prev, setManagerOpen: open, peekingSource: 'none' })), []);

    return {
        ui, setUI,
        setIsStatsOpen, setIsCharacterOpen, setIsEquipmentOpen, setIsInventoryOpen,
        setIsPlayersOpen, setIsMapExpanded, setIsSetManagerOpen
    };
};