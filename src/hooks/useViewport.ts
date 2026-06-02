/**
 * @file useViewport.ts
 * @description Viewport, scroll, and terminal font sizing behavior.
 */

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { clampLogFontSize, getMinimumLogFontSize, getMobilePortraitFontBias } from '../utils/logFontSizing';

// --- Constants ---

const DESKTOP_MAX_AUTO_LOG_FONT_SIZE_PX = 16;

// --- Helpers ---

const readHorizontalPadding = (element: HTMLElement) => {
    const style = window.getComputedStyle(element);
    const left = parseFloat(style.paddingLeft) || 0;
    const right = parseFloat(style.paddingRight) || 0;
    return left + right;
};

export function useViewport(
    uiMode: import('../types').UiMode = 'auto',
    disableSmoothScroll: boolean = false,
    isImmersionMode: boolean = true,
    fontFamily: string = "'Roboto Mono', monospace",
    isTimestampEnabled: boolean = false,
    isNewbieMode: boolean = false
) {
    const [windowWidth, setWindowWidth] = useState(window.innerWidth);
    const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
    const [columns, setColumns] = useState(80);
    const [rows, setRows] = useState(24);

    // Scroll refs
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const scrollAnimationRef = useRef<number | null>(null);
    const autoScrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const isAutoScrollingRef = useRef<boolean>(false);
    const isLockedToBottomRef = useRef(true);

    // Viewport measurement refs
    const lastViewportHeightRef = useRef<number>(0);
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

    const isLandscape = useMemo(() => {
        if (uiMode === 'landscape') return true;
        if (uiMode === 'portrait' || uiMode === 'desktop') return false;
        return isMobile && windowWidth > window.innerHeight;
    }, [isMobile, windowWidth, uiMode]);

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
    const [logFontSizePx, setLogFontSizePx] = useState(16);

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

    // --- Dedicated Precision Layout Engine ---
    useEffect(() => {
        const updateLayout = () => {
            // Measure the inner scroll element — its clientWidth already excludes the scrollbar.
            const messageLog = document.querySelector('.message-log') as HTMLElement | null;
            const logContainer = document.querySelector('.message-log-container') as HTMLElement | null;
            if (!messageLog || !logContainer) return;

            const width = messageLog.clientWidth; // excludes scrollbar
            const height = logContainer.clientHeight;
            if (width === 0 || height === 0) return;

            // --- DOM-based character width measurement ---
            const span = document.createElement('span');
            span.style.cssText = 'position:absolute;visibility:hidden;white-space:pre;' +
                `font-family:${fontFamily},monospace;font-size:100px;pointer-events:none;`;
            span.innerText = 'W'.repeat(100); 
            document.body.appendChild(span);
            const charWidthRatio = span.getBoundingClientRect().width / (100 * 100);
            document.body.removeChild(span);

            // baseline cols needed for game content
            const baseCols = 80;
            const timestampWidth = isTimestampEnabled ? 12 : 0; 
            const targetCols = baseCols + timestampWidth;

            const totalPadding = readHorizontalPadding(messageLog);

            // Sub-pixel buffer: use a small buffer to prevent rounding-induced wrapping across different browsers.
            // Mobile portrait targets "barely fits 80 cols" so we skip the buffer there.
            const safetyBuffer = (isMobile && !isLandscape) ? 0 : 2;

            if (!isMobile) {
                // Let the log width be driven by --desktop-log-width without max-width overrides
            } else {
                document.documentElement.style.setProperty('--message-log-max-width', 'none');
            }

            const usableWidth = Math.max(0, width - totalPadding - safetyBuffer); 

            let calculatedFontSize = usableWidth / (targetCols * charWidthRatio);
            if (!isMobile) {
                calculatedFontSize = Math.min(DESKTOP_MAX_AUTO_LOG_FONT_SIZE_PX, calculatedFontSize);
            }

            // Apply user zoom multiplier
            calculatedFontSize *= logFontSize;

            // Safety clamps: 
            // On mobile portrait, we allow it to go down to 6px to satisfy the "fit 80" requirement.
            // On desktop/landscape, we now allow it to shrink further (down to 10px) to better honor 
            // the 80-column requirement on smaller windows/split-screens, while still preventing illegibility.
            calculatedFontSize += getMobilePortraitFontBias(isMobile, isLandscape);
            const minSize = getMinimumLogFontSize(isMobile, isLandscape);
            const safeSize = clampLogFontSize(calculatedFontSize, minSize);
            document.documentElement.style.setProperty('--dynamic-log-size', `${safeSize}px`);
            setLogFontSizePx(safeSize);

            // Derive final grid metrics for the game server
            const finalCharWidth = charWidthRatio * safeSize;
            const finalLineHeight = safeSize * 1.1;

            // Use a 0.1 buffer to handle floating point precision
            const actualCols = Math.floor((usableWidth / finalCharWidth) + 0.1);
            const actualRows = Math.floor((height / finalLineHeight) + 0.1);

            setColumns(actualCols);
            setRows(actualRows);
            // console.log(`[Layout] mobile=${isMobile} width=${width} pad=${totalPadding} target=${targetCols} font=${safeSize.toFixed(1)}px → ${actualCols}x${actualRows} (ratio=${charWidthRatio.toFixed(3)})`);

        };

        const timer = setTimeout(updateLayout, 10);
        const timer2 = setTimeout(updateLayout, 250); // Final settlement

        // Re-measure after web fonts finish loading (Space Mono may not be ready at mount)
        document.fonts.ready.then(updateLayout);

        // Re-measure if the container resizes (drawer opens/closes, orientation change, etc.)
        const container = document.querySelector('.message-log-container');
        let ro: ResizeObserver | null = null;
        if (container) {
            ro = new ResizeObserver(updateLayout);
            ro.observe(container);
        }

        return () => {
            clearTimeout(timer);
            clearTimeout(timer2);
            ro?.disconnect();
        };
    }, [isMobile, isLandscape, logFontSize, windowWidth, isKeyboardOpen, fontFamily, isTimestampEnabled, isNewbieMode]);

    const updateHeight = useCallback(() => {
        const viewport = window.visualViewport;
        if (!viewport) return;

        const currentHeight = viewport.height;
        const currentWidth = viewport.width;
        const offsetTop = viewport.offsetTop;

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
        const threshold = isLandscape ? 40 : 60;
        const isKeyboardPhysicallyPresent = heightDrop > threshold || (baseHeightRef.current > 0 && currentHeight < baseHeightRef.current * 0.8) || (isFocusableActive && currentHeight < window.screen.height * 0.65);

        const targetState = isKeyboardPhysicallyPresent;

        const applyLock = (h: number, off: number, isLocked: boolean) => {
            const container = document.querySelector('.app-container') as HTMLElement;
            if (!container) return;

            if (isLocked) {
                container.classList.add('kb-open');
                container.style.position = 'fixed';
                container.style.top = '0';
                container.style.left = '0';
                container.style.width = '100vw';
                container.style.height = `${h}px`;
                container.style.transform = `translate3d(0, ${off}px, 0)`;
                container.style.overflow = 'hidden';

                if (Math.abs(window.scrollY) > 1) window.scrollTo(0, 0);
                if (isFocusableActive) {
                    const input = document.activeElement as HTMLElement;
                    input.scrollIntoView({ block: 'center', behavior: 'instant' as any });
                }
            } else {
                if (container.classList.contains('kb-open')) {
                    container.classList.remove('kb-open');
                    container.style.position = '';
                    container.style.top = '';
                    container.style.left = '';
                    container.style.width = '';
                    container.style.height = '';
                    container.style.transform = '';
                    container.style.overflow = '';
                }
            }
        };

        requestAnimationFrame(() => {
            applyLock(currentHeight, offsetTop, targetState);

            if (targetState) {
                setTimeout(() => {
                    const v = window.visualViewport;
                    const hDrop = baseHeightRef.current - (v?.height || 0);
                    if (v && (hDrop > 60 || v.height < baseHeightRef.current * 0.85)) {
                        applyLock(v.height, v.offsetTop, true);
                    }
                }, 150);
            }

            lastViewportHeightRef.current = currentHeight;

            if (targetState !== isKeyboardOpen) {
                setIsKeyboardOpen(targetState);
            }
        });
    }, [isMobile, isLandscape, isKeyboardOpen, logFontSize]);

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
    }), [isMobile, isLandscape, isKeyboardOpen, columns, rows, scrollToBottom, updateHeight, logFontSize, logFontSizePx, setLogFontSizeAndPersist]);
}
