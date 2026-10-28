/**
 * @file useViewport.ts
 * @description Viewport, scroll, and terminal font sizing behavior.
 */

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useTerminalLayout } from './useTerminalLayout';
import { useLogAutoScroll } from './useLogAutoScroll';

export function useViewport(
    uiMode: import('../types').UiMode = 'auto',
    disableSmoothScroll: boolean = false,
    isImmersionMode: boolean = false,
    fontFamily: string = "'Roboto Mono', monospace",
    isTimestampEnabled: boolean = false,
    isNewbieMode: boolean = false
) {
    const [windowWidth, setWindowWidth] = useState(window.innerWidth);
    const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);



    // --- Shared log following ---
    const { scrollContainerRef, messagesEndRef, scrollAnimationRef,
        isAutoScrollingRef, isLockedToBottomRef, scrollToBottom } = useLogAutoScroll();

    // Viewport measurement refs
    const lastWidthRef = useRef<number>(0);
    const baseHeightRef = useRef<number>(0);

    useEffect(() => {
        const handleResize = () => setWindowWidth(window.innerWidth);
        window.addEventListener('resize', handleResize, { passive: true });
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const isMobile = useMemo(() => {
        if (uiMode === 'desktop') return false;
        if (uiMode === 'portrait' || uiMode === 'landscape') return true;
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || windowWidth <= 768;
    }, [windowWidth, uiMode]);

    const isPhysicalLandscape = useMemo(() => {
        if (uiMode === 'portrait' || uiMode === 'desktop') return false;
        // A landscape preference selects mobile sizing, but the side-by-side
        // layout only applies while the viewport itself is landscape.
        return isMobile && windowWidth > window.innerHeight;
    }, [isMobile, windowWidth, uiMode]);
    // Mobile landscape uses its native orientation and receives a side-by-side layout.
    const isRotatedLandscape: boolean = false;
    const isLandscape = isPhysicalLandscape;

    // logFontSize is a MULTIPLIER on top of the auto-fit base size.
    // Desktop and mobile fit game text to 80 columns, with desktop capped at 16px.
    const [logFontSize, setLogFontSize] = useState(() => {
        const saved = localStorage.getItem('logFontSizeMultiplier');
        const v = saved ? parseFloat(saved) : 1.0;
        return isNaN(v) ? 1.0 : Math.min(2.5, Math.max(0.5, v));
    });


    const setLogFontSizeAndPersist = useCallback((v: number | ((prev: number) => number)) => {
        setLogFontSize(prev => {
            const next = typeof v === 'function' ? v(prev) : v;
            const clamped = Math.min(2.5, Math.max(0.5, next));
            localStorage.setItem('logFontSizeMultiplier', String(clamped));
            return clamped;
        });
    }, []);

    const touchDistRef = useRef<number | null>(null);

    useEffect(() => {
        if (!isMobile) return;

        const bothTouchesInLog = (touches: TouchList): boolean => {
            const log = document.querySelector('.message-log');
            if (!log) return false;
            return log.contains(touches[0].target as Node) && log.contains(touches[1].target as Node);
        };

        const handleTouchStart = (e: TouchEvent) => {
            if (!(e.target as HTMLElement).closest('.message-log')) return;
            if (e.touches.length === 2 && bothTouchesInLog(e.touches)) {
                const dist = Math.hypot(
                    e.touches[0].pageX - e.touches[1].pageX,
                    e.touches[0].pageY - e.touches[1].pageY
                );
                touchDistRef.current = dist;
            }
        };

        const handleTouchMove = (e: TouchEvent) => {
            if (!(e.target as HTMLElement).closest('.message-log')) return;
            if (e.touches.length === 2 && touchDistRef.current !== null) {
                if (!bothTouchesInLog(e.touches)) {
                    touchDistRef.current = null;
                    return;
                }
                const distContext = Math.hypot(
                    e.touches[0].pageX - e.touches[1].pageX,
                    e.touches[0].pageY - e.touches[1].pageY
                );

                const ratio = distContext / touchDistRef.current;
                touchDistRef.current = distContext;

                setLogFontSizeAndPersist(prev => prev * ratio);
            }
        };

        const handleTouchEnd = () => {
            touchDistRef.current = null;
        };

        window.addEventListener('touchstart', handleTouchStart, { passive: true });
        window.addEventListener('touchmove', handleTouchMove, { passive: true });
        window.addEventListener('touchend', handleTouchEnd);

        return () => {
            window.removeEventListener('touchstart', handleTouchStart);
            window.removeEventListener('touchmove', handleTouchMove);
            window.removeEventListener('touchend', handleTouchEnd);
        };
    }, [isMobile]);

    // --- Terminal Layout ---
    const {columns, rows, logFontSizePx} = useTerminalLayout({
        isMobile, isLandscape, logFontSize, windowWidth, fontFamily, isTimestampEnabled, isNewbieMode
    });

    const updateHeight = useCallback(() => {
        const viewport = window.visualViewport;
        if (!viewport) return;

        const currentHeight = viewport.height;
        const currentWidth = viewport.width;

        // --- Robust Base Height Detection ---
        const widthChanged = Math.abs(currentWidth - lastWidthRef.current) > 50;
        const isFocusableActive = document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA';

        if (!isFocusableActive || baseHeightRef.current === 0 || widthChanged) {
            if (currentHeight > 500 || widthChanged || baseHeightRef.current === 0) {
                const screenHeight = window.screen.height;
                const isProbablyKeyboardOpenAtMount = isFocusableActive && currentHeight < screenHeight * 0.7;

                if (isProbablyKeyboardOpenAtMount) {
                    baseHeightRef.current = screenHeight - 100;
                } else {
                    if (widthChanged || currentHeight > baseHeightRef.current) {
                        baseHeightRef.current = currentHeight;
                    }
                }
                lastWidthRef.current = currentWidth;
            }
        }

        const heightDrop = baseHeightRef.current - currentHeight;
        const threshold = isPhysicalLandscape ? 40 : 60;
        const isKeyboardPhysicallyPresent = heightDrop > threshold || (baseHeightRef.current > 0 && currentHeight < baseHeightRef.current * 0.8) || (isFocusableActive && currentHeight < window.screen.height * 0.65);

        const targetState = isKeyboardPhysicallyPresent;

        // The viewport meta tag asks mobile browsers to resize the layout for
        // the keyboard. Let that native resize drive the app; changing the
        // app's inline height here creates a second, competing layout pass.
        document.querySelector<HTMLElement>('.app-container')?.classList.toggle('kb-open', targetState);
        if (targetState !== isKeyboardOpen) setIsKeyboardOpen(targetState);
    }, [isMobile, isPhysicalLandscape, isKeyboardOpen, logFontSize]);

    useEffect(() => {
        if (window.visualViewport) {
            window.visualViewport.addEventListener('resize', updateHeight);
            window.visualViewport.addEventListener('scroll', updateHeight);
        }

        window.addEventListener('resize', updateHeight);
        window.addEventListener('orientationchange', updateHeight);
        window.addEventListener('focusin', updateHeight);
        window.addEventListener('focusout', updateHeight);
        updateHeight();

        return () => {
            if (window.visualViewport) {
                window.visualViewport.removeEventListener('resize', updateHeight);
                window.visualViewport.removeEventListener('scroll', updateHeight);
            }
            window.removeEventListener('resize', updateHeight);
            window.removeEventListener('orientationchange', updateHeight);
            window.removeEventListener('focusin', updateHeight);
            window.removeEventListener('focusout', updateHeight);
        };
    }, [updateHeight]);

    useEffect(() => {
        const root = document.documentElement;
        root.classList.remove('force-desktop', 'force-portrait', 'force-landscape');
        if (uiMode === 'desktop') root.classList.add('force-desktop');
        else if (uiMode === 'portrait') root.classList.add('force-portrait');
        else if (uiMode === 'landscape') root.classList.add('force-landscape');
    }, [uiMode]);

    useEffect(() => {
        const root = document.documentElement;

        if (isImmersionMode) root.classList.add('immersion-mode');
        else root.classList.remove('immersion-mode');
    }, [isImmersionMode]);

    return useMemo(() => ({
        isMobile,
        isLandscape,
        isRotatedLandscape,
        isKeyboardOpen,
        columns,
        rows,
        scrollContainerRef,
        messagesEndRef,
        scrollAnimationRef,
        isAutoScrollingRef,
        isLockedToBottomRef,
        scrollToBottom,
        updateHeight,
        logFontSize,
        logFontSizePx,
        setLogFontSize: setLogFontSizeAndPersist,
        resetLogFontSize: () => setLogFontSizeAndPersist(1.0)
    }), [isMobile, isLandscape, isRotatedLandscape, isKeyboardOpen, columns, rows, scrollToBottom, updateHeight, logFontSize, logFontSizePx, setLogFontSizeAndPersist]);
}
