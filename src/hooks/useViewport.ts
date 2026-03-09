import { useState, useRef, useEffect, useCallback, useMemo } from 'react';

export function useViewport(
    uiMode: import('../types').UiMode = 'auto', 
    disableSmoothScroll: boolean = false, 
    disable3dScroll: boolean = false,
    isImmersionMode: boolean = false
) {
    const [windowWidth, setWindowWidth] = useState(window.innerWidth);
    const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);

    // Scroll refs
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const scrollAnimationRef = useRef<number | null>(null);
    const isAutoScrollingRef = useRef<boolean>(false);
    const isLockedToBottomRef = useRef(true);

    // Viewport measurement refs
    const lastViewportHeightRef = useRef<number>(window.innerHeight);
    const lastWidthRef = useRef<number>(window.innerWidth);
    const baseHeightRef = useRef<number>(window.innerHeight);

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

    const scrollToBottom = useCallback((force = false, instant = false) => {
        if (!scrollContainerRef.current) return;
        const container = scrollContainerRef.current;

        if (scrollAnimationRef.current) {
            cancelAnimationFrame(scrollAnimationRef.current);
            scrollAnimationRef.current = null;
        }

        if (!force) {
            const threshold = 15;
            const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < threshold;
            if (!isNearBottom) return;
        }

        isAutoScrollingRef.current = true;

        const isSmoothEnabled = !instant && !disableSmoothScroll && isImmersionMode;

        const performScroll = () => {
            if (messagesEndRef.current) {
                messagesEndRef.current.scrollIntoView({ 
                    behavior: isSmoothEnabled ? 'smooth' : 'auto',
                    block: 'end'
                });
            } else {
                container.scrollTo({ 
                    top: container.scrollHeight + 1000, 
                    behavior: isSmoothEnabled ? 'smooth' : 'auto'
                });
            }
        };

        performScroll();

        // Second pass after a short delay to catch typewriter or image layout shifts
        const timeout = isSmoothEnabled ? 250 : 40;
        setTimeout(() => {
            if (isLockedToBottomRef.current) performScroll();
            isAutoScrollingRef.current = false;
        }, timeout);
    }, []);

    const [logFontSize, setLogFontSize] = useState(() => {
        const saved = localStorage.getItem('mud-log-font-size');
        return saved ? parseFloat(saved) : 1.0;
    });

    useEffect(() => {
        localStorage.setItem('mud-log-font-size', logFontSize.toString());
    }, [logFontSize]);

    const touchDistRef = useRef<number | null>(null);
    const lastUpdateRef = useRef<number>(0);

    // Global touch listeners for pinch zoom
    useEffect(() => {
        if (!isMobile) return;

        const handleTouchStart = (e: TouchEvent) => {
            if ((e.target as HTMLElement).closest('.map-canvas')) return;
            if (e.touches.length === 2) {
                const dist = Math.hypot(
                    e.touches[0].pageX - e.touches[1].pageX,
                    e.touches[0].pageY - e.touches[1].pageY
                );
                touchDistRef.current = dist;
            }
        };

        const handleTouchMove = (e: TouchEvent) => {
            if ((e.target as HTMLElement).closest('.map-canvas')) return;
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

    const updateHeight = useCallback(() => {
        const now = Date.now();
        if (now - lastUpdateRef.current < 16) return;
        lastUpdateRef.current = now;

        const viewport = window.visualViewport;
        if (!viewport) return;

        const currentHeight = viewport.height;
        const currentWidth = viewport.width;

        if (Math.abs(currentWidth - lastWidthRef.current) > 2) {
            baseHeightRef.current = currentHeight;
            lastWidthRef.current = currentWidth;
        }

        if (currentHeight > baseHeightRef.current) baseHeightRef.current = currentHeight;

        const isFocusableActive = document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA';
        const isKeyboardDown = currentHeight > (baseHeightRef.current * 0.85);
        const isCurrentlyOpen = isMobile && isFocusableActive && !isKeyboardDown;

        requestAnimationFrame(() => {
            const container = document.querySelector('.app-container') as HTMLElement;
            if (container) {
                if (isCurrentlyOpen) {
                    // Lock height to visible area but do NOT offset top, 
                    // allowing native browser glide to handle the transition.
                    container.style.height = `${currentHeight}px`;
                } else {
                    container.style.height = '';
                }
            }

            const scrollContainer = scrollContainerRef.current;
            if (scrollContainer && Math.abs(currentHeight - lastViewportHeightRef.current) > 2) {
                if (isLockedToBottomRef.current) {
                    scrollContainer.scrollTop = scrollContainer.scrollHeight;
                }
            }

            if (isMobile) {
                const logContainer = document.querySelector('.message-log-container');
                if (logContainer) {
                    const width = logContainer.clientWidth;
                    // Account for 20px padding on each side of .message-log (40px total)
                    const usableWidth = Math.max(0, width - 40);
                    // Space Mono width is approx 0.6 of height. 
                    // To fit 80 chars: 80 * 0.6 * fontSize = usableWidth
                    // fontSize = usableWidth / 48
                    const fontSize = (usableWidth / 48) * logFontSize;
                    // Cap at a reasonable max (40px) to prevent massive text issues
                    const safeSize = Math.min(40, Math.max(6, fontSize));
                    document.documentElement.style.setProperty('--dynamic-log-size', `${safeSize}px`);
                }
            } else {
                document.documentElement.style.setProperty('--dynamic-log-size', `${16 * logFontSize}px`);
            }

            lastViewportHeightRef.current = currentHeight;
            
            if (isCurrentlyOpen !== isKeyboardOpen) {
                setIsKeyboardOpen(isCurrentlyOpen);
            }
        });
    }, [isMobile, isKeyboardOpen, logFontSize]);

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
        scrollContainerRef,
        messagesEndRef,
        scrollAnimationRef,
        isAutoScrollingRef,
        isLockedToBottomRef,
        scrollToBottom,
        updateHeight,
        logFontSize,
        resetLogFontSize: () => setLogFontSize(1.0)
    }), [isMobile, isLandscape, isKeyboardOpen, scrollToBottom, updateHeight, logFontSize]);
}
