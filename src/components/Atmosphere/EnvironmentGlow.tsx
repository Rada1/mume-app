/**
 * @file EnvironmentGlow.tsx
 * @description Renders a dynamic, fluid environmental backdrop that reacts to terrain, lighting, and keyboard typing.
 */

import React, { useEffect, useRef, useMemo } from 'react';
import { useGame } from '../../context/GameContext';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { normalizeTerrain } from '../../utils/terrainUtils';
import { useInputStore } from '../../stores/useInputStore';
import {
    HSLColor,
    TERRAIN_CONFIGS,
    LIGHTING_COLORS,
    LIGHT_WAVE_HEIGHT_MULTIPLIER,
    adjustForTheme,
    lerp,
    lerpHue
} from './environmentGlowUtils';
import './EnvironmentGlow.css';

interface EnvironmentGlowProps {
    terrain?: string;
    lighting?: string;
    input: string;
}

export const EnvironmentGlow: React.FC<EnvironmentGlowProps> = ({
    terrain,
    lighting = 'none',
    input,
}) => {
    const isImmersionMode = useSettingsStore(s => s.isImmersionMode);
    const isPerformanceMode = useSettingsStore(s => s.isPerformanceMode);
    const theme = useSettingsStore(s => s.theme);
    const { viewport } = useGame() as any;
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);

    const isMobile = viewport?.isMobile;

    // Track typing activity triggers with target-easing to ensure a smooth, inertia-driven effect
    const prevInputLen = useRef(0);
    const typingActivityTarget = useRef(0);
    const typingActivityCurrent = useRef(0);

    const normTerrain = useMemo(() => normalizeTerrain(terrain || ''), [terrain]);
    const config = useMemo(() => TERRAIN_CONFIGS[normTerrain] || TERRAIN_CONFIGS.default, [normTerrain]);

    const isLightMode = theme === 'light';

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

    const currentColors = useRef({
        c1: { ...targetColors.color1 },
        c2: { ...targetColors.color2 },
        cL: { ...targetColors.lightingColor },
        speed: targetColors.speed,
        amplitude: targetColors.amplitude,
    });

    const targetColorsRef = useRef(targetColors);
    const lightingRef = useRef(lighting);
    useEffect(() => { targetColorsRef.current = targetColors; }, [targetColors]);
    useEffect(() => { lightingRef.current = lighting; }, [lighting]);

    const phaseRef = useRef(0);

    // Detect keyboard typing spikes
    useEffect(() => {
        const len = input.length;
        if (len !== prevInputLen.current) {
            typingActivityTarget.current = Math.min(1.0, typingActivityTarget.current + 0.22);
            prevInputLen.current = len;
        }
    }, [input]);

    // Detect command execution spikes
    useEffect(() => {
        const handleCommandSent = (e: Event) => {
            const customEvent = e as CustomEvent;
            if (customEvent.detail && !customEvent.detail.silent) {
                typingActivityTarget.current = Math.min(1.0, typingActivityTarget.current + 0.65);
            }
        };
        window.addEventListener('mume-command-sent', handleCommandSent);
        return () => window.removeEventListener('mume-command-sent', handleCommandSent);
    }, []);

    // Canvas animation loop
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !isImmersionMode || isPerformanceMode) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let frameId = 0;
        let lastFrameTime = 0;
        const FRAME_MS = 100; // 10fps for performance efficiency
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

            typingActivityTarget.current = lerp(typingActivityTarget.current, 0, 0.025);
            typingActivityCurrent.current = lerp(typingActivityCurrent.current, typingActivityTarget.current, 0.045);

            const act = typingActivityCurrent.current;
            const flicker = lightingRef.current === 'artificial' ? 1.0 + (Math.random() - 0.5) * 0.06 : 1.0;

            const finalSpeed = cur.speed * (1.0 + act * 0.35);
            const cssH = h / CANVAS_SCALE;
            const screenScale = Math.min(3.0, Math.max(0.6, cssH / 350));
            const finalAmp = cur.amplitude * screenScale * LIGHT_WAVE_HEIGHT_MULTIPLIER * (1.0 + act * 0.45) * flicker;

            const brightnessBoost = act * 6;
            const saturationBoost = act * 8;

            phaseRef.current += finalSpeed;
            const phase = phaseRef.current;

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

                if (isMobile) {
                    // Vertical wave along the right edge: right edge is "bottom" of the wave
                    const leftXPercent = leftYPercent;
                    const rightXPercent = rightYPercent;

                    const grad = ctx.createLinearGradient(
                        w * (leftXPercent - 0.15), 0,
                        w, 0
                    );
                    grad.addColorStop(0, `hsla(${color.h}, ${s}%, ${l}%, 0)`);
                    grad.addColorStop(0.5, `hsla(${color.h}, ${s}%, ${l}%, ${alpha})`);
                    grad.addColorStop(1, `hsla(${color.h}, ${s}%, ${l}%, 1)`);

                    ctx.fillStyle = grad;
                    ctx.beginPath();
                    ctx.moveTo(w + 40, -40);
                    for (let y = -40; y <= h + 40; y += 6) {
                        const ratio = (y + 40) / (h + 80);
                        const baseX = w * (leftXPercent + ratio * (rightXPercent - leftXPercent));
                        const angle = ratio * Math.PI * 2 * wavelengthMultiplier + phase + offsetPhase;
                        const x = baseX + Math.sin(angle) * finalAmp;
                        ctx.lineTo(x, y);
                    }
                    ctx.lineTo(w + 40, h + 40);
                    ctx.closePath();
                    ctx.fill();
                } else {
                    // Horizontal wave at the bottom
                    const leftCenterY = h * leftYPercent;
                    const grad = ctx.createLinearGradient(
                        0, leftCenterY - finalAmp * 2,
                        0, h
                    );
                    grad.addColorStop(0, `hsla(${color.h}, ${s}%, ${l}%, 0)`);
                    grad.addColorStop(0.5, `hsla(${color.h}, ${s}%, ${l}%, ${alpha})`);
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
                }
                ctx.restore();
            };

            const leftY = 0.72;
            const rightY = 0.88;

            // 1. Lighting-colored wave (larger, behind)
            drawWave(0, 0.9, 0.35, leftY - 0.08, rightY - 0.08, cur.cL);

            // 2. Terrain-colored wave (smaller, in front)
            drawWave(Math.PI * 0.6, 1.4, 0.6, leftY, rightY, cur.c1);

            frameId = requestAnimationFrame(render);
        };

        frameId = requestAnimationFrame(render);

        return () => {
            cancelAnimationFrame(frameId);
            observer.disconnect();
        };
    }, [isImmersionMode, isPerformanceMode, isMobile]);

    // Fallback static gradient
    if (!isImmersionMode || isPerformanceMode) {
        const bgStyle = isMobile ? {
            background: `linear-gradient(270deg, 
                hsl(${targetColors.color2.h}, ${targetColors.color2.s}%, ${targetColors.color2.l}%) 0%, 
                hsl(${targetColors.color1.h}, ${targetColors.color1.s}%, ${targetColors.color1.l}%) 20%, 
                transparent 40%)`,
        } : {
            background: `linear-gradient(180deg, 
                transparent 60%, 
                hsl(${targetColors.color1.h}, ${targetColors.color1.s}%, ${targetColors.color1.l}%) 82%, 
                hsl(${targetColors.color2.h}, ${targetColors.color2.s}%, ${targetColors.color2.l}%) 100%)`,
        };
        return (
            <div ref={containerRef} className="environment-glow-container">
                <div className="environment-glow-fallback" style={bgStyle} />
                <div className="environment-glow-overlay" />
            </div>
        );
    }

    return (
        <div ref={containerRef} className="environment-glow-container" aria-hidden="true">
            <canvas ref={canvasRef} className="environment-glow-canvas" />
            <div className="environment-glow-overlay" />
        </div>
    );
};

export default React.memo(EnvironmentGlow);
