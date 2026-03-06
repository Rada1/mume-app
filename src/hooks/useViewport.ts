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
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const isMobile = useMemo(() => {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || windowWidth <= 1024;
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
            // Consistent threshold across the app
            const threshold = 50;
            const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < threshold;
            if (!isNearBottom) return;
        }

        if (instant) {
            isAutoScrollingRef.current = true;
            container.scrollTo({ top: container.scrollHeight, behavior: 'auto' });
            // Small timeout to reset the flag after the scroll event has likely fired
            setTimeout(() => { isAutoScrollingRef.current = false; }, 50);
        } else {
            // Slightly slower, "premium" smooth scroll
            const start = container.scrollTop;
            const end = container.scrollHeight - container.clientHeight;
            if (Math.abs(start - end) < 1) return;

            isAutoScrollingRef.current = true;
            const startTime = performance.now();
            const duration = 400; // Accelerated slightly for a snappier feel

            const animateScroll = (now: number) => {
                const elapsed = now - startTime;
                const progress = Math.min(elapsed / duration, 1);

                // Ease out cubic
                const ease = 1 - Math.pow(1 - progress, 3);

                container.scrollTop = start + (end - start) * ease;

                if (progress < 1) {
                    scrollAnimationRef.current = requestAnimationFrame(animateScroll);
                } else {
                    scrollAnimationRef.current = null;
                    isAutoScrollingRef.current = false;
                }
            };
            scrollAnimationRef.current = requestAnimationFrame(animateScroll);
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

    // Dynamic viewport height for mobile browsers
    const updateHeight = useCallback(() => {
        const viewport = window.visualViewport;
        if (!viewport) return;

        const currentHeight = viewport.height;
        const currentWidth = viewport.width;

        // If the width changed significantly, it's likely an orientation change.
        // Reset baseHeight so we don't carry over "poisoned" heights from previous orientation.
        if (Math.abs(currentWidth - lastWidthRef.current) > 2) {
            baseHeightRef.current = currentHeight;
            lastWidthRef.current = currentWidth;
        }

        // Keep baseHeight up to date with the largest height seen (keyboard down)
        if (currentHeight > baseHeightRef.current) baseHeightRef.current = currentHeight;

        const vh = currentHeight * 0.01;
        document.documentElement.style.setProperty('--vh', `${vh}px`);
        document.documentElement.style.setProperty('--visual-height', `${currentHeight}px`);

        // Force height on container for faster layout
        const container = document.querySelector('.app-container') as HTMLElement;

        // Use more robust detection: is the current viewport significantly smaller than the base height?
        const isFocusableActive = document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA';
        const isKeyboardDown = currentHeight > (baseHeightRef.current * 0.85);
        const isCurrentlyOpen = isMobile && isFocusableActive && !isKeyboardDown;

        const scrollContainer = scrollContainerRef.current;
        let distFromBottom = 0;
        if (scrollContainer) {
            distFromBottom = scrollContainer.scrollHeight - scrollContainer.scrollTop - scrollContainer.clientHeight;
        }

        if (container) {
            if (isCurrentlyOpen) {
                container.style.height = `${currentHeight}px`;
                container.style.top = `${viewport.offsetTop}px`;
            } else {
                // Return to normal layout when keyboard is closed
                container.style.height = '';
                container.style.top = '';
            }
        }

        if (scrollContainer && Math.abs(currentHeight - lastViewportHeightRef.current) > 2) {
            // Force synchronous layout recalculation so scroll height updates instantly
            void scrollContainer.clientHeight;

            if (isLockedToBottomRef.current) {
                scrollContainer.scrollTop = scrollContainer.scrollHeight;
            } else {
                // If not locked, try to keep the same distance from bottom to prevent jumping
                scrollContainer.scrollTop = Math.max(0, scrollContainer.scrollHeight - scrollContainer.clientHeight - distFromBottom);
            }
        }

        // Keyboard transitions usually involve > 150px height change on mobile
        // (variables retained for potential future use; no-op currently)
        // const isKeyboardOpening = isMobile && currentHeight < lastViewportHeightRef.current - 150 && isFocusableActive;
        // const isKeyboardClosing = isMobile && currentHeight > lastViewportHeightRef.current + 150;

        if (isCurrentlyOpen !== isKeyboardOpen) {
            setIsKeyboardOpen(isCurrentlyOpen);
        }

        // Dynamic log font size to precisely fit 80 characters without wrapping
        if (isMobile) {
            const logContainer = document.querySelector('.message-log-container');
            if (logContainer) {
                const width = logContainer.clientWidth;
                // Ratio for Space Mono is approx 0.6.
                // To fit 80 chars: 80 * fontSize * 0.6 = width
                // fontSize = width / 48
                // We use 48.5 for a tighter fit while still allowing tiny padding
                const fontSize = (width / 48.5) * logFontSize;
                document.documentElement.style.setProperty('--dynamic-log-size', `${Math.max(6, fontSize)}px`);
            }
        } else {
            document.documentElement.style.setProperty('--dynamic-log-size', `${16 * logFontSize}px`);
        }

        lastViewportHeightRef.current = currentHeight;

        // Synchronous distance-from-bottom restoration handles keyboard transitions now.
    }, [scrollToBottom, isMobile, isKeyboardOpen, logFontSize]);

    // Force snap and scroll strictly when keyboard state or mobile status changes
    useEffect(() => {
        if (isMobile) {
            // Force snap on keyboard state changes - this is a "hard" snap
            if (isLockedToBottomRef.current) {
                scrollToBottom(true, true);
            }

            const timer = setTimeout(() => {
                if (isLockedToBottomRef.current) scrollToBottom(true, true);
                updateHeight();
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

    return {
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
    };
}
