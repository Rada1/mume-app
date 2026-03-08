import React, { useEffect, useRef } from 'react';

interface RainProps {
    heavy: boolean;
}

const Rain = React.memo(({ heavy }: RainProps) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let width = canvas.clientWidth;
        let height = canvas.clientHeight;
        canvas.width = width;
        canvas.height = height;

        const dropCount = heavy ? 100 : 50; // Reduced counts for canvas efficiency
        const drops: { x: number; y: number; l: number; v: number; o: number }[] = [];

        for (let i = 0; i < dropCount; i++) {
            drops.push({
                x: Math.random() * width,
                y: Math.random() * height,
                l: 15 + Math.random() * 15,
                v: 10 + Math.random() * 10,
                o: 0.1 + Math.random() * 0.3
            });
        }

        let animationFrameId: number;

        const animate = () => {
            ctx.clearRect(0, 0, width, height);
            ctx.strokeStyle = 'rgba(200, 220, 255, 0.5)';
            ctx.lineWidth = 1;

            for (let i = 0; i < dropCount; i++) {
                const d = drops[i];
                ctx.beginPath();
                ctx.globalAlpha = d.o;
                ctx.moveTo(d.x, d.y);
                ctx.lineTo(d.x, d.y + d.l);
                ctx.stroke();

                d.y += d.v;
                if (d.y > height) {
                    d.y = -d.l;
                    d.x = Math.random() * width;
                }
            }

            animationFrameId = requestAnimationFrame(animate);
        };

        const handleResize = () => {
            const w = canvas.clientWidth;
            const h = canvas.clientHeight;
            if (w === 0 || h === 0) return;
            
            if (canvas.width !== w || canvas.height !== h) {
                width = w;
                height = h;
                canvas.width = w;
                canvas.height = h;
            }
        };

        const ro = new ResizeObserver(() => requestAnimationFrame(handleResize));
        ro.observe(canvas);
        handleResize();
        animate();

        return () => {
            cancelAnimationFrame(animationFrameId);
            ro.disconnect();
        };
    }, [heavy]);

    return (
        <canvas
            ref={canvasRef}
            className="rain-container"
            style={{ width: '100%', height: '100%', display: 'block' }}
        />
    );
});

export default Rain;
