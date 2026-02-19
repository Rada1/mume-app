import React, { useMemo } from 'react';

interface RainProps {
    heavy: boolean;
}

const Rain = React.memo(({ heavy }: RainProps) => {
    const drops = useMemo(() => {
        const count = heavy ? 150 : 80;
        return Array.from({ length: count }).map((_, i) => ({
            id: i,
            left: Math.random() * 100,
            delay: Math.random() * 2,
            duration: 0.5 + Math.random() * 0.3,
            opacity: 0.2 + Math.random() * 0.4,
            height: 20 + Math.random() * 20
        }));
    }, [heavy]);

    return (
        <div className="rain-container">
            {drops.map(d => (
                <div
                    key={d.id}
                    className="rain-drop"
                    style={{
                        left: `${d.left}%`,
                        height: `${d.height}px`,
                        opacity: d.opacity,
                        animationDelay: `-${d.delay}s`,
                        animationDuration: `${d.duration}s`
                    }}
                />
            ))}
        </div>
    );
});

export default Rain;
