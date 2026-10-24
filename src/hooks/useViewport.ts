/**
 * @file useViewport.ts
 * @description Viewport, scroll, and terminal font sizing behavior.
 */

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useTerminalLayout } from './useTerminalLayout';

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



    // Scroll refs
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const scrollAnimationRef = useRef<number | null>(null);
    const autoScrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const isAutoScrollingRef = useRef<boolean>(false);
    const isLockedToBottomRef = useRef(true);

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
        if (uiMode === 'landscape') return true;
        if (uiMode === 'portrait' || uiMode === 'desktop') return false;
        return isMobile && windowWidth > window.innerHeight;
    }, [isMobile, windowWidth, uiMode]);
    // Mobile landscape keeps the portrait component tree and rotates the whole app.
    const isRotatedLandscape = isMobile && isPhysicalLandscape;
    const isLandscape = isPhysicalLandscape && !isRotatedLandscape;

    const scrollToBottom = useCallback((force = false, instant = false, _source = 'unknown') => {
        if (!scrollContainerRef.current) return;
        const container = scrollContainerRef.current;

        const currentScroll = container.scrollTop;
        const targetScroll = Math.max(0, container.scrollHeight - container.clientHeight);

        if (!force) {
            const threshold = 40; // Increased to match MessageLog.tsx lock detection
            const isNearBottom = targetScroll - currentScroll < threshold;
            if (!isNearBottom) return;
        }

        if (scrollAnimationRef.current) {
            cancelAnimationFrame(scrollAnimationRef.current);
            scrollAnimationRef.current = null;
        }
        // Set isAutoScrollingRef BEFORE scrollTop so the resulting scroll event
        // is recognized as programmatic — otherwise handleScroll sets isUserScrollingRef=true
        // for 150ms which blocks VirtualizerResize corrections during rapid text.
        isAutoScrollingRef.current = true;
        container.scrollTop = targetScroll;
        requestAnimationFrame(() => { isAutoScrollingRef.current = false; });
    }, []);

    useEffect(() => {
        const container = scrollContainerRef.current;
        if (!container) return;

        let lastHeight = container.scrollHeight;

        const resizeObserver = new ResizeObserver(() => {
            const newHeight = container.scrollHeight;
            if (newHeight === lastHeight) return;

            // If already animating, the animation loop itself will track the height.
            // But for simple snaps or stillness, let's follow the growth.
            if (isAutoScrollingRef.current) {
                lastHeight = newHeight;
                return;
            }

            lastHeight = newHeight;

            if (isLockedToBottomRef.current) {
                // Remove the delay, use RAF for sub-pixel accuracy
                requestAnimationFrame(() => {
                    if (isLockedToBottomRef.current && !isAutoScrollingRef.current) {
                        scrollToBottom(true, true, 'ResizeObserver_Growth');
                    }
                });
            }
        });

        resizeObserver.observe(container);
        return () => resizeObserver.disconnect();
    }, [scrollToBottom]);

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
