/** @file useTerminalLayout.ts — Coalesced terminal sizing with cached font measurements. */
import { useEffect, useState } from 'react';
import type { TerminalLayoutOptions } from '../types';
import { clampLogFontSize, getMinimumLogFontSize, getMobilePortraitFontBias } from '../utils/logFontSizing';
import { uiPerformance } from '../utils/uiPerformance';

// --- Layout Section ---
export function useTerminalLayout({isMobile, isLandscape, logFontSize, windowWidth, fontFamily,
    isTimestampEnabled, isNewbieMode}: TerminalLayoutOptions) {
    const [columns, setColumns] = useState(80);
    const [rows, setRows] = useState(24);
    const [logFontSizePx, setLogFontSizePx] = useState(16);

    useEffect(() => {
        let active = true;
        let frame: number | null = null;
        let charWidthRatio: number | null = null;
        let lastElement: HTMLElement | null = null;
        let lastContainer: HTMLElement | null = null;
        let lastWidth = 0;
        let lastHeight = 0;
        let lastPadding = 0;
        const setCss = (name: string, value: string) => {
            const style = document.documentElement.style;
            if (style.getPropertyValue(name) !== value) style.setProperty(name, value);
        };
        const measureTerminalLayout = () => {
            if (!active) return;
            const finish = uiPerformance.startWork('Terminal layout');
            try {
                const log = document.querySelector<HTMLElement>('.message-log');
                const container = document.querySelector<HTMLElement>('.message-log-container');
                const account = isMobile ? document.querySelector<HTMLElement>('.mobile-account-experience') : null;
                const element = log ?? account;
                const surface = container ?? account;
                if (!element || !surface) return;
                const width = element.clientWidth;
                const height = surface.clientHeight;
                if (!width || !height) return;
                const computed = window.getComputedStyle(element);
                const padding = (parseFloat(computed.paddingLeft) || 0) + (parseFloat(computed.paddingRight) || 0);
                if (element === lastElement && surface === lastContainer && width === lastWidth && height === lastHeight && padding === lastPadding) return;

                // Probe once for this font, rather than forcing a document layout
                // on every ResizeObserver delivery. Font loading invalidates it.
                if (charWidthRatio === null) {
                    const probe = document.createElement('span');
                    probe.style.cssText = 'position:absolute;visibility:hidden;white-space:pre;' +
                        `font-family:${fontFamily},monospace;font-size:100px;pointer-events:none;`;
                    probe.textContent = 'W'.repeat(100);
                    document.body.appendChild(probe);
                    try { charWidthRatio = probe.getBoundingClientRect().width / 10000; }
                    finally { probe.remove(); }
                }
                if (charWidthRatio <= 0) { charWidthRatio = null; return; }
                const usableWidth = Math.max(0, width - padding - (isMobile && !isLandscape ? 0 : 2));
                const targetColumns = 80 + (log && isTimestampEnabled ? 12 : 0);
                let fontSize = usableWidth / (targetColumns * charWidthRatio);
                if (!isMobile) fontSize = Math.min(16, fontSize);
                fontSize = fontSize * logFontSize + getMobilePortraitFontBias(isMobile, isLandscape);
                const safeSize = clampLogFontSize(fontSize, getMinimumLogFontSize(isMobile, isLandscape));

                // Complete reads before writes, and leave unchanged CSS alone.
                lastElement = element; lastContainer = surface;
                lastWidth = width; lastHeight = height; lastPadding = padding;
                if (isMobile) setCss('--message-log-max-width', 'none');
                setCss('--dynamic-log-size', `${safeSize}px`);
                setLogFontSizePx(safeSize);
                if (!log && account) return;
                setColumns(Math.floor(usableWidth / (charWidthRatio * safeSize) + .1));
                setRows(Math.floor(height / (safeSize * 1.1) + .1));
            } finally { finish(); }
        };
        const schedule = () => {
            if (!active || frame !== null) return;
            frame = requestAnimationFrame(() => { frame = null; measureTerminalLayout(); });
        };
        const fontsChanged = () => {
            if (!active) return;
            charWidthRatio = null; lastElement = null;
            schedule();
        };
        schedule();
        const timer = setTimeout(schedule, 10);
        const settlement = setTimeout(schedule, 250);
        document.fonts?.ready.then(fontsChanged);
        document.fonts?.addEventListener('loadingdone', fontsChanged);
        const layoutRoot = document.querySelector('.desktop-center-column');
        const container = document.querySelector('.message-log-container');
        const resize = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(schedule) : null;
        if (layoutRoot || container) resize?.observe((layoutRoot ?? container)!);
        const mutation = layoutRoot ? new MutationObserver(schedule) : null;
        mutation?.observe(layoutRoot!, {childList: true});
        return () => {
            active = false;
            if (frame !== null) cancelAnimationFrame(frame);
            clearTimeout(timer); clearTimeout(settlement);
            resize?.disconnect(); mutation?.disconnect();
            document.fonts?.removeEventListener('loadingdone', fontsChanged);
        };
    }, [isMobile, isLandscape, logFontSize, windowWidth, fontFamily, isTimestampEnabled, isNewbieMode]);
    return {columns, rows, logFontSizePx};
}
