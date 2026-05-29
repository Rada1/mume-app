import { RenderContext, drawLine, drawInkyLine } from './rendererUtils';
import { getZoneVisuals } from '../zoneFilters';
import { GRID_SIZE, DIRS, normalizeTerrain, ROAD_COLOR_DARK, ROAD_COLOR_LIGHT, PATH_COLOR_DARK, PATH_COLOR_LIGHT, getGateState, WALL_COLOR, LONG_CONNECTION_COLOR } from '../mapperUtils';
import { drawTerrainIcon, getTerrainTileInset, getRoomWalls } from './drawTerrains';
import { DETAIL_GRAYSCALE_FILTER, getRoomZone, isOutsideActiveZone } from './zoneFocusOverlay';

const hexToRgba = (hex: string, alpha: number): string => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
};

const getSquareIntersection = (x1: number, y1: number, x2: number, y2: number, w: number) => {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const theta = Math.atan2(dy, dx);
    const absCos = Math.abs(Math.cos(theta));
    const absSin = Math.abs(Math.sin(theta));
    
    let ox = 0;
    let oy = 0;
    if (absCos > 0.0001 && (absSin === 0 || w / absCos < w / absSin)) {
        ox = Math.sign(Math.cos(theta)) * w;
        oy = ox * Math.tan(theta);
    } else if (absSin > 0.0001) {
        oy = Math.sign(Math.sin(theta)) * w;
        ox = oy / Math.tan(theta);
    }
    return { x: x1 + ox, y: y1 + oy };
};

const drawArrowhead = (ctx: CanvasRenderingContext2D, x: number, y: number, angle: number, size: number, color: string) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-size, -size * 0.5);
    ctx.lineTo(-size * 0.7, 0);
    ctx.lineTo(-size, size * 0.5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
};


// Pre-render common indicators for performance
const indicatorIcons: Record<string, HTMLCanvasElement> = {};
export const getIndicatorIcon = (
    sym: string,
    color: string,
    outline: boolean = false,
    glowStrength: number = 7,
    noBackground: boolean = false,
    noBlackBg: boolean = false,
    size: number = 16
) => {
    const key = `${sym}_${color}_${outline}_${glowStrength}_${noBackground}_${noBlackBg}_${size}`;
    if (indicatorIcons[key]) return indicatorIcons[key];
    const canvas = document.createElement('canvas');
    
    // Calculate padding dynamically based on glowStrength to prevent clipping
    const padding = Math.max(8, Math.round(glowStrength * 1.2));
    const canvasSize = size + padding * 2;
    canvas.width = canvasSize; canvas.height = canvasSize;
    const ctx = canvas.getContext('2d')!;
    const center = canvasSize / 2;

    if (!noBackground && !noBlackBg) {
        // Draw fading black background for contrast
        const bgGradient = ctx.createRadialGradient(center, center, size * 0.25, center, center, size * 0.75);
        bgGradient.addColorStop(0, glowStrength > 10 ? 'rgba(0, 0, 0, 0.95)' : 'rgba(0, 0, 0, 0.85)');
        bgGradient.addColorStop(0.7, 'rgba(0, 0, 0, 0.3)');
        bgGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = bgGradient;
        ctx.beginPath();
        ctx.arc(center, center, size * 0.75, 0, Math.PI * 2);
        ctx.fill();
    }

    // For high-glow icons, draw a colored outer bloom ring/gradient
    if (!noBackground && glowStrength > 10) {
        const coloredGlow = ctx.createRadialGradient(center, center, size * 0.1, center, center, size * 0.9);
        if (noBlackBg) {
            // A more solid center bloom fading outwards when there is no black background
            coloredGlow.addColorStop(0, hexToRgba(color, 0.3));
            coloredGlow.addColorStop(0.5, hexToRgba(color, 0.1));
            coloredGlow.addColorStop(1, hexToRgba(color, 0.0));
        } else {
            // Ring bloom (legacy/contrast mode)
            coloredGlow.addColorStop(0, hexToRgba(color, 0.0));
            coloredGlow.addColorStop(0.55, hexToRgba(color, 0.22));
            coloredGlow.addColorStop(1, hexToRgba(color, 0.0));
        }
        ctx.fillStyle = coloredGlow;
        ctx.beginPath();
        ctx.arc(center, center, size * 0.9, 0, Math.PI * 2);
        ctx.fill();
    } else if (!noBackground) {
        const glowGradient = ctx.createRadialGradient(center, center, size * 0.15, center, center, size * 0.8);
        glowGradient.addColorStop(0, 'rgba(255, 255, 255, 0.15)');
        glowGradient.addColorStop(0.4, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = glowGradient;
        ctx.beginPath();
        ctx.arc(center, center, size * 0.8, 0, Math.PI * 2);
        ctx.fill();
    }

    const hasSuperscript = sym.includes('^');
    const baseChar = hasSuperscript ? sym.split('^')[0] : sym;
    const superChar = hasSuperscript ? sym.split('^')[1] : '';

    const isMob = sym.startsWith('mob:');
    const mobType = isMob ? sym.split(':')[1] : '';

    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = color;

    const drawStickFigure = (c: CanvasRenderingContext2D, x: number, y: number, h: number, stroke: boolean) => {
        c.save();
        c.fillStyle = color;
        c.strokeStyle = color;
        c.lineWidth = Math.max(1.2, h * 0.12);
        c.lineCap = 'round';
        c.lineJoin = 'round';

        if (stroke) {
            c.shadowColor = color;
            c.shadowBlur = glowStrength;
        }

        // Head
        const headR = h * 0.18;
        const headY = y - h * 0.28;
        c.beginPath();
        c.arc(x, headY, headR, 0, Math.PI * 2);
        c.fill();
        if (stroke) c.stroke();

        // Spine (Torso)
        const neckY = headY + headR;
        const hipsY = y + h * 0.15;
        c.beginPath();
        c.moveTo(x, neckY);
        c.lineTo(x, hipsY);
        c.stroke();

        // Arms
        const armY = neckY + h * 0.10;
        const armW = h * 0.28;
        c.beginPath();
        c.moveTo(x - armW, armY);
        c.lineTo(x + armW, armY);
        c.stroke();

        // Legs
        const legW = h * 0.22;
        const footY = y + h * 0.48;
        c.beginPath();
        c.moveTo(x, hipsY);
        c.lineTo(x - legW, footY);
        c.moveTo(x, hipsY);
        c.lineTo(x + legW, footY);
        c.stroke();

        c.restore();
    };

    const drawCrossedSwords = (c: CanvasRenderingContext2D, x: number, y: number, len: number, stroke: boolean, lineWidth: number = 1.8) => {
        c.save();
        c.strokeStyle = color; // use indicator's primary color
        c.lineWidth = lineWidth;
        c.lineCap = 'round';
        if (stroke) {
            c.shadowColor = color;
            c.shadowBlur = glowStrength;
        }

        const half = len / 2;
        c.beginPath();
        c.moveTo(x - half, y - half);
        c.lineTo(x + half, y + half);
        c.stroke();

        c.beginPath();
        c.moveTo(x + half, y - half);
        c.lineTo(x - half, y + half);
        c.stroke();
        c.restore();
    };

    const drawSnakeIcon = (c: CanvasRenderingContext2D, x: number, y: number, h: number, stroke: boolean) => {
        c.save();

        c.strokeStyle = '#800c0c';
        c.fillStyle = '#800c0c';
        c.lineCap = 'round';
        c.lineJoin = 'round';

        if (stroke) {
            c.shadowColor = '#800c0c';
            c.shadowBlur = glowStrength * 0.5;
        }

        // 1. Draw the head (teardrop shape)
        c.beginPath();
        c.ellipse(x, y - h * 0.36, h * 0.04, h * 0.055, 0, 0, Math.PI * 2);
        c.fill();

        // 2. Draw the main thick body
        c.beginPath();
        c.moveTo(x, y - h * 0.32);
        // Neck curving left
        c.bezierCurveTo(
            x - h * 0.15, y - h * 0.28,
            x - h * 0.15, y - h * 0.22,
            x + h * 0.05, y - h * 0.18
        );
        // First loop curving right
        c.bezierCurveTo(
            x + h * 0.36, y - h * 0.12,
            x + h * 0.32, y + h * 0.00,
            x - h * 0.05, y + h * 0.02
        );
        // Second loop curving left
        c.bezierCurveTo(
            x - h * 0.40, y + h * 0.05,
            x - h * 0.36, y + h * 0.20,
            x + h * 0.05, y + h * 0.22
        );
        // Third loop curving right
        c.bezierCurveTo(
            x + h * 0.38, y + h * 0.24,
            x + h * 0.25, y + h * 0.34,
            x - h * 0.08, y + h * 0.35
        );
        c.lineWidth = h * 0.055;
        c.stroke();

        // 3. Draw the tapering tail
        c.beginPath();
        c.moveTo(x - h * 0.08, y + h * 0.35);
        // Tail curving left and tapering down
        c.bezierCurveTo(
            x - h * 0.18, y + h * 0.36,
            x - h * 0.15, y + h * 0.43,
            x - h * 0.05, y + h * 0.48
        );
        c.lineWidth = h * 0.025;
        c.stroke();

        c.restore();

        // 4. Neon green ! above head
        c.save();
        c.font = `bold ${h * 0.28}px sans-serif`;
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.fillStyle = '#39ff14';
        if (stroke) {
            c.shadowColor = '#39ff14';
            c.shadowBlur = glowStrength * 0.6;
        }
        c.fillText('!', x, y - h * 0.54);
        c.restore();
    };

    const drawContent = (c: CanvasRenderingContext2D, stroke: boolean) => {
        if (isMob) {
            if (mobType === 'passive') {
                drawStickFigure(c, center, center, size * 0.80, stroke);
            } else if (mobType === 'aggressive') {
                // Thinner lines and smaller size for regular aggressive
                drawCrossedSwords(c, center, center, size * 0.38, stroke, 1.3);
            } else if (mobType === 'elite') {
                // Medium lines and medium size for elite (2 side-by-side)
                drawCrossedSwords(c, center - size * 0.16, center, size * 0.43, stroke, 2.0);
                drawCrossedSwords(c, center + size * 0.16, center, size * 0.43, stroke, 2.0);
            } else if (mobType === 'super') {
                // Thicker lines and larger size for super (3 in cluster)
                drawCrossedSwords(c, center, center - size * 0.12, size * 0.50, stroke, 2.8);
                drawCrossedSwords(c, center - size * 0.18, center + size * 0.16, size * 0.50, stroke, 2.8);
                drawCrossedSwords(c, center + size * 0.18, center + size * 0.16, size * 0.50, stroke, 2.8);
            } else if (mobType === 'quest') {
                // Base yellow exclamation point
                c.font = `bold ${size * 0.90}px "Inter", sans-serif`;
                c.fillStyle = '#f9e2af';
                c.strokeStyle = '#f9e2af';
                const baseQuestY = center - size * 0.15;
                if (stroke) {
                    c.strokeText('!', center, baseQuestY);
                } else {
                    c.fillText('!', center, baseQuestY);
                }
                // Small red X underneath
                drawCrossedSwords(c, center, center + size * 0.32, size * 0.35, stroke);
            } else if (mobType === 'rattlesnake') {
                // Centered red vector snake icon
                drawSnakeIcon(c, center, center, size * 0.85, stroke);
            }
        } else if (hasSuperscript) {
            c.font = `bold ${size}px "Inter", sans-serif`;
            const baseX = center - size * 0.12;
            const baseY = center + size * 0.05;
            if (stroke) {
                c.strokeText(baseChar, baseX, baseY);
            } else {
                c.fillText(baseChar, baseX, baseY);
            }

            let displaySuper = superChar;
            let superColor = color;
            let isEmoji = false;

            if (baseChar === 'G') {
                if (superChar === 'C') {
                    displaySuper = '✋';
                    superColor = '#fbbf24'; // Cleric yellow
                    isEmoji = true;
                } else if (superChar === 'W') {
                    displaySuper = '🗡'; // Warrior single sword
                    superColor = '#9c1010'; // Warrior deep red
                    isEmoji = true;
                } else if (superChar === 'M') {
                    displaySuper = '⚡'; // Mage lightning bolt
                    superColor = '#1d4ed8'; // Mage deep blue
                    isEmoji = true;
                } else if (superChar === 'R') {
                    displaySuper = '♧'; // Ranger leaf/club
                    superColor = '#15803d'; // Ranger deep green
                    isEmoji = true;
                } else if (superChar === 'S') {
                    displaySuper = '🏹'; // Scout bow
                    superColor = '#06b6d4'; // Scout cyan
                    isEmoji = true;
                }
            }

            c.save();
            if (isEmoji) {
                // Use Segoe UI Symbol first to render monochrome vector symbols that respect fillStyle/superColor
                c.font = `bold ${Math.round(size * 0.68)}px "Segoe UI Symbol", "Arial Unicode MS", sans-serif`;
                const superX = center + size * 0.36;
                const superY = center - size * 0.28;
                c.strokeStyle = '#000000';
                c.lineWidth = Math.max(2, size * 0.12);
                c.lineJoin = 'round';
                c.strokeText(displaySuper, superX, superY);
                c.fillStyle = superColor;
                c.fillText(displaySuper, superX, superY);
            } else {
                c.font = `bold ${Math.round(size * 0.72)}px "Inter", sans-serif`;
                const superX = center + size * 0.35;
                const superY = center - size * 0.28;
                c.strokeStyle = '#000000';
                c.lineWidth = Math.max(2, size * 0.12);
                c.lineJoin = 'round';
                c.strokeText(displaySuper, superX, superY);
                c.fillStyle = superColor;
                c.fillText(displaySuper, superX, superY);
            }
            c.restore();
        } else {
            c.font = `bold ${size}px "Inter", sans-serif`;
            if (stroke) {
                c.strokeText(sym, center, center);
            } else {
                c.fillText(sym, center, center);
            }
        }
    };

    if (outline) {
        ctx.shadowBlur = glowStrength;
        ctx.shadowColor = color;
        ctx.strokeStyle = color;
        ctx.lineWidth = size * 0.12;
        drawContent(ctx, true);
        ctx.shadowBlur = 0;
    } else if (glowStrength > 10) {
        ctx.shadowColor = color;
        ctx.globalAlpha = 0.35;
        ctx.shadowBlur = glowStrength * 1.5;
        drawContent(ctx, false);
        ctx.globalAlpha = 0.55;
        ctx.shadowBlur = glowStrength * 0.75;
        drawContent(ctx, false);
        ctx.globalAlpha = 1.0;
        ctx.shadowBlur = glowStrength * 0.3;
        drawContent(ctx, false);
        ctx.shadowBlur = 0;
    } else {
        ctx.shadowBlur = glowStrength;
        ctx.shadowColor = color;
        drawContent(ctx, false);
        ctx.shadowBlur = 0;
    }

    indicatorIcons[key] = canvas;
    return canvas;
};

const norideIconCache: Record<number, HTMLCanvasElement> = {};
const getNorideIcon = (size: number): HTMLCanvasElement => {
    if (norideIconCache[size]) return norideIconCache[size];
    const pad = 3;
    const cs = size + pad * 2;
    const canvas = document.createElement('canvas');
    canvas.width = cs; canvas.height = cs;
    const ctx = canvas.getContext('2d')!;
    const cx = cs / 2, cy = cs / 2;
    const r = size * 0.20;
    const lw = Math.max(1.0, size * 0.08);

    ctx.strokeStyle = '#888888';
    ctx.lineWidth = lw;
    ctx.lineCap = 'round';
    ctx.shadowColor = 'rgba(0,0,0,0.85)';
    ctx.shadowBlur = 3;

    ctx.beginPath();
    ctx.moveTo(cx - r, cy - r);
    ctx.lineTo(cx + r, cy + r);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(cx + r, cy - r);
    ctx.lineTo(cx - r, cy + r);
    ctx.stroke();

    norideIconCache[size] = canvas;
    return canvas;
};

const EXIT_FLAG_STYLES: Record<string, { color: string; style: string }> = {
    'FLOW':    { color: '#60a5fa', style: 'flow' },
    'FALL':    { color: '#fbbf24', style: 'fall' },
    'GUARDED': { color: '#fb923c', style: 'guarded' },
    'NO_FLEE': { color: '#dc2626', style: 'noflee' },
};

const DOTTED_EXIT_FLAGS: Record<string, string> = {
    'RANDOM':  '#a78bfa',
    'SPECIAL': '#22d3ee',
    'DAMAGE':  '#ef4444',
};

const OVERVIEW_ROUTE_ZOOM = 0.28;

const drawDottedExitLine = (
    ctx: CanvasRenderingContext2D,
    wx: number, wy: number, s: number,
    d: string, color: string, invZoom: number,
) => {
    const isNS = d === 'n' || d === 's';
    const margin = 7;
    const dotRadius = Math.max(1.2, 1.5 * invZoom);
    const spacing = 5.5;

    const x0 = isNS ? wx + margin : (d === 'e' ? wx + s : wx);
    const y0 = isNS ? (d === 'n' ? wy : wy + s) : wy + margin;
    const totalLen = s - margin * 2;
    const count = Math.floor(totalLen / spacing);

    ctx.save();
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.30;
    ctx.shadowColor = 'rgba(0,0,0,0.85)';
    ctx.shadowBlur = 6;
    for (let i = 0; i <= count; i++) {
        const t = i / count;
        const px = isNS ? x0 + totalLen * t : x0;
        const py = isNS ? y0 : y0 + totalLen * t;
        ctx.beginPath();
        ctx.arc(px, py, dotRadius, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();
};

const drawOverviewRouteLine = (
    ctx: CanvasRenderingContext2D,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    invZoom: number,
    alpha: number,
    dotted: boolean,
    roadColor: string = 'rgba(250, 252, 255, 0.98)',
) => {
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (dotted) {
        ctx.setLineDash([Math.max(3.5, 4.5 * invZoom), Math.max(3, 4 * invZoom)]);
    }

    ctx.globalAlpha = Math.min(1, alpha);
    ctx.strokeStyle = roadColor;
    ctx.lineWidth = Math.max(1.3, (dotted ? 1.65 : 2.25) * invZoom);
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    ctx.restore();
};

const drawExitFlagIndicators = (
    ctx: CanvasRenderingContext2D,
    wx: number, wy: number, s: number,
    d: string, flags: string[], invZoom: number,
) => {
    const toRender = Object.entries(EXIT_FLAG_STYLES).filter(([f]) => flags.includes(f)).map(([, v]) => v);
    if (toRender.length === 0) return;

    const isNS = d === 'n' || d === 's';
    // Exit edge midpoint and inward normal (into the room)
    const ex = isNS ? wx + s / 2 : (d === 'e' ? wx + s : wx);
    const ey = isNS ? (d === 'n' ? wy : wy + s) : wy + s / 2;
    const nx = isNS ? 0 : (d === 'e' ? -1 : 1);   // inward x
    const ny = isNS ? (d === 'n' ? 1 : -1) : 0;    // inward y
    // Outward (exit) direction
    const ox = -nx, oy = -ny;

    const inset = 5;
    const spacing = 8;
    const r = 3.5;
    const lw = Math.max(1.2, 1.5 * invZoom);

    for (let i = 0; i < toRender.length; i++) {
        const offset = (i - (toRender.length - 1) / 2) * spacing;
        const px = isNS ? ex + offset : ex + nx * inset;
        const py = isNS ? ey + ny * inset : ey + offset;
        const { color, style } = toRender[i];

        ctx.save();
        ctx.strokeStyle = color;
        ctx.fillStyle = color;
        ctx.lineWidth = lw;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.globalAlpha = 0.75;
        ctx.shadowColor = 'rgba(0,0,0,0.9)';
        ctx.shadowBlur = 4;

        if (style === 'damage') {
            // Red lightning zigzag
            ctx.beginPath();
            ctx.moveTo(px - r, py + r * 0.4);
            ctx.lineTo(px - r * 0.1, py - r);
            ctx.lineTo(px + r * 0.1, py);
            ctx.lineTo(px + r, py - r * 0.4);
            ctx.stroke();
        } else if (style === 'fall') {
            // Amber downward arrow (gravity always down)
            ctx.beginPath(); ctx.moveTo(px, py - r); ctx.lineTo(px, py + r); ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(px - r * 0.55, py + r * 0.3);
            ctx.lineTo(px, py + r);
            ctx.lineTo(px + r * 0.55, py + r * 0.3);
            ctx.stroke();
        } else if (style === 'guarded') {
            // Orange X
            ctx.beginPath(); ctx.moveTo(px - r, py - r); ctx.lineTo(px + r, py + r); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(px + r, py - r); ctx.lineTo(px - r, py + r); ctx.stroke();
        } else if (style === 'random') {
            // Purple scattered dots
            ctx.beginPath(); ctx.arc(px - r * 0.5, py - r * 0.5, 1.4, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(px + r * 0.5, py - r * 0.3, 1.4, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(px, py + r * 0.55, 1.4, 0, Math.PI * 2); ctx.fill();
        } else if (style === 'special') {
            // Cyan circle with center dot
            ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2); ctx.stroke();
            ctx.beginPath(); ctx.arc(px, py, 1.3, 0, Math.PI * 2); ctx.fill();
        } else if (style === 'noflee') {
            // Dark red double bars perpendicular to exit
            const bOff = 1.8;
            if (isNS) {
                ctx.beginPath(); ctx.moveTo(px - r, py - bOff); ctx.lineTo(px + r, py - bOff); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(px - r, py + bOff); ctx.lineTo(px + r, py + bOff); ctx.stroke();
            } else {
                ctx.beginPath(); ctx.moveTo(px - bOff, py - r); ctx.lineTo(px - bOff, py + r); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(px + bOff, py - r); ctx.lineTo(px + bOff, py + r); ctx.stroke();
            }
        } else if (style === 'flow') {
            // Blue arrow in exit direction
            ctx.beginPath();
            ctx.moveTo(px - ox * r, py - oy * r);
            ctx.lineTo(px + ox * r, py + oy * r);
            ctx.stroke();
            const ah = r * 0.65;
            ctx.beginPath();
            ctx.moveTo(px + ox * r - ox * ah - oy * ah, py + oy * r - oy * ah + ox * ah);
            ctx.lineTo(px + ox * r, py + oy * r);
            ctx.lineTo(px + ox * r - ox * ah + oy * ah, py + oy * r - oy * ah - ox * ah);
            ctx.stroke();
        }

        ctx.restore();
    }
};

const drawClimbIndicator = (
    ctx: CanvasRenderingContext2D,
    wx: number, wy: number,
    s: number,
    d: string,
    invZoom: number,
) => {
    const isNS = d === 'n' || d === 's';
    const margin = 7;
    const amp = 3.5;
    const waves = 3;
    const steps = 32;

    // Baseline runs along the exit edge
    const x0 = isNS ? wx + margin : (d === 'e' ? wx + s : wx);
    const y0 = isNS ? (d === 'n' ? wy : wy + s) : wy + margin;
    const totalDx = isNS ? s - margin * 2 : 0;
    const totalDy = isNS ? 0 : s - margin * 2;

    ctx.save();
    ctx.globalAlpha = 0.25;
    ctx.strokeStyle = 'rgba(200, 200, 200, 1.0)';
    ctx.lineWidth = 2.0 * invZoom;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const wave = Math.sin(t * Math.PI * 2 * waves) * amp;
        const px = x0 + totalDx * t + (isNS ? 0 : wave);
        const py = y0 + totalDy * t + (isNS ? wave : 0);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.restore();
};

export const drawRoomFlagsOptimized = (
    ctx: CanvasRenderingContext2D,
    anchorX: number,
    anchorY: number,
    zoom: number,
    mobF: string[],
    loadF: string[],
    questF: string[],
    scale: number = 1.0
) => {
    type Indicator = { regex: RegExp, sym: string, color: string, size: number, glowStrength?: number, noBlackBg?: boolean };

    // Priority order: danger first, then services, then loot/resources
    const indicators: Indicator[] = [
        // --- Danger ---
        { regex: /DEATHTRAP/i,                                          sym: '☠', color: '#ff3030', size: 20, glowStrength: 14, noBlackBg: true },
        { regex: /AGGRESSIVE_MOB/i,                                     sym: 'mob:aggressive', color: '#800c0c', size: 26, glowStrength: 12, noBlackBg: true },
        { regex: /SUPER_MOB/i,                                          sym: 'mob:super', color: '#de1f1f', size: 26, glowStrength: 12, noBlackBg: true },
        { regex: /ELITE_MOB/i,                                          sym: 'mob:elite', color: '#9c1010', size: 26, glowStrength: 12, noBlackBg: true },
        { regex: /RATTLESNAKE/i,                                        sym: 'mob:rattlesnake', color: '#800c0c', size: 26, glowStrength: 12, noBlackBg: true },
        // --- Quest / mission ---
        { regex: /QUEST/i,                                              sym: 'mob:quest', color: '#f9e2af', size: 26, glowStrength: 12, noBlackBg: true },
        // --- Mob services ---
        { regex: /RENT/i,                                               sym: 'R', color: '#89b4fa', size: 15 },
        { regex: /WEAPON_SHOP/i,                                        sym: 'S^⚔', color: '#a6e3a1', size: 15 },
        { regex: /ARMOUR_SHOP/i,                                        sym: 'S^🛡', color: '#a6e3a1', size: 15 },
        { regex: /FOOD_SHOP/i,                                          sym: 'S^F', color: '#a6e3a1', size: 15 },
        { regex: /PET_SHOP/i,                                           sym: 'S^P', color: '#a6e3a1', size: 15 },
        { regex: /SHOP/i,                                               sym: 'S', color: '#a6e3a1', size: 15 },
        { regex: /MAGE_GUILD/i,                                         sym: 'G^M', color: '#89b4fa', size: 15 },
        { regex: /CLERIC_GUILD/i,                                       sym: 'G^C', color: '#89b4fa', size: 15 },
        { regex: /WARRIOR_GUILD/i,                                      sym: 'G^W', color: '#89b4fa', size: 15 },
        { regex: /RANGER_GUILD/i,                                       sym: 'G^R', color: '#89b4fa', size: 15 },
        { regex: /SCOUT_GUILD/i,                                        sym: 'G^S', color: '#89b4fa', size: 15 },
        { regex: /GUILD/i,                                              sym: 'G', color: '#89b4fa', size: 15 },
        { regex: /MILKABLE/i,                                           sym: '🐄', color: '#e8d5c0', size: 13 },
        { regex: /PASSIVE_MOB/i,                                        sym: 'mob:passive', color: '#800c0c', size: 26, glowStrength: 12, noBlackBg: true },
        // --- Valuables ---
        { regex: /TREASURE/i,                                           sym: '💎', color: '#ffd700', size: 14 },
        { regex: /WEAPON(?!_SHOP)/i,                                    sym: '🗡', color: '#bac2de', size: 15 },
        { regex: /ARMOUR(?!_SHOP)/i,                                    sym: '🛡', color: '#9399b2', size: 13 },
        { regex: /EQUIPMENT/i,                                          sym: '⚙', color: '#9399b2', size: 13 },
        { regex: /KEY/i,                                                sym: '🔑', color: '#f9e2af', size: 13 },
        // --- Resources ---
        { regex: /HERB/i,                                               sym: '♣', color: '#a6e3a1', size: 15 },
        { regex: /WATER|POND|WELL|FOUNTAIN/i,                           sym: '≈', color: '#89b4fa', size: 15 },
        { regex: /FOOD(?!_SHOP)/i,                                      sym: '🍖', color: '#fab387', size: 13 },
        // --- Mounts / transport ---
        { regex: /STABLE/i,                                             sym: '⌂', color: '#fab387', size: 15 },
        { regex: /WARG|WOLF/i,                                          sym: '🐾', color: '#ffffff', size: 15 },
        { regex: /MULE/i,                                               sym: '🫏', color: '#a6adc8', size: 15 },
        { regex: /PONY/i,                                               sym: '♞', color: '#fab387', size: 14 },
        { regex: /ROHIRRIM|PACK_HORSE|TRAINED_HORSE|HORSE/i,            sym: '♘', color: '#e8b86d', size: 15 },
        { regex: /BOAT/i,                                               sym: '🛶', color: '#74c7ec', size: 14 },
        { regex: /FERRY/i,                                              sym: '⚓', color: '#5fb3e0', size: 14 },
        { regex: /COACH/i,                                              sym: 'C', color: '#c9a66b', size: 13 },
        // --- Infrastructure ---
        { regex: /TOWER/i,                                              sym: '△', color: '#9399b2', size: 14 },
        { regex: /MAIL/i,                                               sym: '✉', color: '#cdd6f4', size: 13 },
        { regex: /CLOCK/i,                                              sym: '◔', color: '#f9e2af', size: 13 },
        { regex: /ATTENTION/i,                                          sym: '⚑', color: '#fab387', size: 13 },
        { regex: /WHITE_WORD/i,                                         sym: 'W', color: '#eeeeee', size: 12 },
        { regex: /DARK_WORD/i,                                          sym: 'D', color: '#7f849c', size: 12 },
    ];

    const mobFlagsStr = mobF.join('|').toUpperCase();
    const loadFlagsStr = loadF.join('|').toUpperCase();
    const hasQuest = questF.length > 0 || /QUEST/i.test([...mobF, ...loadF].join('|'));

    // First pass: collect matching indicators (deduplicated by symbol)
    const mobMatched: Indicator[] = [];
    const loadMatched: Indicator[] = [];
    const seenSyms = new Set<string>();
    let hasSpecificGuild = false;
    let hasSpecificShop = false;

    for (const ind of indicators) {
        if (seenSyms.has(ind.sym)) continue;
        
        // Skip generic guild/shop if specific ones were already matched
        if (/^GUILD$/i.test(ind.regex.source) && hasSpecificGuild) continue;
        if (/^SHOP$/i.test(ind.regex.source) && hasSpecificShop) continue;

        const isLoadIndicator = /TREASURE|WEAPON(?!_SHOP)|ARMOUR(?!_SHOP)|EQUIPMENT|KEY|HERB|WATER|POND|WELL|FOUNTAIN|FOOD(?!_SHOP)/i.test(ind.regex.source);

        if (isLoadIndicator) {
            const matches = ind.regex.test(loadFlagsStr);
            if (matches) {
                loadMatched.push(ind);
                seenSyms.add(ind.sym);
            }
        } else {
            const matches = ind.sym === '?' ? hasQuest : ind.regex.test(mobFlagsStr);
            if (matches) {
                mobMatched.push(ind);
                seenSyms.add(ind.sym);
                
                // Track if we matched a specific subclass
                if (/MAGE_GUILD|CLERIC_GUILD|WARRIOR_GUILD|RANGER_GUILD|SCOUT_GUILD/i.test(ind.regex.source)) {
                    hasSpecificGuild = true;
                }
                if (/WEAPON_SHOP|ARMOUR_SHOP|FOOD_SHOP|PET_SHOP/i.test(ind.regex.source)) {
                    hasSpecificShop = true;
                }
            }
        }
    }

    // 1. Draw mob/status flags in the center of the tile
    if (mobMatched.length > 0) {
        const totalW = mobMatched.reduce((sum, ind) => sum + ind.size + 4, 0);
        let off = -totalW / 2 + (mobMatched[0]?.size ?? 0) / 2;
        for (const ind of mobMatched) {
            const icon = getIndicatorIcon(ind.sym, ind.color, false, ind.glowStrength, false, true, ind.size);
            ctx.save();
            ctx.translate(anchorX + off, anchorY);
            ctx.scale(scale, scale);
            ctx.drawImage(icon, -icon.width / 2, -icon.height / 2);
            
            ctx.restore();
            off += ind.size + 4;
        }
    }

    // 2. Draw load/item flags on the outskirts (smaller)
    if (loadMatched.length > 0) {
        const loadCount = loadMatched.length;
        for (let i = 0; i < loadCount; i++) {
            const ind = loadMatched[i];
            const angle = (i / loadCount) * Math.PI * 2 - Math.PI / 4;
            const radius = GRID_SIZE * 0.36; // 18 pixels outwards
            const ox = Math.cos(angle) * radius;
            const oy = Math.sin(angle) * radius;

            const size = Math.max(9, Math.round(ind.size * 0.75));
            const icon = getIndicatorIcon(ind.sym, ind.color, false, ind.glowStrength, false, true, size);
            
            ctx.save();
            ctx.translate(anchorX + ox, anchorY + oy);
            ctx.scale(scale, scale);
            ctx.drawImage(icon, -icon.width / 2, -icon.height / 2);
            
            ctx.restore();
        }
    }
};

export const drawFeatures = (
    rCtx: RenderContext,
    bX1: number, bY1: number, bX2: number, bY2: number,
    floorIndex: Record<string, string[]>
) => {
    const { ctx, dpr, isDarkMode, invZoom, currentZ, explored, unveilMap, allRooms, preloaded, camera, baseMapExitsRef } = rCtx;
    const s = GRID_SIZE;
    const roadSegments: {
        x1: number;
        y1: number;
        x2: number;
        y2: number;
        lineWidth: number;
        roadColor: string;
        globalAlpha: number;
        isFade: boolean;
        isTrail: boolean;
    }[] = [];
    const useOverviewRoutes = camera.zoom < OVERVIEW_ROUTE_ZOOM;

    // Fast return if no buckets
    if (!floorIndex) return;

    // Compute two-ring fog-of-war visibility sets
    const ring1Revealed = new Set<string>(); // adjacent to explored → grayscale terrain, no flags
    const ring2Peeked = new Set<string>();   // adjacent to ring-1 → faint wall hints only
    if (!unveilMap) {
        for (let bx = bX1; bx <= bX2; bx++) {
            for (let by = bY1; by <= bY2; by++) {
                const bucket = floorIndex[`${bx},${by}`];
                if (!bucket) continue;
                for (let i = 0; i < bucket.length; i++) {
                    const vnum = bucket[i];
                    if (explored.has(vnum)) continue;
                    const rData = preloaded[vnum];
                    if (!rData?.[4]) continue;
                    for (const dir of ['n', 's', 'e', 'w']) {
                        const exit = rData[4][dir];
                        if (exit && explored.has(String(exit.target))) { ring1Revealed.add(vnum); break; }
                    }
                }
            }
        }
        for (let bx = bX1; bx <= bX2; bx++) {
            for (let by = bY1; by <= bY2; by++) {
                const bucket = floorIndex[`${bx},${by}`];
                if (!bucket) continue;
                for (let i = 0; i < bucket.length; i++) {
                    const vnum = bucket[i];
                    if (explored.has(vnum) || ring1Revealed.has(vnum)) continue;
                    const rData = preloaded[vnum];
                    if (!rData?.[4]) continue;
                    for (const dir of ['n', 's', 'e', 'w']) {
                        const exit = rData[4][dir];
                        if (exit && ring1Revealed.has(String(exit.target))) { ring2Peeked.add(vnum); break; }
                    }
                }
            }
        }
    }

    // --- Pass 1: Collect and render roads and trails first so they are below doors, walls, and flags ---
    for (let bx = bX1; bx <= bX2; bx++) {
        for (let by = bY1; by <= bY2; by++) {
            const bucket = floorIndex[`${bx},${by}`];
            if (!bucket) continue;
            for (let i = 0; i < bucket.length; i++) {
                const vnum = bucket[i];
                const rData = preloaded[vnum];
                if (!rData) continue;

                const isExplored = explored.has(vnum);
                const isRevealed = !isExplored && ring1Revealed.has(vnum);
                const ghostExits = rData[4];

                if (!isExplored && !isRevealed && !unveilMap) continue;

                const rx = rData[0], ry = rData[1], tSector = rData[3];
                const anchorX = rx * s + s / 2, anchorY = ry * s + s / 2;
                const localRoom = allRooms[`m_${vnum}`] || allRooms[vnum];
                const zoneName = localRoom?.zone || rData[9] || '';
                const zoneVis = getZoneVisuals(zoneName, isDarkMode, rCtx.zoneFilters);

                // Calculate fade-in for newly explored rooms (skip for active room)
                let exploredAlphaMul = 1.0;
                const isActive = vnum && rCtx.activeId && (
                    vnum === rCtx.activeId || 
                    `m_${vnum}` === rCtx.activeId || 
                    vnum === `m_${rCtx.activeId}`
                );
                if (!isActive && isExplored && rCtx.firstExploredAtRef.current[vnum] && !unveilMap) {
                    const elapsed = rCtx.now - rCtx.firstExploredAtRef.current[vnum];
                    const animDur = 800;
                    if (elapsed < animDur) {
                        exploredAlphaMul = elapsed / animDur;
                    }
                }

                if (ghostExits && Object.keys(ghostExits).length > 0 && camera.zoom < 3.0 && (camera.zoom >= (useOverviewRoutes ? 0.03 : 0.15) || unveilMap)) {
                    const currentRoomObj = localRoom || { terrain: tSector, exits: {} };
                    const isCurrentRoad = normalizeTerrain(currentRoomObj.terrain) === 'Road';
                    const currentName = String(localRoom?.name || rData[5] || '').toLowerCase();
                    for (const dir in ghostExits) {
                        const exObj = ghostExits[dir]; if (!exObj) continue;
                        const targetVnum = String(exObj.target), targetData = preloaded[targetVnum];
                        if (targetData && (Math.abs(targetData[2] - currentZ) <= 0.5 || ((dir === 'u' || dir === 'd') && Math.abs(targetData[2] - currentZ) <= 1.5))) {
                            const isTargetExplored = explored.has(targetVnum);
                            const isTargetRevealed = ring1Revealed.has(targetVnum);

                            if (!unveilMap && !isExplored && !isRevealed && !isTargetExplored && !isTargetRevealed) continue;

                            const ardaMapping = preloaded[vnum];
                            const sId = ardaMapping ? String(ardaMapping[6]) : vnum;
                            const ardaExit = baseMapExitsRef.current[sId]?.[4]?.[dir];

                            const combinedFlags = [
                                ...(ardaExit?.flags || []),
                                ...(currentRoomObj.exits?.[dir]?.flags || []),
                                ...(exObj.flags || [])
                            ];
                            const hasRoadFlag = combinedFlags.some((f: string) => /road|trail|path/i.test(String(f)));
                            const targetName = String(targetData[5] || '').toLowerCase();
                            const isTrail = /trail|path/.test(currentName) || /trail|path/.test(targetName);

                            if (hasRoadFlag) {
                                const tpx = targetData[0] * s + s / 2, tpy = targetData[1] * s + s / 2;
                                const isRoad = !isTrail && isCurrentRoad && normalizeTerrain(targetData[3] as any) === 'Road';
                                const defaultRoadColor = isDarkMode
                                    ? (isRoad 
                                        ? (rCtx.mapTileVisuals?.roadColorDark || ROAD_COLOR_DARK) 
                                        : (rCtx.mapTileVisuals?.pathColorDark || PATH_COLOR_DARK))
                                    : (isRoad 
                                        ? (rCtx.mapTileVisuals?.roadColorLight || ROAD_COLOR_LIGHT) 
                                        : (rCtx.mapTileVisuals?.pathColorLight || PATH_COLOR_LIGHT));
                                const roadColor = isRoad
                                    ? (zoneVis.roadColor || defaultRoadColor)
                                    : (zoneVis.pathColor || defaultRoadColor);
                                const lineWidth = isRoad ? 12 : 6;

                                let globalAlpha = 1.0;
                                let isFade = false;
                                if (unveilMap) {
                                    globalAlpha = 1.0;
                                } else if (!isExplored && !isRevealed) {
                                    continue;
                                } else if (!isTargetExplored && !isTargetRevealed) {
                                    globalAlpha = isRevealed ? 0.25 : exploredAlphaMul;
                                    isFade = true;
                                } else {
                                    let alpha = 1.0;
                                    if (!isExplored || !isTargetExplored) {
                                        alpha = (isExplored || isTargetExplored) ? 0.6 : 0.3;
                                    }
                                    globalAlpha = alpha * exploredAlphaMul;
                                }

                                roadSegments.push({
                                    x1: anchorX,
                                    y1: anchorY,
                                    x2: tpx,
                                    y2: tpy,
                                    lineWidth,
                                    roadColor,
                                    globalAlpha,
                                    isFade,
                                    isTrail
                                });
                            }
                        }
                    }
                }
            }
        }
    }

    // --- Render Road & Trail Borders ---
    for (const seg of roadSegments) {
        if (useOverviewRoutes) continue;
        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.globalAlpha = seg.globalAlpha;
        if (seg.isFade) {
            const borderGrad = ctx.createLinearGradient(seg.x1, seg.y1, seg.x2, seg.y2);
            borderGrad.addColorStop(0, '#000000');
            borderGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.strokeStyle = borderGrad;
            ctx.lineWidth = seg.lineWidth + 2.0 * invZoom;
            ctx.beginPath();
            ctx.moveTo(seg.x1, seg.y1);
            ctx.lineTo(seg.x2, seg.y2);
            ctx.stroke();
        } else {
            drawLine(ctx, seg.x1, seg.y1, seg.x2, seg.y2, '#000000', seg.lineWidth + 2.0 * invZoom, dpr, invZoom);
        }
        ctx.restore();
    }

    // --- Render Road & Trail Fills ---
    for (const seg of roadSegments) {
        if (useOverviewRoutes) {
            drawOverviewRouteLine(ctx, seg.x1, seg.y1, seg.x2, seg.y2, invZoom, seg.globalAlpha, seg.isTrail, seg.roadColor);
            continue;
        }

        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.globalAlpha = seg.globalAlpha;
        if (seg.isFade) {
            const grad = ctx.createLinearGradient(seg.x1, seg.y1, seg.x2, seg.y2);
            grad.addColorStop(0, seg.roadColor);
            grad.addColorStop(1, hexToRgba(seg.roadColor, 0));
            ctx.strokeStyle = grad;
            ctx.lineWidth = seg.lineWidth;
            ctx.beginPath();
            ctx.moveTo(seg.x1, seg.y1);
            ctx.lineTo(seg.x2, seg.y2);
            ctx.stroke();
        } else {
            drawLine(ctx, seg.x1, seg.y1, seg.x2, seg.y2, seg.roadColor, seg.lineWidth, dpr, invZoom);
        }

        // Draw textured dirt/gravel specks along the line
        const dx = seg.x2 - seg.x1;
        const dy = seg.y2 - seg.y1;
        const len = Math.sqrt(dx * dx + dy * dy);
        if (len > 0) {
            const nx = -dy / len;
            const ny = dx / len;
            const speckCount = Math.floor(len * (seg.lineWidth > 8 ? 0.45 : 0.28));
            ctx.save();
            ctx.globalAlpha = seg.globalAlpha * 0.40;
            for (let j = 0; j < speckCount; j++) {
                const seed = Math.sin(seg.x1 * 12.9898 + seg.y1 * 78.233 + j * 93.19) * 43758.5453;
                const randT = (Math.abs(seed) % 1);
                const maxOffset = Math.max(1, (seg.lineWidth - 2.5 * invZoom) / 2);
                const randOffset = ((Math.abs(seed * 7.1) % 1) - 0.5) * maxOffset;
                const randSize = 0.5 + (Math.abs(seed * 13.3) % 1) * 0.8 * invZoom;

                const px = seg.x1 + dx * randT + nx * randOffset;
                const py = seg.y1 + dy * randT + ny * randOffset;

                const isDark = (j % 2 === 0);
                ctx.fillStyle = isDark
                    ? (isDarkMode ? '#000000' : 'rgba(50, 30, 10, 0.75)')
                    : (isDarkMode ? '#555555' : 'rgba(255, 255, 255, 0.85)');

                ctx.beginPath();
                ctx.arc(px, py, randSize, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
        }

        ctx.restore();
    }

    // --- Pass 2: Draw everything else (walls, doors, flags, etc.) ---
    for (let bx = bX1; bx <= bX2; bx++) {
        for (let by = bY1; by <= bY2; by++) {
            const bucket = floorIndex[`${bx},${by}`];
            if (!bucket) continue;
            for (let i = 0; i < bucket.length; i++) {
                const vnum = bucket[i];
                const rData = preloaded[vnum];
                if (!rData) continue;

                const isExplored = explored.has(vnum);
                const isRevealed = !isExplored && ring1Revealed.has(vnum);
                let isPeeked = false;
                const peekDirs: string[] = [];

                if (!isExplored && !isRevealed && !unveilMap) {
                    const ghostExits = rData[4];
                    if (ghostExits && ring2Peeked.has(vnum)) {
                        for (const dir of ['n', 's', 'e', 'w']) {
                            const exit = ghostExits[dir];
                            if (exit && ring1Revealed.has(String(exit.target))) {
                                isPeeked = true;
                                peekDirs.push(dir);
                            }
                        }
                    }
                }

                if (!isExplored && !isRevealed && !isPeeked && !unveilMap) continue;

                const rx = rData[0], ry = rData[1], tSector = rData[3], ghostExits = rData[4];
                const wx = Math.round(rx) * s, wy = Math.round(ry) * s;
                const anchorX = rx * s + s / 2, anchorY = ry * s + s / 2;
                const localRoom = allRooms[`m_${vnum}`] || allRooms[vnum];
                const zoneName = localRoom?.zone || rData[9] || '';
                const zoneVis = getZoneVisuals(zoneName, isDarkMode, rCtx.zoneFilters);
                const currentWallColor = zoneVis.wallColor || rCtx.mapTileVisuals?.wallColor || WALL_COLOR;
                const currentDoorColor = zoneVis.doorColor || rCtx.mapTileVisuals?.doorColor || '#ffcc00';

                // Calculate fade-in for newly explored rooms (skip for active room)
                let exploredAlphaMul = 1.0;
                const isActive = vnum && rCtx.activeId && (
                    vnum === rCtx.activeId || 
                    `m_${vnum}` === rCtx.activeId || 
                    vnum === `m_${rCtx.activeId}`
                );
                if (!isActive && isExplored && rCtx.firstExploredAtRef.current[vnum] && !unveilMap) {
                    const elapsed = rCtx.now - rCtx.firstExploredAtRef.current[vnum];
                    const animDur = 800;
                    if (elapsed < animDur) {
                        exploredAlphaMul = elapsed / animDur;
                        rCtx.triggerRender?.();
                    }
                }

                // 1. Vertical Arrow Connections (Bidirectional Only, Zoom > 0.3)
                if (ghostExits && Object.keys(ghostExits).length > 0 && camera.zoom > 0.3) {
                    for (const dir in ghostExits) {
                        if (dir !== 'u' && dir !== 'd') continue;
                        const exObj = ghostExits[dir]; if (!exObj) continue;
                        const targetVnum = String(exObj.target), targetData = preloaded[targetVnum];
                        if (targetData && (Math.abs(targetData[2] - currentZ) <= 1.5)) {
                            const isTargetExplored = explored.has(targetVnum);
                            const isTargetRevealed = ring1Revealed.has(targetVnum);

                            if (!unveilMap && !isExplored && !isRevealed && !isTargetExplored && !isTargetRevealed) continue;

                            const oppDir = dir === 'u' ? 'd' : 'u';
                            const targetExits = targetData[4];
                            const pointsBack = targetExits?.[oppDir] &&
                                String(targetExits[oppDir].target).replace(/^m_/, '') === String(vnum).replace(/^m_/, '');

                            if (pointsBack) {
                                const iconColor = 'rgba(148, 163, 184, 0.8)';
                                const cOff = 12;
                                const startX = anchorX + (dir === 'u' ? -cOff : cOff);
                                const startY = anchorY + (dir === 'u' ? -cOff : cOff);
                                const endX = targetData[0] * s + s / 2 + (dir === 'u' ? cOff : -cOff);
                                const endY = targetData[1] * s + s / 2 + (dir === 'u' ? cOff : -cOff);

                                ctx.save();
                                if (unveilMap) ctx.globalAlpha = 1.0;
                                else if (!isExplored && !isRevealed) ctx.globalAlpha = 0.15;
                                else if (isRevealed) ctx.globalAlpha = 0.3;
                                else ctx.globalAlpha = exploredAlphaMul * 0.5;
                                drawLine(ctx, startX, startY, endX, endY, iconColor, 1.5, dpr, invZoom, true);
                                ctx.restore();
                            }
                        }
                    }
                }

                // 1.2. Long-Distance Exit Connections (Cardinals & Intercardinals, Zoom > 0.3)
                if (ghostExits && Object.keys(ghostExits).length > 0 && camera.zoom > 0.3) {
                    for (const dir in ghostExits) {
                        if (dir === 'u' || dir === 'd') continue;
                        const exObj = ghostExits[dir]; if (!exObj) continue;
                        const targetVnum = String(exObj.target), targetData = preloaded[targetVnum];
                        if (targetData && (Math.abs(targetData[2] - currentZ) <= 0.5)) {
                            const isTargetExplored = explored.has(targetVnum);
                            const isTargetRevealed = ring1Revealed.has(targetVnum);

                            if (!unveilMap && !isExplored && !isRevealed && !isTargetExplored && !isTargetRevealed) continue;

                            const dx = Math.abs(rx - targetData[0]);
                            const dy = Math.abs(ry - targetData[1]);
                            if (dx > 1.1 || dy > 1.1) {
                                // Long-distance connection!
                                const oppDir = DIRS[dir]?.opp || '';
                                const targetExits = targetData[4];
                                const pointsBack = targetExits?.[oppDir] &&
                                    String(targetExits[oppDir].target).replace(/^m_/, '') === String(vnum).replace(/^m_/, '');

                                // De-duplicate bidirectional connections (draw only once)
                                if (pointsBack && vnum >= targetVnum) continue;

                                const arrowColor = 'rgba(148, 163, 184, 0.8)';
                                const arrowheadColor = 'rgba(148, 163, 184, 0.8)';

                                const centerA = { x: anchorX, y: anchorY };
                                const centerB = { x: targetData[0] * s + s / 2, y: targetData[1] * s + s / 2 };

                                const pStart = getSquareIntersection(centerA.x, centerA.y, centerB.x, centerB.y, s / 2);
                                const pEnd = getSquareIntersection(centerB.x, centerB.y, centerA.x, centerA.y, s / 2);

                                ctx.save();
                                if (unveilMap) ctx.globalAlpha = 1.0;
                                else if (!isExplored && !isRevealed) ctx.globalAlpha = 0.15;
                                else if (isRevealed) ctx.globalAlpha = 0.3;
                                else ctx.globalAlpha = exploredAlphaMul * 0.5;

                                // Draw the connection line (dashed, thickness 1.5)
                                drawLine(ctx, pStart.x, pStart.y, pEnd.x, pEnd.y, arrowColor, 1.5, dpr, invZoom, true);

                                // Draw arrowheads
                                const angle = Math.atan2(pEnd.y - pStart.y, pEnd.x - pStart.x);
                                const arrowSize = Math.max(6, 8 * invZoom);

                                // Always draw arrowhead at the target end
                                drawArrowhead(ctx, pEnd.x, pEnd.y, angle, arrowSize, arrowheadColor);

                                // If bidirectional, also draw arrowhead at the source end pointing back
                                if (pointsBack) {
                                    drawArrowhead(ctx, pStart.x, pStart.y, angle + Math.PI, arrowSize, arrowheadColor);
                                }

                                ctx.restore();
                            }
                        }
                    }
                }


                // 1.5. Water edge shadows: heavy inward gradient on sides not touching another water room
                if (isExplored || unveilMap) {
                    const currentTerrain = localRoom ? localRoom.terrain : tSector;
                    const tName = normalizeTerrain(currentTerrain);
                    const isWaterRoom = tName === 'Water' || tName === 'Rapids' || tName === 'Underwater';
                    if (isWaterRoom) {
                        ctx.save();
                        ctx.globalAlpha = unveilMap ? 1.0 : exploredAlphaMul;
                        const depth = s * 0.10;
                        for (const dir of ['n', 's', 'e', 'w'] as const) {
                            const exit = ghostExits?.[dir];
                            const targetData = exit ? preloaded[String(exit.target)] : null;
                            const nTName = targetData ? normalizeTerrain(targetData[3]) : null;
                            const neighborIsWater = nTName === 'Water' || nTName === 'Rapids' || nTName === 'Underwater';
                            if (!neighborIsWater) {
                                let grad: CanvasGradient;
                                const dark = 'rgba(0,0,0,0.52)';
                                const fade = 'rgba(0,0,0,0)';
                                if (dir === 'n') {
                                    grad = ctx.createLinearGradient(wx, wy, wx, wy + depth);
                                    grad.addColorStop(0, dark); grad.addColorStop(1, fade);
                                    ctx.fillStyle = grad; ctx.fillRect(wx, wy, s, depth);
                                } else if (dir === 's') {
                                    grad = ctx.createLinearGradient(wx, wy + s, wx, wy + s - depth);
                                    grad.addColorStop(0, dark); grad.addColorStop(1, fade);
                                    ctx.fillStyle = grad; ctx.fillRect(wx, wy + s - depth, s, depth);
                                } else if (dir === 'e') {
                                    grad = ctx.createLinearGradient(wx + s, wy, wx + s - depth, wy);
                                    grad.addColorStop(0, dark); grad.addColorStop(1, fade);
                                    ctx.fillStyle = grad; ctx.fillRect(wx + s - depth, wy, depth, s);
                                } else {
                                    grad = ctx.createLinearGradient(wx, wy, wx + depth, wy);
                                    grad.addColorStop(0, dark); grad.addColorStop(1, fade);
                                    ctx.fillStyle = grad; ctx.fillRect(wx, wy, depth, s);
                                }
                            }
                        }
                        ctx.restore();
                    }
                }

                // 2. High-Detail Walls and Doors (Zoom > 0.3)
                if (camera.zoom > 0.3) {
                    ctx.save();
                    if (isPeeked) {
                        // Clip wall drawing to sides facing ring-1 revealed neighbors
                        const clipExtent = s * 0.25;
                        ctx.beginPath();
                        for (const pd of peekDirs) {
                            if (pd === 'n') ctx.rect(wx, wy, s, clipExtent);
                            else if (pd === 's') ctx.rect(wx, wy + s - clipExtent, s, clipExtent);
                            else if (pd === 'e') ctx.rect(wx + s - clipExtent, wy, clipExtent, s);
                            else if (pd === 'w') ctx.rect(wx, wy, clipExtent, s);
                        }
                        ctx.clip();
                        ctx.globalAlpha = 0.2;
                    } else if (isRevealed) {
                        ctx.globalAlpha = 0.35;
                    } else if (isExplored) ctx.globalAlpha = exploredAlphaMul;

                    for (const d of ['n', 's', 'e', 'w']) {
                        const { hasExit, hasDoor, isClosed } = getGateState(localRoom, ghostExits, d, allRooms, preloaded);
                        let x1 = wx, y1 = wy, x2 = wx, y2 = wy;
                        if (d === 'n') { x2 += s; } else if (d === 's') { y1 += s; x2 += s; y2 += s; } else if (d === 'e') { x1 += s; x2 += s; y2 += s; } else { y2 += s; }

                        if (!hasExit) {
                            drawInkyLine(ctx, x1, y1, x2, y2, currentWallColor, 3.0, dpr, invZoom);
                        } else if (hasDoor) {
                            const ddx = x2 - x1, ddy = y2 - y1;
                            // Clip to this room's tile so the door doesn't bleed into the neighbor
                            ctx.save();
                            ctx.beginPath(); ctx.rect(wx, wy, s, s); ctx.clip();
                            // Brown post segments (no drop shadow)
                            ctx.save();
                            ctx.strokeStyle = currentWallColor;
                            ctx.lineWidth = 3.5;
                            ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x1 + ddx * 0.25, y1 + ddy * 0.25); ctx.stroke();
                            ctx.beginPath(); ctx.moveTo(x2, y2); ctx.lineTo(x2 - ddx * 0.25, y2 - ddy * 0.25); ctx.stroke();
                            ctx.restore();

                            // Yellow door elements with glow
                            ctx.save();
                            ctx.fillStyle = currentDoorColor;
                            ctx.shadowBlur = 8;
                            ctx.shadowColor = currentDoorColor;
                            if (isClosed) {
                                ctx.strokeStyle = currentDoorColor;
                                ctx.lineWidth = 4.0;
                                ctx.beginPath(); ctx.moveTo(x1 + ddx * 0.25, y1 + ddy * 0.25); ctx.lineTo(x2 - ddx * 0.25, y2 - ddy * 0.25); ctx.stroke();
                            } else {
                                const sqSize = 4.0;
                                if (ddx === 0) {
                                    ctx.fillRect(x1 - sqSize/2, y1 + ddy * 0.25, sqSize, sqSize);
                                    ctx.fillRect(x1 - sqSize/2, y1 + ddy * 0.75 - sqSize, sqSize, sqSize);
                                } else {
                                    ctx.fillRect(x1 + ddx * 0.25, y1 - sqSize/2, sqSize, sqSize);
                                    ctx.fillRect(x1 + ddx * 0.75 - sqSize, y1 - sqSize/2, sqSize, sqSize);
                                }
                            }
                            ctx.restore();
                            ctx.restore(); // restore clip
                        }

                        if (hasExit) {
                            const exFlags = ghostExits?.[d]?.flags || localRoom?.exits?.[d]?.flags || [];
                            if (exFlags.some((f: string) => f === 'CLIMB')) {
                                drawClimbIndicator(ctx, wx, wy, s, d, invZoom);
                            }
                            for (const [flag, color] of Object.entries(DOTTED_EXIT_FLAGS)) {
                                if (exFlags.includes(flag)) drawDottedExitLine(ctx, wx, wy, s, d, color, invZoom);
                            }
                            drawExitFlagIndicators(ctx, wx, wy, s, d, exFlags, invZoom);
                        }
                    }
                    ctx.restore();
                }

                // Draw mountains icon on top of walls if zoom > 0.3
                if (camera.zoom > 0.3) {
                    const currentTerrain = localRoom ? localRoom.terrain : tSector;
                    if (normalizeTerrain(currentTerrain) === 'Mountains') {
                        const gridX = Math.round(rx), gridY = Math.round(ry);
                        const variant = Math.floor((Math.abs(Math.sin(gridX * 12.9898 + gridY * 78.233) * 43758.5453) % 1) * 6);
                        ctx.save();
                        if (rCtx.camera.zoom >= 0.3
                            && isOutsideActiveZone(getRoomZone(localRoom, rData), rCtx.activeZone, rCtx.activeZonePreloaded)
                            && isOutsideActiveZone(rData[9] || '', rCtx.activeZone, rCtx.activeZonePreloaded)) {
                            ctx.filter = DETAIL_GRAYSCALE_FILTER;
                        }
                        ctx.globalAlpha = isExplored ? exploredAlphaMul : 0.35;
                        const inset = getTerrainTileInset(s);
                        const isSnow = localRoom?.isPermanentSnow || rCtx.weather === 'snow';
                        const walls = getRoomWalls(localRoom, ghostExits, allRooms, preloaded, explored, unveilMap);
                        drawTerrainIcon(
                            ctx,
                            wx + inset,
                            wy + inset,
                            s - inset * 2,
                            currentTerrain,
                            isDarkMode,
                            rCtx.processedIconsRef,
                            rCtx.imagesRef,
                            variant,
                            isSnow ? 'snow' : rCtx.weather,
                            0,
                            undefined,
                            walls,
                            wx,
                            wy,
                            s
                        );
                        ctx.restore();
                    }
                }

                // 3. Indicators and Flags (Zoom > 0.3)
                if (camera.zoom > 0.3) {
                    const hasLiveMob = localRoom?.mobFlags && localRoom.mobFlags.length > 0;
                    const hasLiveLoad = localRoom?.loadFlags && localRoom.loadFlags.length > 0;
                    
                    const mobF = hasLiveMob ? localRoom.mobFlags! : (rData[7] || []);
                    const loadF = hasLiveLoad ? localRoom.loadFlags! : (rData[8] || []);
                    const questF = localRoom?.roomQuestFlags || [];

                    const finalMobF = [...mobF];
                    // Skip synthetic map icons for DARK/SUNDEATH as per user request
                    // Shading is handled in drawTerrains.ts

                    // Draw flags for explored rooms, or all rooms in reveal-all mode
                    if (!rCtx.lowEffects && (isExplored || unveilMap) && (finalMobF.length > 0 || loadF.length > 0 || questF.length > 0)) {
                        ctx.save();
                        
                        let flagScale = 1.0;
                        const exploredAt = rCtx.firstExploredAtRef.current[vnum];
                        if (isExplored && exploredAt && !unveilMap) {
                            const elapsed = rCtx.now - exploredAt;
                            const delay = 100;   // 100ms delay
                            const animDur = 450; // duration of bounce
                            
                            if (elapsed < delay) {
                                flagScale = 0.0;
                                rCtx.triggerRender?.(); // keep rendering loop active
                            } else if (elapsed < delay + animDur) {
                                const t = (elapsed - delay) / animDur;
                                // Ease out back (bouncy ease out)
                                const c1 = 1.70158;
                                const c3 = c1 + 1;
                                flagScale = 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
                                rCtx.triggerRender?.(); // keep rendering loop active
                            }
                        }
                        
                        if (flagScale > 0.0) {
                            drawRoomFlagsOptimized(ctx, anchorX, anchorY, camera.zoom, finalMobF, loadF, questF, flagScale);
                        }
                        ctx.restore();
                    }

                    // Up/down arrows: show for explored, ring-1 revealed, and unveil-all mode
                    if (!rCtx.lowEffects && ghostExits && (ghostExits.u || ghostExits.d) && (isExplored || isRevealed || unveilMap)) {
                        const iconColor = 'rgba(148, 163, 184, 0.8)';
                        const cOff = 12;
                        const arrowSize = 18;

                        ctx.save();
                        if (isRevealed) ctx.globalAlpha = 0.25;
                        else ctx.globalAlpha = exploredAlphaMul;

                        if (ghostExits.u) {
                            const { hasDoor, isClosed } = getGateState(localRoom, ghostExits, 'u', allRooms, preloaded);
                            const finalColor = hasDoor ? currentDoorColor : iconColor;
                            const isOutline = hasDoor && !isClosed;
                            const icon = getIndicatorIcon('▲', finalColor, isOutline, 7, true, true, arrowSize);
                            ctx.save();
                            ctx.globalAlpha = isExplored ? (hasDoor ? 1.0 : exploredAlphaMul * 0.5) : 0.2;
                            ctx.drawImage(icon, anchorX - cOff - icon.width / 2, anchorY - cOff - icon.height / 2);
                            ctx.restore();
                        }
                        if (ghostExits.d) {
                            const { hasDoor, isClosed } = getGateState(localRoom, ghostExits, 'd', allRooms, preloaded);
                            const finalColor = hasDoor ? currentDoorColor : iconColor;
                            const isOutline = hasDoor && !isClosed;
                            const icon = getIndicatorIcon('▼', finalColor, isOutline, 7, true, true, arrowSize);
                            ctx.save();
                            ctx.globalAlpha = isExplored ? (hasDoor ? 1.0 : exploredAlphaMul * 0.5) : 0.2;
                            ctx.drawImage(icon, anchorX + cOff - icon.width / 2, anchorY + cOff - icon.height / 2);
                            ctx.restore();
                        }

                        // --- Internal Dotted Connection (Bidirectional Validation) ---
                        if (ghostExits.u && ghostExits.d) {
                            const uTargetVnum = String(ghostExits.u.target), dTargetVnum = String(ghostExits.d.target);
                            const uTarget = preloaded[uTargetVnum], dTarget = preloaded[dTargetVnum];
                            const uPointsBack = uTarget?.[4]?.d && String(uTarget[4].d.target).replace(/^m_/, '') === String(vnum).replace(/^m_/, '');
                            const dPointsBack = dTarget?.[4]?.u && String(dTarget[4].u.target).replace(/^m_/, '') === String(vnum).replace(/^m_/, '');

                            if (uPointsBack && dPointsBack) {
                                ctx.save();
                                ctx.globalAlpha = isExplored ? exploredAlphaMul * 0.5 : 0.15;
                                drawLine(ctx, anchorX - cOff, anchorY - cOff, anchorX + cOff, anchorY + cOff, iconColor, 1.5, dpr, invZoom, true);
                                ctx.restore();
                            }
                        }

                        ctx.restore();
                    }

                    // NORIDE indicator — top-right corner
                    // rData[14] = "NOT_RIDABLE" | "RIDABLE"; localRoom.ridable mirrors this or may be boolean from GMCP
                    const ridableRaw = localRoom?.ridable !== undefined ? localRoom.ridable : rData[14];
                    const isNoRide = ridableRaw === 'NOT_RIDABLE' || ridableRaw === false || ridableRaw === 'false';
                    if ((isExplored || unveilMap) && isNoRide) {
                        const iconSize = 14;
                        const icon = getNorideIcon(iconSize);
                        ctx.save();
                        ctx.globalAlpha = isExplored ? exploredAlphaMul : 0.7;
                        ctx.drawImage(icon, wx + s - icon.width + 2, wy - 2);
                        ctx.restore();
                    }
                }
            }
        }
    }

};

export const drawLocalFeatures = (rCtx: RenderContext, localRooms: any[]) => {
    const { ctx, isDarkMode, currentZ, preloaded, camera, allRooms, dpr, invZoom, baseMapExitsRef } = rCtx;
    const wallColor = rCtx.mapTileVisuals?.wallColor || WALL_COLOR;
    const s = GRID_SIZE;

    for (const room of localRooms) {
        const vnum = String(room.id).startsWith('m_') ? room.id.substring(2) : room.id;
        if (preloaded[vnum]) continue;
        if (Math.abs((room.z || 0) - currentZ) > 1.5) continue;
        const wx = room.x * s, wy = room.y * s, cX = wx + s / 2, cY = wy + s / 2;
        const zoneName = room.zone || '';
        const zoneVis = getZoneVisuals(zoneName, isDarkMode, rCtx.zoneFilters);
        const currentWallColor = zoneVis.wallColor || rCtx.mapTileVisuals?.wallColor || WALL_COLOR;
        const currentDoorColor = zoneVis.doorColor || rCtx.mapTileVisuals?.doorColor || '#ffcc00';

        // Local Connections
        if (room.exits) {
            for (const d in room.exits) {
                const ex = room.exits[d]; if (!ex) continue;
                const tV = String(ex.target || ex.gmcpDestId || "");
                if (!tV) continue;
                const nId = tV.startsWith('m_') ? tV : `m_${tV}`;
                const n = allRooms[nId] || allRooms[tV] || (preloaded[tV] ? { x: preloaded[tV][0], y: preloaded[tV][1], z: preloaded[tV][2] } : null);
                if (n && (Math.abs((n.z || 0) - currentZ) <= 0.5)) {
                    const dx = Math.abs(room.x - n.x), dy = Math.abs(room.y - n.y);
                    if ((dx > 1.1 || dy > 1.1) && d !== 'u' && d !== 'd') {
                        const tpx = n.x * s + s / 2, tpy = n.y * s + s / 2;
                        const oppDir = DIRS[d]?.opp || '';
                        const pointsBack = n?.exits?.[oppDir] && 
                            String(n.exits[oppDir].target || n.exits[oppDir].gmcpDestId || "").replace(/^m_/, '') === String(room.id).replace(/^m_/, '');

                        // De-duplicate bidirectional connections (draw only once)
                        if (!pointsBack || String(room.id) < String(tV)) {
                            const arrowColor = 'rgba(148, 163, 184, 0.8)';
                            const arrowheadColor = 'rgba(148, 163, 184, 0.8)';

                            const pStart = getSquareIntersection(cX, cY, tpx, tpy, s / 2);
                            const pEnd = getSquareIntersection(tpx, tpy, cX, cY, s / 2);

                            ctx.save();
                            ctx.globalAlpha = 0.5;
                            drawLine(ctx, pStart.x, pStart.y, pEnd.x, pEnd.y, arrowColor, 1.5, dpr, invZoom, true);

                            const angle = Math.atan2(pEnd.y - pStart.y, pEnd.x - pStart.x);
                            const arrowSize = Math.max(6, 8 * invZoom);

                            drawArrowhead(ctx, pEnd.x, pEnd.y, angle, arrowSize, arrowheadColor);
                            if (pointsBack) {
                                drawArrowhead(ctx, pStart.x, pStart.y, angle + Math.PI, arrowSize, arrowheadColor);
                            }
                            ctx.restore();
                        }
                    } else if (dx > 1.1 || dy > 1.1 || d === 'u' || d === 'd') {
                        const tpx = n.x * s + s / 2, tpy = n.y * s + s / 2;
                        drawLine(ctx, cX, cY, tpx, tpy, LONG_CONNECTION_COLOR, 2, dpr, invZoom);

                        // --- Local Vertical Arrow Connections (Bidirectional Only) ---
                        if ((d === 'u' || d === 'd') && camera.zoom > 0.2) {
                            const oD = d === 'u' ? 'd' : 'u';
                            const pointsBack = n?.exits?.[oD] && 
                                String(n.exits[oD].target || n.exits[oD].gmcpDestId || "").replace(/^m_/, '') === String(room.id).replace(/^m_/, '');

                            if (pointsBack) {
                                const iconColor = 'rgba(148, 163, 184, 0.8)'; // Tactical grey connection line
                                const cOff = 12;
                                const startX = cX + (d === 'u' ? -cOff : cOff);
                                const startY = cY + (d === 'u' ? -cOff : cOff);
                                const endX = tpx + (d === 'u' ? cOff : -cOff);
                                const endY = tpy + (d === 'u' ? cOff : -cOff);
                                
                                ctx.save();
                                ctx.globalAlpha = 0.5;
                                drawLine(ctx, startX, startY, endX, endY, iconColor, 1.5, dpr, invZoom, true);
                                ctx.restore();
                            }
                        }
                    }
                }
            }
        }

        // Local Up/Down Indicators
        if (room.exits && (room.exits.u || room.exits.d) && camera.zoom > 0.3) {
            const vOff = 10;
            const arrowSize = 18;
            if (room.exits.u) {
                const { hasDoor, isClosed } = getGateState(room, null, 'u', allRooms, preloaded);
                const finalColor = hasDoor ? currentDoorColor : 'rgba(148, 163, 184, 0.8)';
                const isOutline = hasDoor && !isClosed;
                const icon = getIndicatorIcon('▲', finalColor, isOutline, 7, true, true, arrowSize);
                ctx.save();
                ctx.globalAlpha = hasDoor ? 1.0 : 0.5;
                ctx.drawImage(icon, cX - 12 - icon.width / 2, cY - 12 - icon.height / 2);
                ctx.restore();
            }
            if (room.exits.d) {
                const { hasDoor, isClosed } = getGateState(room, null, 'd', allRooms, preloaded);
                const finalColor = hasDoor ? currentDoorColor : 'rgba(148, 163, 184, 0.8)';
                const isOutline = hasDoor && !isClosed;
                const icon = getIndicatorIcon('▼', finalColor, isOutline, 7, true, true, arrowSize);
                ctx.save();
                ctx.globalAlpha = hasDoor ? 1.0 : 0.5;
                ctx.drawImage(icon, cX + 12 - icon.width / 2, cY + 12 - icon.height / 2);
                ctx.restore();
            }

            // --- Local Internal Dotted Connection (Bidirectional Validation) ---
            if (room.exits.u && room.exits.d) {
                const uTargetId = String(room.exits.u.target || room.exits.u.gmcpDestId || "");
                const dTargetId = String(room.exits.d.target || room.exits.d.gmcpDestId || "");
                const uN = allRooms[uTargetId.startsWith('m_') ? uTargetId : `m_${uTargetId}`] || allRooms[uTargetId];
                const dN = allRooms[dTargetId.startsWith('m_') ? dTargetId : `m_${dTargetId}`] || allRooms[dTargetId];
                
                const uPointsBack = uN?.exits?.d && String(uN.exits.d.target || uN.exits.d.gmcpDestId || "").replace(/^m_/, '') === String(room.id).replace(/^m_/, '');
                const dPointsBack = dN?.exits?.u && String(dN.exits.u.target || dN.exits.u.gmcpDestId || "").replace(/^m_/, '') === String(room.id).replace(/^m_/, '');

                if (uPointsBack && dPointsBack) {
                    const iconColor = 'rgba(148, 163, 184, 0.8)'; // Tactical grey connection line
                    ctx.save();
                    ctx.globalAlpha = 0.5;
                    drawLine(ctx, cX - 12, cY - 12, cX + 12, cY + 12, iconColor, 1.5, dpr, invZoom, true);
                    ctx.restore();
                }
            }
        }
    }

    // --- Local Wall Rendering ---
    if (camera.zoom > 0.3) {
        for (const room of localRooms) {
            const vnum = String(room.id).startsWith('m_') ? room.id.substring(2) : room.id;
            if (preloaded[vnum] || Math.abs((room.z || 0) - currentZ) > 1.5) continue;
            const wx = room.x * s, wy = room.y * s;
            const zoneName = room.zone || '';
            const zoneVis = getZoneVisuals(zoneName, isDarkMode, rCtx.zoneFilters);
            const currentWallColor = zoneVis.wallColor || rCtx.mapTileVisuals?.wallColor || WALL_COLOR;
            const currentDoorColor = zoneVis.doorColor || rCtx.mapTileVisuals?.doorColor || '#ffcc00';
            for (const d of ['n', 's', 'e', 'w']) {
                const rId = String(room.id).startsWith('m_') ? room.id.substring(2) : room.id;
                const wEx = preloaded[rId]?.[4]?.[d];
                const { hasExit, hasDoor, isClosed } = getGateState(room, wEx, d, allRooms, preloaded);
                let x1 = wx, y1 = wy, x2 = wx, y2 = wy;
                if (d === 'n') { x2 += s; } else if (d === 's') { y1 += s; x2 += s; y2 += s; } else if (d === 'e') { x1 += s; x2 += s; y2 += s; } else { y2 += s; }
                if (!hasExit) {
                    drawInkyLine(ctx, x1, y1, x2, y2, currentWallColor, 3.0, dpr, invZoom);
                } else if (hasDoor && camera.zoom >= 0.1) {
                    const ddx = x2 - x1, ddy = y2 - y1;
                    // Clip to this room's tile so the door doesn't bleed into the neighbor
                    ctx.save();
                    ctx.beginPath(); ctx.rect(wx, wy, s, s); ctx.clip();
                    // Brown post segments (no drop shadow)
                    ctx.save();
                    ctx.strokeStyle = currentWallColor; ctx.lineWidth = 3.5;
                    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x1 + ddx * 0.25, y1 + ddy * 0.25); ctx.stroke();
                    ctx.beginPath(); ctx.moveTo(x2, y2); ctx.lineTo(x2 - ddx * 0.25, y2 - ddy * 0.25); ctx.stroke();
                    ctx.restore();
                    // Yellow door elements with glow
                    ctx.save();
                    ctx.fillStyle = currentDoorColor;
                    ctx.shadowBlur = 8; ctx.shadowColor = currentDoorColor;
                    if (isClosed) {
                        ctx.strokeStyle = currentDoorColor; ctx.lineWidth = 4.0;
                        ctx.beginPath(); ctx.moveTo(x1 + ddx * 0.25, y1 + ddy * 0.25); ctx.lineTo(x2 - ddx * 0.25, y2 - ddy * 0.25); ctx.stroke();
                    } else {
                        const sqSize = 4.0;
                        if (ddx === 0) {
                            ctx.fillRect(x1 - sqSize/2, y1 + ddy * 0.25, sqSize, sqSize);
                            ctx.fillRect(x1 - sqSize/2, y1 + ddy * 0.75 - sqSize, sqSize, sqSize);
                        } else {
                            ctx.fillRect(x1 + ddx * 0.25, y1 - sqSize/2, sqSize, sqSize);
                            ctx.fillRect(x1 + ddx * 0.75 - sqSize, y1 - sqSize/2, sqSize, sqSize);
                        }
                    }
                    ctx.restore();
                    ctx.restore(); // restore clip
                }

                if (hasExit) {
                    const exFlags = room.exits?.[d]?.flags || wEx?.flags || [];
                    if (exFlags.some((f: string) => f === 'CLIMB')) {
                        drawClimbIndicator(ctx, wx, wy, s, d, invZoom);
                    }
                    for (const [flag, color] of Object.entries(DOTTED_EXIT_FLAGS)) {
                        if (exFlags.includes(flag)) drawDottedExitLine(ctx, wx, wy, s, d, color, invZoom);
                    }
                    drawExitFlagIndicators(ctx, wx, wy, s, d, exFlags, invZoom);
                }
            }
        }
    }

    // --- Local Flags ---
    if (camera.zoom > 0.3) {
        for (const room of localRooms) {
            const vnum = String(room.id).startsWith('m_') ? room.id.substring(2) : room.id;
            if (preloaded[vnum] || Math.abs((room.z || 0) - currentZ) > 1.5) continue;
            const wx = room.x * s, wy = room.y * s, cX = wx + s / 2, cY = wy + s / 2;
            const mobF = room.mobFlags || [], loadF = room.loadFlags || [], questF = room.roomQuestFlags || [];
            if (mobF.length > 0 || loadF.length > 0 || questF.length > 0) {
                drawRoomFlagsOptimized(ctx, cX, cY, camera.zoom, mobF, loadF, questF);
            }
            if (room.ridable === 'NOT_RIDABLE' || room.ridable === false || room.ridable === 'false') {
                const iconSize = 14;
                const icon = getNorideIcon(iconSize);
                ctx.save();
                ctx.globalAlpha = 1.0;
                ctx.drawImage(icon, wx + s - icon.width + 2, wy - 2);
                ctx.restore();
            }
        }
    }
};
