/** @file ImmersionBackgroundSidePanel.tsx — Displays the active map art beside the desktop log. */

// --- Logic Section ---
import React from 'react';
import { createPortal } from 'react-dom';
import { useGame } from '../../context/GameContext';
import { useModeStore } from '../../stores/useModeStore';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { normalizeZoneBackgroundKey } from '../../utils/zoneBackgroundPosition';
import './ImmersionBackgroundSidePanel.css';

const DEFAULT_MAP_BACKGROUND = '/assets/Pictures/UIPics/darkmap.png';

// --- Render Section ---
export const ImmersionBackgroundSidePanel: React.FC = () => {
    const { viewport, roomZone, spectateRoomZone, gameState, accountState, sessionMode } = useGame();
    const isImmersionMode = useSettingsStore(state => state.isImmersionMode);
    const showBackgroundImage = useSettingsStore(state => state.showImmersionBackgroundImage);
    const isEnabled = useSettingsStore(state => state.useImmersionBackgroundSidePanel);
    const manualBackground = useSettingsStore(state => state.bgImage);
    const visuals = useSettingsStore(state => state.mapBackgroundVisuals);
    const zonePositions = useSettingsStore(state => state.zoneBackgroundPositions);
    const isSpectating = useModeStore(state => state.isSpectating);
    const activeView = useModeStore(state => state.activeView);
    const isAccountMode = (gameState === 'account' || accountState.stage !== 'none') && sessionMode !== 'replay';
    const isViewingSpectateTarget = isSpectating && activeView === 'target';
    const zone = isViewingSpectateTarget ? spectateRoomZone : roomZone;
    const position = zonePositions[normalizeZoneBackgroundKey(zone)];
    const shouldShow = showBackgroundImage && isEnabled && isImmersionMode && !viewport.isMobile && !isAccountMode;
    const placeholderRef = React.useRef<HTMLDivElement>(null);
    const [atmosphereRoot, setAtmosphereRoot] = React.useState<HTMLElement | null>(null);
    const [bounds, setBounds] = React.useState<{ left: number; top: number; width: number; height: number } | null>(null);

    React.useLayoutEffect(() => {
        if (!shouldShow) {
            setAtmosphereRoot(null);
            setBounds(null);
            return;
        }

        const placeholder = placeholderRef.current;
        const root = document.querySelector<HTMLElement>('.environment-root.back');
        if (!placeholder || !root) return;
        setAtmosphereRoot(root);

        let frame = 0;
        const measure = () => {
            frame = 0;
            const panelRect = placeholder.getBoundingClientRect();
            const rootRect = root.getBoundingClientRect();
            const next = {
                left: panelRect.left - rootRect.left,
                top: panelRect.top - rootRect.top,
                width: panelRect.width,
                height: panelRect.height
            };
            setBounds(previous => previous &&
                previous.left === next.left && previous.top === next.top &&
                previous.width === next.width && previous.height === next.height
                ? previous
                : next
            );
        };
        const scheduleMeasure = () => {
            if (!frame) frame = requestAnimationFrame(measure);
        };
        const observer = new ResizeObserver(scheduleMeasure);
        observer.observe(placeholder);
        if (placeholder.parentElement) observer.observe(placeholder.parentElement);
        observer.observe(root);
        window.addEventListener('resize', scheduleMeasure);
        window.addEventListener('scroll', scheduleMeasure, true);
        measure();

        return () => {
            observer.disconnect();
            window.removeEventListener('resize', scheduleMeasure);
            window.removeEventListener('scroll', scheduleMeasure, true);
            if (frame) cancelAnimationFrame(frame);
        };
    }, [shouldShow]);

    if (!shouldShow) return null;

    const style = {
        backgroundImage: `url(${JSON.stringify(manualBackground || DEFAULT_MAP_BACKGROUND)})`,
        '--background-pan-x': `${position?.x ?? 0}vw`,
        '--background-pan-y': `${position?.y ?? 0}vh`,
        '--immersion-background-brightness': visuals.brightness,
        '--immersion-background-blur': `${visuals.blur}px`,
        '--immersion-panel-background-width': `${800 * visuals.zoom}vw`,
        '--immersion-panel-background-height': `${800 * visuals.zoom}vh`
    } as React.CSSProperties;

    const panel = atmosphereRoot && bounds && bounds.width > 0 && bounds.height > 0 ? createPortal(
        <div
            className="immersion-background-side-panel-atmosphere"
            aria-hidden="true"
            style={{ left: bounds.left, top: bounds.top, width: bounds.width, height: bounds.height }}
        >
            <div className="immersion-background-side-panel-image" style={style} />
        </div>,
        atmosphereRoot
    ) : null;

    return (
        <>
            <div ref={placeholderRef} className="immersion-background-side-panel-placeholder" aria-hidden="true" />
            {panel}
        </>
    );
};
