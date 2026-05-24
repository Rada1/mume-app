import React from 'react';

interface Props {
    /** 'right' = right edge of left drawer | 'left' = left edge of right drawer */
    side: 'left' | 'right';
    cssVar: string;
    min?: number;
    max?: number;
}

export const DrawerResizeHandle: React.FC<Props> = ({ side, cssVar, min = 10, max = 42 }) => {
    const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();

        const drawer = (e.currentTarget as HTMLElement).closest(
            '.map-drawer-desktop, .log-card-drawer'
        ) as HTMLElement | null;
        const startWidthVw = drawer ? (drawer.offsetWidth / window.innerWidth) * 100 : 18;
        const startX = e.clientX;

        const onMove = (me: PointerEvent) => {
            const dxVw = ((me.clientX - startX) / window.innerWidth) * 100;
            const delta = side === 'right' ? dxVw : -dxVw;
            const next = Math.max(min, Math.min(max, startWidthVw + delta));
            document.documentElement.style.setProperty(cssVar, `${next}vw`);
        };

        const onUp = () => {
            const val = parseFloat(
                document.documentElement.style.getPropertyValue(cssVar) || '18'
            );
            const stored = JSON.parse(localStorage.getItem('mume-desktop-layout-v2') || '{}');
            stored[cssVar] = val;
            localStorage.setItem('mume-desktop-layout-v2', JSON.stringify(stored));
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', onUp);
            document.body.classList.remove('global-dragging');
        };

        document.body.classList.add('global-dragging');
        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);
    };

    return (
        <div
            className={`drawer-resize-handle drawer-resize-handle--${side}`}
            onPointerDown={handlePointerDown}
        />
    );
};
