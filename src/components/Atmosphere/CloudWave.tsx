import React, { useRef, useEffect } from 'react';

interface CloudWaveProps {
    storm?: boolean;
    lightning?: boolean;
}

export const CloudWave: React.FC<CloudWaveProps> = ({ storm, lightning }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const stormRef = useRef(storm);
    const lightningRef = useRef(lightning);
    useEffect(() => { stormRef.current = storm; }, [storm]);
    useEffect(() => { lightningRef.current = lightning; }, [lightning]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let frameId = 0;
        let phase = 0;
        const SPEED = 0.008;
        const AMPLITUDE = 14;
        const WAVELENGTHS = 2.5;

        const resize = () => {
            const dpr = window.devicePixelRatio || 1;
            const rect = canvas.getBoundingClientRect();
            canvas.width = rect.width * dpr;
            canvas.height = rect.height * dpr;
            ctx.scale(dpr, dpr);
        };
        resize();

        const observer = new ResizeObserver(resize);
        observer.observe(canvas);

        const render = () => {
            const w = canvas.width / (window.devicePixelRatio || 1);
            const h = canvas.height / (window.devicePixelRatio || 1);

            ctx.clearRect(0, 0, w, h);

            phase += SPEED;

            const baseY = h * 0.82;

            // Mirror the terrain wave gradient technique, inverted:
            // Stay fully opaque from top down to (baseY - 1.5*A), then fade
            // to transparent by (baseY + 0.5*A). Peaks (~baseY - A) end up
            // at ~75% alpha; troughs (~baseY + A) end up at 0% — giving a
            // soft, wave-shaped bottom edge exactly like the terrain glow.
            const above = AMPLITUDE * 1.5;
            const below = AMPLITUDE * 0.5;
            const gradEnd = baseY + below;
            const opaqueStop = Math.max(0, Math.min(0.99, (baseY - above) / gradEnd));

            const isStorm = stormRef.current;
            const isLightning = lightningRef.current;

            let fullColor: string;
            let zeroColor: string;
            if (isLightning) {
                fullColor = 'rgba(210, 215, 230, 0.20)';
                zeroColor = 'rgba(210, 215, 230, 0)';
            } else if (isStorm) {
                fullColor = 'rgba(40, 45, 60, 0.40)';
                zeroColor = 'rgba(40, 45, 60, 0)';
            } else {
                fullColor = 'rgba(165, 170, 185, 0.16)';
                zeroColor = 'rgba(165, 170, 185, 0)';
            }

            const grad = ctx.createLinearGradient(0, 0, 0, gradEnd);
            grad.addColorStop(0, fullColor);
            grad.addColorStop(opaqueStop, fullColor);
            grad.addColorStop(1, zeroColor);

            // Fill from top of canvas down to the sinusoidal wave line
            ctx.beginPath();
            ctx.moveTo(-10, -10);
            ctx.lineTo(w + 10, -10);
            for (let x = w + 10; x >= -10; x -= 3) {
                const ratio = x / w;
                const angle = ratio * Math.PI * 2 * WAVELENGTHS + phase;
                const y = baseY + Math.sin(angle) * AMPLITUDE;
                ctx.lineTo(x, y);
            }
            ctx.closePath();

            ctx.fillStyle = grad;
            ctx.fill();

            frameId = requestAnimationFrame(render);
        };

        frameId = requestAnimationFrame(render);

        return () => {
            cancelAnimationFrame(frameId);
            observer.disconnect();
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                pointerEvents: 'none',
                zIndex: 6,
            }}
        />
    );
};
