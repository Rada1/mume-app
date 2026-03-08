import { useState, useRef, useEffect, useCallback, useMemo } from 'react';

export function useViewport() {
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
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || windowWidth <= 768;
    }, [windowWidth]);

    const isLandscape = useMemo(() => {
        return isMobile && windowWidth > window.innerHeight;
    }, [isMobile, windowWidth]);

    const scrollToBottom = useCallback((force = false, instant = false) => {
        if (!scrollContainerRef.current) return;
        const container = scrollContainerRef.current;

        if (scrollAnimationRef.current) {
            cancelAnimationFrame(scrollAnimationRef.current);
            scrollAnimationRef.current = null;
        }

        if (!force) {
            // Consistent threshold across the app - tighten to 5 for precision
            const threshold = 5;
            const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < threshold;
            if (!isNearBottom) return;
        }

        // Mobile browsers often struggle with custom JS smooth scrolling because it fights
        // with native momentum scrolling and visual bounds. Native 'smooth' or 'instant' is better.
        isAutoScrollingRef.current = true;

        if (instant) {
            container.scrollTo({ top: container.scrollHeight, behavior: 'auto' });
            setTimeout(() => { isAutoScrollingRef.current = false; }, 40);
        } else {
            // Check if we can use a slightly faster smooth scroll via CSS if the browser supports it,
            // but for now, native smooth is standard.
            container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
            // Reduce timeout slightly for snappier lock release
            setTimeout(() => { isAutoScrollingRef.current = false; }, 200);
        }
    }, [isMobile]);

    const [logFontSize, setLogFontSize] = useState(() => {
        const saved = localStorage.getItem('mud-log-font-size');
        return saved ? parseFloat(saved) : 1.0;
    });

    useEffect(() => {
        localStorage.setItem('mud-log-font-size', logFontSize.toString());
    }, [logFontSize]);

    const touchDistRef = useRef<number | null>(null);

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
                    // Clamp between 0.5 and 2.5
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

    const lastUpdateRef = useRef<number>(0);

    const updateHeight = useCallback(() => {
        const now = Date.now();
        // Throttle updates to ~60fps for stability during fast transitions
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
            const vh = currentHeight * 0.01;
            document.documentElement.style.setProperty('--vh', `${vh}px`);
            document.documentElement.style.setProperty('--visual-height', `${currentHeight}px`);

            const container = document.querySelector('.app-container') as HTMLElement;
            if (container) {
                if (isCurrentlyOpen) {
                    container.style.height = `${currentHeight}px`;
                    container.style.top = `${viewport.offsetTop}px`;
                } else {
                    container.style.height = '';
                    container.style.top = '';
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
                    const fontSize = (width / 48.5) * logFontSize;
                    document.documentElement.style.setProperty('--dynamic-log-size', `${Math.max(6, fontSize)}px`);
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

    // Force snap and scroll strictly when keyboard state or mobile status changes
    useEffect(() => {
        if (isMobile) {
            // Force snap on keyboard state changes - this is a "hard" snap
            if (isLockedToBottomRef.current) {
                scrollToBottom(true, true);
            }

            const timer = setTimeout(() => {
                if (isLockedToBottomRef.current) scrollToBottom(true, true);
            }, 400);
            return () => clearTimeout(timer);
        }
    }, [isKeyboardOpen, isMobile, scrollToBottom, updateHeight]);

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
