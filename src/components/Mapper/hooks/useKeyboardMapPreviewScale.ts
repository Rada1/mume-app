/** @file Measures and scales the existing map view for the keyboard preview. */

import { useLayoutEffect, useRef } from 'react';
import type { RefObject } from 'react';

// --- Types ---
interface PreviewSize {
    width: number;
    height: number;
}

// --- Logic Section ---
function readSize(element: HTMLElement): PreviewSize {
    return { width: element.offsetWidth, height: element.offsetHeight };
}

export function useKeyboardMapPreviewScale(
    isPreview: boolean,
    frameRef: RefObject<HTMLElement | null>,
    mapViewRef: RefObject<HTMLElement | null>
): void {
    const sourceSizeRef = useRef<PreviewSize | null>(null);
    const isPreviewRef = useRef(false);

    useLayoutEffect(() => {
        const frame = frameRef.current;
        const mapView = mapViewRef.current;
        if (!frame || !mapView) return;

        const rememberSourceSize = () => {
            const keyboardOpen = frame.closest('.app-container')?.classList.contains('kb-open') === true;
            if (isPreviewRef.current || keyboardOpen) return;
            const size = readSize(mapView);
            if (size.width <= 0 || size.height <= 0) return;
            sourceSizeRef.current = size;
            frame.style.setProperty('--keyboard-map-source-width', `${size.width}px`);
            frame.style.setProperty('--keyboard-map-source-height', `${size.height}px`);
        };

        const observer = new ResizeObserver(rememberSourceSize);
        observer.observe(mapView);
        rememberSourceSize();
        return () => observer.disconnect();
    }, [frameRef, mapViewRef]);

    useLayoutEffect(() => {
        if (isPreview === isPreviewRef.current) return;
        isPreviewRef.current = isPreview;

        const frame = frameRef.current;
        const mapView = mapViewRef.current;
        if (!frame || !mapView) return;

        if (!isPreview) {
            const size = readSize(mapView);
            if (size.width > 0 && size.height > 0) {
                sourceSizeRef.current = size;
                frame.style.setProperty('--keyboard-map-source-width', `${size.width}px`);
                frame.style.setProperty('--keyboard-map-source-height', `${size.height}px`);
            }
            frame.style.removeProperty('--keyboard-map-preview-scale');
            return;
        }

        const sourceSize = sourceSizeRef.current ?? readSize(mapView);
        const frameSize = readSize(frame);
        if (sourceSize.width <= 0 || sourceSize.height <= 0 || frameSize.width <= 0 || frameSize.height <= 0) return;

        const scale = Math.min(frameSize.width / sourceSize.width, frameSize.height / sourceSize.height);
        frame.style.setProperty('--keyboard-map-preview-scale', String(scale));
    }, [isPreview, frameRef, mapViewRef]);
}
