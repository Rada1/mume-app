/**
 * @file EnvironmentGlow.tsx
 * @description Renders a dynamic, fluid environmental backdrop that reacts to terrain, lighting, and keyboard typing.
 */

import React, { useEffect, useLayoutEffect, useRef, useMemo, useState } from 'react';
import { useGame } from '../../context/GameContext';
import { normalizeTerrain } from '../../utils/terrainUtils';
import './EnvironmentGlow.css';

// --- Types Section ---
interface HSLColor {
    h: number;
    s: number;
    l: number;
}

interface TerrainConfig {
    color1: HSLColor;
    color2: HSLColor;
    speed: number;
    amplitude: number;
}

interface EnvironmentGlowProps {
    terrain?: string;
    lighting?: string;
    input: string;
}

// --- Constants Section ---
const TERRAIN_CONFIGS: Record<string, TerrainConfig> = {
    forest: {
        color1: { h: 140, s: 65, l: 15 },
        color2: { h: 110, s: 50, l: 20 },
        speed: 0.006,
        amplitude: 14,
    },
    water: {
        color1: { h: 205, s: 75, l: 20 },
        color2: { h: 180, s: 65, l: 24 },
        speed: 0.012,
        amplitude: 18,
    },
    underground: {
        color1: { h: 280, s: 25, l: 10 },
        color2: { h: 15, s: 75, l: 14 }, // Lava highlights
        speed: 0.003,
        amplitude: 8,
    },
    mountain: {
        color1: { h: 215, s: 15, l: 22 },
        color2: { h: 240, s: 10, l: 30 },
        speed: 0.005,
        amplitude: 10,
    },
    hills: {
        color1: { h: 35, s: 40, l: 16 },
        color2: { h: 70, s: 30, l: 20 },
        speed: 0.006,
        amplitude: 12,
    },
    field: {
        color1: { h: 90, s: 45, l: 16 },
        color2: { h: 60, s: 40, l: 20 },
        speed: 0.007,
        amplitude: 12,
    },
    road: {
        color1: { h: 40, s: 25, l: 15 },
        color2: { h: 30, s: 20, l: 18 },
        speed: 0.006,
        amplitude: 8,
    },
    city: {
        color1: { h: 25, s: 35, l: 18 },
        color2: { h: 0, s: 25, l: 22 },
        speed: 0.006,
        amplitude: 10,
    },
    building: {
        color1: { h: 35, s: 35, l: 18 },
        color2: { h: 15, s: 30, l: 22 },
        speed: 0.005,
        amplitude: 8,
    },
    default: {
        color1: { h: 220, s: 20, l: 16 },
        color2: { h: 200, s: 15, l: 20 },
        speed: 0.004,
        amplitude: 8,
    },
};

// --- Helper Functions ---
// Lighting renders as its own distinct color stream alongside terrain, not as a tint baked
// into terrain hues. Keeping them separate lets both flows read clearly side by side.
const LIGHTING_COLORS: Record<string, HSLColor> = {
    sun:        { h: 200, s: 32, l: 94 }, // bright pale sky blue
    moon:       { h: 215, s: 45, l: 48 }, // silver-blue
    artificial: { h: 28,  s: 75, l: 46 }, // torch amber
    dark:       { h: 260, s: 22, l: 28 }, // deep void violet
    none:       { h: 220, s: 18, l: 38 },
};

const adjustForTheme = (color: HSLColor, isLightMode: boolean): HSLColor => {
    let { h, s, l } = color;
    if (isLightMode) {
        l = Math.min(95, 76 + l * 0.4); // bright pastel
        s = Math.max(12, s * 0.5);
    }
    return { h, s, l };
};

const lerp = (start: number, end: number, amt: number): number => {
    return (1 - amt) * start + amt * end;
};

const lerpHue = (start: number, end: number, amt: number): number => {
    let diff = end - start;
    while (diff < -180) diff += 360;
    while (diff > 180) diff -= 360;
    return (start + diff * amt + 360) % 360;
};

// --- Main Component ---
export const EnvironmentGlow: React.FC<EnvironmentGlowProps> = ({
    terrain,
    lighting = 'none',
    input,
}) => {
    const { isImmersionMode, theme, viewport } = useGame() as any;
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const [visibleHeight, setVisibleHeight] = useState<number | null>(null);

    const isMobile = viewport?.isMobile;

    // Responsive height adjustment for mobile so waves align with the bottom of the log area (above drawers)
    useLayoutEffect(() => {
        const updateHeight = () => {
            const container = containerRef.current;
            if (!container || !isMobile) {
                setVisibleHeight(null);
                return;
            }

            // Skip if nested inside the Map view/drawer
            if (container.closest('.map-container') !== null) {
                setVisibleHeight(null);
                return;
            }

            const logEl = document.querySelector('.message-log-container');
            if (logEl) {
                const logRect = logEl.getBoundingClientRect();
                const parentRect = container.parentElement?.getBoundingClientRect();
                const promptRect = document.querySelector('.control-card-wrapper')?.getBoundingClientRect();
                const gutterEl = document.querySelector('.mobile-bottom-gutter');
                const gutterRect = gutterEl?.getBoundingClientRect();
                if (parentRect) {
                    let visualBottom = Math.max(logRect.bottom, promptRect?.bottom ?? logRect.bottom);
                    // Extend down behind the mobile gutter's curved top corners (border-radius: 32px)
                    if (gutterRect) {
                        visualBottom = Math.max(visualBottom, gutterRect.top + 32);
                    }
                    const computedHeight = visualBottom - parentRect.top;
                    if (computedHeight > 0 && computedHeight < window.innerHeight) {
                        setVisibleHeight(computedHeight);
                        return;
                    }
                }
            }
            setVisibleHeight(null);
        };

        updateHeight();

        // Observe both window resizing and log content adjustments (like drawer layout toggles)
        const logEl = document.querySelector('.message-log-container');
        let observer: ResizeObserver | null = null;
        if (logEl) {
            observer = new ResizeObserver(updateHeight);
            observer.observe(logEl);
            if (logEl.parentElement) {
                observer.observe(logEl.parentElement);
            }
        }

        window.addEventListener('resize', updateHeight);
        return () => {
            window.removeEventListener('resize', updateHeight);
            if (observer) observer.disconnect();
        };
    }, [isMobile]);

    // Track typing activity triggers with target-easing to ensure a smooth, inertia-driven effect
    const prevInputLen = useRef(0);
    const typingActivityTarget = useRef(0);
    const typingActivityCurrent = useRef(0);

    const normTerrain = useMemo(() => normalizeTerrain(terrain || ''), [terrain]);
    const config = useMemo(() => TERRAIN_CONFIGS[normTerrain] || TERRAIN_CONFIGS.default, [normTerrain]);

    const isLightMode = theme === 'light';

    // Target colors adjusted for current layout/mode. Terrain colors stay pure (no lighting
    // tint), and lightingColor is its own independent stream so the two read as distinct flows.
    const targetColors = useMemo(() => {
        const lightingRaw = LIGHTING_COLORS[lighting] || LIGHTING_COLORS.none;
        return {
            color1: adjustForTheme(config.color1, isLightMode),
            color2: adjustForTheme(config.color2, isLightMode),
            lightingColor: adjustForTheme(lightingRaw, isLightMode),
            speed: config.speed,
            amplitude: config.amplitude,
        };
    }, [config, isLightMode, lighting]);

    // Track active/current values for smoothing transitions
    const currentColors = useRef({
        c1: { ...targetColors.color1 },
        c2: { ...targetColors.color2 },
        cL: { ...targetColors.lightingColor },
        speed: targetColors.speed,
        amplitude: targetColors.amplitude,
    });

    // Mirror targetColors and lighting into refs so the animation loop can read the latest
    // values without re-running its useEffect — re-running would reset wave phase and snap
    // the visuals. Keeping a long-lived loop lets `currentColors` lerp continuously.
    const targetColorsRef = useRef(targetColors);
    const lightingRef = useRef(lighting);
    useEffect(() => { targetColorsRef.current = targetColors; }, [targetColors]);
    useEffect(() => { lightingRef.current = lighting; }, [lighting]);

    // Persist wave phase across effect re-runs so terrain/lighting changes don't snap the wave
    const phaseRef = useRef(0);

    // Detect keyboard typing spikes
    useEffect(() => {
        const len = input.length;
        if (len !== prevInputLen.current) {
            // Smaller increments for a more gradual, inertia-style build-up
            typingActivityTarget.current = Math.min(1.0, typingActivityTarget.current + 0.22);
            prevInputLen.current = len;
        }
    }, [input]);

    // Canvas animation loop
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !isImmersionMode) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let frameId = 0;
        let lastFrameTime = 0;
        const FRAME_MS = 100; // 10fps — glow is a slow ambient effect; canvas re-uploads
                               // to GPU every frame, so fewer frames = less compositor churn.

        // Draw at half DPR — the CSS blur hides all pixel detail anyway,
        // so halving resolution cuts the GPU upload size by 75%.
        const CANVAS_SCALE = Math.max(0.5, (window.devicePixelRatio || 1) * 0.5);

        const resize = () => {
            const rect = canvas.parentElement?.getBoundingClientRect();
            canvas.width = (rect?.width || canvas.clientWidth) * CANVAS_SCALE;
            canvas.height = (rect?.height || canvas.clientHeight) * CANVAS_SCALE;
        };
        resize();

        const observer = new ResizeObserver(resize);
        if (canvas.parentElement) observer.observe(canvas.parentElement);

        const render = (timestamp: number) => {
            if (timestamp - lastFrameTime < FRAME_MS) {
                frameId = requestAnimationFrame(render);
                return;
            }
            lastFrameTime = timestamp;

            const w = canvas.width;
            const h = canvas.height;
            if (w <= 0 || h <= 0) {
                frameId = requestAnimationFrame(render);
                return;
            }
            ctx.clearRect(0, 0, w, h);

            // Interpolate colors towards target — slow enough (~2s to settle) that switching
            // rooms/terrain reads as a smooth fade rather than a snap.
            const colorLerp = 0.012;
            const motionLerp = 0.03;
            const cur = currentColors.current;
            const tar = targetColorsRef.current;

            cur.c1.h = lerpHue(cur.c1.h, tar.color1.h, colorLerp);
            cur.c1.s = lerp(cur.c1.s, tar.color1.s, colorLerp);
            cur.c1.l = lerp(cur.c1.l, tar.color1.l, colorLerp);

            cur.c2.h = lerpHue(cur.c2.h, tar.color2.h, colorLerp);
            cur.c2.s = lerp(cur.c2.s, tar.color2.s, colorLerp);
            cur.c2.l = lerp(cur.c2.l, tar.color2.l, colorLerp);

            cur.cL.h = lerpHue(cur.cL.h, tar.lightingColor.h, colorLerp);
            cur.cL.s = lerp(cur.cL.s, tar.lightingColor.s, colorLerp);
            cur.cL.l = lerp(cur.cL.l, tar.lightingColor.l, colorLerp);

            cur.speed = lerp(cur.speed, tar.speed, motionLerp);
            cur.amplitude = lerp(cur.amplitude, tar.amplitude, motionLerp);

            // Slowly decay the target typing activity (takes approx 1.5 - 2 seconds to settle)
            typingActivityTarget.current = lerp(typingActivityTarget.current, 0, 0.025);

            // Smoothly interpolate the current visual activity towards the target (inertia effect)
            typingActivityCurrent.current = lerp(typingActivityCurrent.current, typingActivityTarget.current, 0.045);

            const act = typingActivityCurrent.current;

            // Flicker multiplier for torchlight (slightly smoothed out to reduce flashing)
            const flicker = lightingRef.current === 'artificial' ? 1.0 + (Math.random() - 0.5) * 0.06 : 1.0;

            // Typing influence is now gentler and has momentum:
            const finalSpeed = cur.speed * (1.0 + act * 0.35);
            // Use CSS height (not canvas pixels) so amplitude stays correct at half resolution
            const cssH = h / CANVAS_SCALE;
            const screenScale = Math.min(3.0, Math.max(0.6, cssH / 350));
            const finalAmp = cur.amplitude * screenScale * (1.0 + act * 0.45) * flicker;

            // Typing brightness/saturation boost is now a soft wash rather than a sharp flash
            const brightnessBoost = act * 6;
            const saturationBoost = act * 8;

            phaseRef.current += finalSpeed;
            const phase = phaseRef.current;

            // Draw one wave: solid color with a perpendicular alpha fade at the wave line.
            // Two waves are layered — a larger lighting-colored wave behind, and a smaller
            // terrain-colored wave in front — so both colors stay visible side by side.
            const drawWave = (
                offsetPhase: number,
                wavelengthMultiplier: number,
                alpha: number,
                leftYPercent: number,
                rightYPercent: number,
                color: HSLColor
            ) => {
                ctx.save();
                ctx.globalAlpha = alpha;

                const s = Math.min(100, color.s + saturationBoost);
                const l = Math.min(100, color.l + brightnessBoost);

                // Gradient axis follows the wave's slope so the transparent edge tracks the
                // wave line across the whole width (a purely vertical gradient would clip
                // whichever side rises higher).
                const leftCenterY = h * leftYPercent;
                const rightCenterY = h * rightYPercent;
                const dy = rightCenterY - leftCenterY;
                const segLen = Math.hypot(w, dy) || 1;
                const nx = -dy / segLen;
                const ny = w / segLen;
                const above = finalAmp * 1.3;
                const below = finalAmp * 0.5;
                const grad = ctx.createLinearGradient(
                    -nx * above, leftCenterY - ny * above,
                    nx * below, leftCenterY + ny * below,
                );
                grad.addColorStop(0, `hsla(${color.h}, ${s}%, ${l}%, 0)`);
                grad.addColorStop(0.55, `hsla(${color.h}, ${s}%, ${l}%, 1)`);
                grad.addColorStop(1, `hsla(${color.h}, ${s}%, ${l}%, 1)`);

                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.moveTo(-40, h + 40);
                for (let x = -40; x <= w + 40; x += 6) {
                    const ratio = (x + 40) / (w + 80);
                    const baseY = h * (leftYPercent + ratio * (rightYPercent - leftYPercent));
                    const angle = ratio * Math.PI * 2 * wavelengthMultiplier + phase + offsetPhase;
                    const y = baseY + Math.sin(angle) * finalAmp;
                    ctx.lineTo(x, y);
                }
                ctx.lineTo(w + 40, h + 40);
                ctx.closePath();
                ctx.fill();
                ctx.restore();
            };

            // Single terrain-colored wave. leftY < rightY produces the top-left → bottom-right slope.
            drawWave(Math.PI * 0.6, 1.4, 0.6, 0.72, 0.88, cur.c1);

            frameId = requestAnimationFrame(render);
        };

        frameId = requestAnimationFrame(render);

        return () => {
            cancelAnimationFrame(frameId);
            observer.disconnect();
        };
        // Only depend on isImmersionMode — color/lighting changes are read via refs so
        // the animation loop persists and `currentColors` lerps smoothly across rooms.
    }, [isImmersionMode]);

    // Render static fallback gradient if immersion mode is disabled
    if (!isImmersionMode) {
        const bgStyle = {
            background: `linear-gradient(180deg, 
                transparent 60%, 
                hsl(${targetColors.color1.h}, ${targetColors.color1.s}%, ${targetColors.color1.l}%) 82%, 
                hsl(${targetColors.color2.h}, ${targetColors.color2.s}%, ${targetColors.color2.l}%) 100%)`,
        };
        return (
            <div ref={containerRef} className="environment-glow-container" style={visibleHeight ? { height: `${visibleHeight}px` } : undefined}>
                <div className="environment-glow-fallback" style={bgStyle} />
                <div className="environment-glow-overlay" />
            </div>
        );
    }

    // Dynamic animated canvas container
    return (
        <div ref={containerRef} className="environment-glow-container" aria-hidden="true" style={visibleHeight ? { height: `${visibleHeight}px` } : undefined}>
            <canvas ref={canvasRef} className="environment-glow-canvas" />
            <div className="environment-glow-overlay" />
        </div>
    );
};

export default React.memo(EnvironmentGlow);
