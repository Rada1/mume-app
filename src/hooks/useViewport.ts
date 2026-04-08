import { useState, useRef, useEffect, useCallback, useMemo } from 'react';

export function useViewport(
    uiMode: import('../types').UiMode = 'auto',
    disableSmoothScroll: boolean = false,
    disable3dScroll: boolean = false,
    isImmersionMode: boolean = true,
    fontFamily: string = "'Space Mono', monospace"
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

        // --- Continuous Glide Logic ---
        // If already animating and the target has moved, we don't want to cancel and restart (laggy).
        // Instead, we let the existing loop know about the new target distance.

        // Dynamic Snap: If the distance is too great (e.g. command spam), instantly snap instead of
        // trying to smooth glide through hundreds of pixels which creates a "lagging behind" visual effect.
        const dist = Math.abs(targetScroll - currentScroll);
        const shouldSnap = instant || dist > 250;

        const isSmoothEnabled = !shouldSnap && !disableSmoothScroll && isImmersionMode;

        if (isSmoothEnabled && dist > 0.5) {
            // Store the target for the animation loop to consume
            (container as any).lastTargetScroll = targetScroll;

            if (isAutoScrollingRef.current && scrollAnimationRef.current) {
                // If already gliding, just update the start position and time to "re-center" the ease
                // but keep it smooth. We don't want to reset startTime entirely as that causes 0-velocity jumps.
                // Instead, we just let the animation continue; it naturally pulls towards dynamicTarget.
                return;
            }

            isAutoScrollingRef.current = true;
            const startTime = performance.now();
            const duration = 250;
            const startScroll = container.scrollTop;

            const animate = (currentTime: number) => {
                if (!isAutoScrollingRef.current) {
                    scrollAnimationRef.current = null;
                    return;
                }

                const elapsed = currentTime - startTime;
                const progress = Math.min(elapsed / duration, 1);

                // Exponential ease-out for that "premium" feel
                const easeOut = 1 - Math.pow(2, -10 * progress);

                const dynamicTarget = container.scrollHeight - container.clientHeight;
                const currentDistance = dynamicTarget - startScroll;

                // Velocity-aware smoothing: if the gap is tiny, just snap
                if (progress < 1 && Math.abs(dynamicTarget - container.scrollTop) > 0.5) {
                    const newScroll = startScroll + (currentDistance * easeOut);
                    container.scrollTop = newScroll;
                    scrollAnimationRef.current = requestAnimationFrame(animate);
                } else {
                    container.scrollTop = dynamicTarget;
                    scrollAnimationRef.current = null;
                    // Start post-animation cooldown from HERE (when animation actually ends),
                    // not from animation start — the old 150ms timeout fired mid-animation
                    // and never cleared isAutoScrollingRef, causing it to get stuck true.
                    if (autoScrollTimeoutRef.current) clearTimeout(autoScrollTimeoutRef.current);
                    autoScrollTimeoutRef.current = setTimeout(() => {
                        isAutoScrollingRef.current = false;
                    }, 100);
                }
            };

            if (scrollAnimationRef.current) cancelAnimationFrame(scrollAnimationRef.current);
            scrollAnimationRef.current = requestAnimationFrame(animate);
        } else {
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
        }
    }, [disableSmoothScroll, isImmersionMode]);

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

    // logFontSize is a MULTIPLIER on top of the precision-calculated 80-column base size.
    // 1.0 = exactly 80 columns; > 1.0 = zoomed in; < 1.0 = zoomed out.
    // We intentionally do NOT restore from localStorage so every session starts at 80 cols.
    const [logFontSize, setLogFontSize] = useState(1.0);

    const touchDistRef = useRef<number | null>(null);
    const lastUpdateRef = useRef<number>(0);

    useEffect(() => {
        if (!isMobile) return;

        const handleTouchStart = (e: TouchEvent) => {
            if (!(e.target as HTMLElement).closest('.message-log')) return;
            if (e.touches.length === 2) {
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
                const distContext = Math.hypot(
                    e.touches[0].pageX - e.touches[1].pageX,
                    e.touches[0].pageY - e.touches[1].pageY
                );

                const ratio = distContext / touchDistRef.current;
                touchDistRef.current = distContext;

                setLogFontSize(prev => {
                    const next = prev * ratio;
                    return Math.min(2.5, Math.max(0.5, next));
                });
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
            // Measure a real DOM span so the browser uses the actual loaded font
            // (canvas measureText can fall back to system monospace before web fonts load).
            const span = document.createElement('span');
            span.style.cssText = 'position:absolute;visibility:hidden;white-space:pre;' +
                `font-family:${fontFamily},monospace;font-size:100px;pointer-events:none;`;
            span.textContent = 'MMMMMMMMMMMMMMMMMMMM'; // 20 chars at ref size 100px
            document.body.appendChild(span);
            const spanWidth = span.getBoundingClientRect().width;
            document.body.removeChild(span);
            if (spanWidth === 0) return;

            const REF_SIZE = 100;
            const charWidthRatio = (spanWidth / 20) / REF_SIZE; // advance width per px of font-size

            // font-size needed so that 80 chars fit within the usable text area
            const targetCols = 80;
            const messagePadding = 36; // Matching .message padding: 24px left + 12px right
            const usableWidth = Math.max(0, width - messagePadding);

            let calculatedFontSize = usableWidth / (targetCols * charWidthRatio);

            // Apply user zoom multiplier (1.0 = exact 80-col fit)
            calculatedFontSize *= logFontSize;

            // Safety clamps: never go below 6px or above 48px
            const safeSize = Math.min(48, Math.max(6, calculatedFontSize));
            document.documentElement.style.setProperty('--dynamic-log-size', `${safeSize}px`);

            // Derive final grid metrics for the game server
            const finalCharWidth = charWidthRatio * safeSize;
            const finalLineHeight = safeSize * 1.1;

            const actualCols = Math.floor((usableWidth / finalCharWidth) + 0.1);
            const actualRows = Math.floor((height / finalLineHeight) + 0.1);

            setColumns(actualCols);
            setRows(actualRows);
            console.log(`[Layout] charRatio=${charWidthRatio.toFixed(4)} → font=${safeSize.toFixed(1)}px → ${actualCols}x${actualRows}`);
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
    }, [isMobile, isLandscape, logFontSize, windowWidth, isKeyboardOpen, fontFamily]);

    const updateHeight = useCallback(() => {
        const viewport = window.visualViewport;
        if (!viewport) return;

        const currentHeight = viewport.height;
        const currentWidth = viewport.width;
        const offsetTop = viewport.offsetTop;

        // --- Robust Base Height Detection ---
        const widthChanged = Math.abs(currentWidth - lastWidthRef.current) > 50;

        if (offsetTop === 0 || baseHeightRef.current === 0 || widthChanged) {
            if (currentHeight > 500 || widthChanged || baseHeightRef.current === 0) {
                if (widthChanged || currentHeight > baseHeightRef.current) {
                    baseHeightRef.current = currentHeight;
                    lastWidthRef.current = currentWidth;
                }
            }
        }

        const isFocusableActive = document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA';
        const heightDrop = baseHeightRef.current - currentHeight;
        const threshold = isLandscape ? 40 : 60;
        const isKeyboardPhysicallyPresent = heightDrop > threshold || (baseHeightRef.current > 0 && currentHeight < baseHeightRef.current * 0.8);

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
        updateHeight();

        return () => {
            if (window.visualViewport) {
                window.visualViewport.removeEventListener('resize', updateHeight);
                window.visualViewport.removeEventListener('scroll', updateHeight);
            }
            window.removeEventListener('resize', updateHeight);
            window.removeEventListener('orientationchange', updateHeight);
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
        if (disable3dScroll || !isImmersionMode) root.classList.add('no-3d-scroll');
        else root.classList.remove('no-3d-scroll');

        if (isImmersionMode) root.classList.add('immersion-mode');
        else root.classList.remove('immersion-mode');
    }, [disable3dScroll, isImmersionMode]);

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
        resetLogFontSize: () => setLogFontSize(1.0)
    }), [isMobile, isLandscape, isKeyboardOpen, columns, rows, scrollToBottom, updateHeight, logFontSize]);
}
