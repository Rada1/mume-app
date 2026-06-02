import React from 'react';

interface Props {
    handleType: 'top' | 'bottom' | 'left' | 'right' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'log-left' | 'log-right';
    widthVar: string;
    leftVar?: string;
    topVar?: string;
    rightVar?: string;
    bottomVar?: string;
    minWidth?: number;
    maxWidth?: number;
    minHeight?: number;
    maxHeight?: number;
}

export const DrawerResizeHandle: React.FC<Props> = ({
    handleType,
    widthVar,
    leftVar,
    topVar,
    rightVar,
    bottomVar,
    minWidth = 10,
    maxWidth = 42,
    minHeight = 10,
    maxHeight = 90
}) => {
    const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();

        const drawer = (e.currentTarget as HTMLElement).closest(
            '.map-drawer-desktop, .log-card-drawer, .message-log-container'
        ) as HTMLElement | null;
        if (!drawer) return;

        const startWidth = (drawer.offsetWidth / window.innerWidth) * 100;
        const startHeight = (drawer.offsetHeight / window.innerHeight) * 100;
        const startX = e.clientX;
        const startY = e.clientY;

        const getVwVal = (cssVar: string, defaultVal: number) => {
            const stored = JSON.parse(localStorage.getItem('mume-desktop-layout-v2') || '{}');
            if (stored[cssVar] !== undefined) return stored[cssVar];
            const val = window.getComputedStyle(document.documentElement).getPropertyValue(cssVar).trim();
            return val.endsWith('vw') ? parseFloat(val) : defaultVal;
        };

        const getVhVal = (cssVar: string, defaultVal: number) => {
            const stored = JSON.parse(localStorage.getItem('mume-desktop-layout-v2') || '{}');
            if (stored[cssVar] !== undefined) return stored[cssVar];
            const val = window.getComputedStyle(document.documentElement).getPropertyValue(cssVar).trim();
            return val.endsWith('vh') ? parseFloat(val) : defaultVal;
        };

        const startLeft = leftVar ? getVwVal(leftVar, 1) : 1;
        const startRight = rightVar ? getVwVal(rightVar, 1) : 1;
        const startTop = topVar ? getVhVal(topVar, 6) : 6;
        const startBottom = bottomVar ? getVhVal(bottomVar, 6) : 6;

        const onMove = (me: PointerEvent) => {
            const dxVw = ((me.clientX - startX) / window.innerWidth) * 100;
            const dyVh = ((me.clientY - startY) / window.innerHeight) * 100;

            // Handle log resizing (symmetrical from center)
            if (handleType === 'log-left') {
                const delta = -2 * dxVw;
                const nextWidth = Math.max(30, Math.min(95, startWidth + delta));
                document.documentElement.style.setProperty(widthVar, `${nextWidth}vw`);
            } else if (handleType === 'log-right') {
                const delta = 2 * dxVw;
                const nextWidth = Math.max(30, Math.min(95, startWidth + delta));
                document.documentElement.style.setProperty(widthVar, `${nextWidth}vw`);
            }
            // Handle standard drawer horizontal resizing
            else if (handleType.includes('left') || handleType === 'left') {
                if (leftVar) {
                    const rightEdge = startLeft + startWidth;
                    const nextWidth = Math.max(minWidth, Math.min(maxWidth, rightEdge - (startLeft + dxVw)));
                    const actualDelta = nextWidth - startWidth;
                    document.documentElement.style.setProperty(widthVar, `${nextWidth}vw`);
                    document.documentElement.style.setProperty(leftVar, `${Math.max(0, startLeft - actualDelta)}vw`);
                } else {
                    const nextWidth = Math.max(minWidth, Math.min(maxWidth, startWidth - dxVw));
                    document.documentElement.style.setProperty(widthVar, `${nextWidth}vw`);
                }
            } else if (handleType.includes('right') || handleType === 'right') {
                if (rightVar) {
                    const leftEdge = startRight + startWidth;
                    const nextWidth = Math.max(minWidth, Math.min(maxWidth, leftEdge - (startRight - dxVw)));
                    const actualDelta = nextWidth - startWidth;
                    document.documentElement.style.setProperty(widthVar, `${nextWidth}vw`);
                    document.documentElement.style.setProperty(rightVar, `${Math.max(0, startRight - actualDelta)}vw`);
                } else {
                    const nextWidth = Math.max(minWidth, Math.min(maxWidth, startWidth + dxVw));
                    document.documentElement.style.setProperty(widthVar, `${nextWidth}vw`);
                }
            }

            // Handle vertical resizing
            if (handleType.includes('top') || handleType === 'top') {
                if (topVar) {
                    const maxHeightVal = 100 - startBottom - minHeight;
                    const nextTop = Math.max(0, Math.min(maxHeightVal, startTop + dyVh));
                    document.documentElement.style.setProperty(topVar, `${nextTop}vh`);
                }
            } else if (handleType.includes('bottom') || handleType === 'bottom') {
                if (bottomVar) {
                    const maxHeightVal = 100 - startTop - minHeight;
                    const nextBottom = Math.max(0, Math.min(maxHeightVal, startBottom - dyVh));
                    document.documentElement.style.setProperty(bottomVar, `${nextBottom}vh`);
                }
            }
        };

        const onUp = () => {
            const stored = JSON.parse(localStorage.getItem('mume-desktop-layout-v2') || '{}');
            
            if (handleType.includes('left') || handleType.includes('right') || handleType === 'left' || handleType === 'right' || handleType === 'log-left' || handleType === 'log-right') {
                const w = parseFloat(document.documentElement.style.getPropertyValue(widthVar));
                if (!isNaN(w)) stored[widthVar] = w;
                
                if (leftVar) {
                    const l = parseFloat(document.documentElement.style.getPropertyValue(leftVar));
                    if (!isNaN(l)) stored[leftVar] = l;
                }
                if (rightVar) {
                    const r = parseFloat(document.documentElement.style.getPropertyValue(rightVar));
                    if (!isNaN(r)) stored[rightVar] = r;
                }
            }

            if (handleType.includes('top') || handleType === 'top') {
                if (topVar) {
                    const t = parseFloat(document.documentElement.style.getPropertyValue(topVar));
                    if (!isNaN(t)) stored[topVar] = t;
                }
            } else if (handleType.includes('bottom') || handleType === 'bottom') {
                if (bottomVar) {
                    const b = parseFloat(document.documentElement.style.getPropertyValue(bottomVar));
                    if (!isNaN(b)) stored[bottomVar] = b;
                }
            }

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
            className={`drawer-resize-handle drawer-resize-handle--${handleType}`}
            onPointerDown={handlePointerDown}
        />
    );
};
