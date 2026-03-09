import { useState, useRef, useEffect, useCallback, useMemo } from 'react';

export function useViewport(
    uiMode: import('../types').UiMode = 'auto', 
    disableSmoothScroll: boolean = false, 
    disable3dScroll: boolean = false,
    isImmersionMode: boolean = true
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

    const scrollToBottom = useCallback((force = false, instant = false, source = 'unknown') => {
        if (!scrollContainerRef.current) return;
        const container = scrollContainerRef.current;

        if (scrollAnimationRef.current) {
            cancelAnimationFrame(scrollAnimationRef.current);
            scrollAnimationRef.current = null;
        }

        const currentScroll = container.scrollTop;
        const targetScroll = Math.max(0, container.scrollHeight - container.clientHeight);

        if (!force) {
            const threshold = 15; 
            const isNearBottom = targetScroll - currentScroll < threshold;
            if (!isNearBottom) return;
        }

        // Seamless Continuity: If already gliding and the target hasn't moved much (sub-pixel), let it be.
        // If it moved significantly (>0.5px), restart or extend the glide.
        if (isAutoScrollingRef.current && !instant && Math.abs(targetScroll - ((container as any).lastTarget || 0)) < 0.5) {
            return;
        }
        (container as any).lastTarget = targetScroll;

        const isSmoothEnabled = !instant && !disableSmoothScroll && isImmersionMode;
        if (isSmoothEnabled && Math.abs(targetScroll - currentScroll) > 0.5) {
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
                const easeOut = 1 - Math.pow(2, -10 * progress);
                
                const dynamicTarget = container.scrollHeight - container.clientHeight;
                const currentDistance = dynamicTarget - startScroll;
                
                // Sub-pixel accurate glide path
                const newScroll = startScroll + (currentDistance * easeOut);
                
                // Snap earlier (98%) to dynamicTarget to prevent rounding "jump" at the very end
                container.scrollTop = progress > 0.98 ? dynamicTarget : newScroll;

                if (progress < 1) {
                    scrollAnimationRef.current = requestAnimationFrame(animate);
                } else {
                    container.scrollTop = container.scrollHeight - container.clientHeight;
                    isAutoScrollingRef.current = false;
                    scrollAnimationRef.current = null;
                }
            };

            scrollAnimationRef.current = requestAnimationFrame(animate);
        } else {
            container.scrollTop = targetScroll;
            isAutoScrollingRef.current = false;
        }

        if (autoScrollTimeoutRef.current) clearTimeout(autoScrollTimeoutRef.current);
        autoScrollTimeoutRef.current = setTimeout(() => {
            // Only clear if not actually animating anymore
            if (!scrollAnimationRef.current) {
                isAutoScrollingRef.current = false;
            }
        }, 1000);
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

    const [logFontSize, setLogFontSize] = useState(() => {
        const saved = localStorage.getItem('mud-log-font-size');
        return saved ? parseFloat(saved) : 1.0;
    });

    useEffect(() => {
        localStorage.setItem('mud-log-font-size', logFontSize.toString());
    }, [logFontSize]);

    const touchDistRef = useRef<number | null>(null);
    const lastUpdateRef = useRef<number>(0);

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

    // --- Dedicated Font Recalibration ---
    useEffect(() => {
        if (!isMobile) {
            document.documentElement.style.setProperty('--dynamic-log-size', `${16 * logFontSize}px`);
            return;
        }

        const updateFont = () => {
            const logContainer = document.querySelector('.message-log-container');
            if (logContainer) {
                const width = logContainer.clientWidth;
                if (width === 0) return; // Not yet rendered

                // Standardized 80-character Space Mono math
                const usableWidth = Math.max(0, width - 40);
                const fontSize = (usableWidth / 48) * logFontSize;
                const safeSize = Math.min(40, Math.max(6, fontSize));
                document.documentElement.style.setProperty('--dynamic-log-size', `${safeSize}px`);
            }
        };

        // Update immediately and also after a short delay to catch browser reflow
        updateFont();
        const timer = setTimeout(updateFont, 100);
        const timer2 = setTimeout(updateFont, 300);

        return () => {
            clearTimeout(timer);
            clearTimeout(timer2);
        };
    }, [isMobile, isLandscape, logFontSize, windowWidth, isKeyboardOpen]);

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
