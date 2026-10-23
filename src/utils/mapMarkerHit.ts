/** @file Marker hit bounds matching worker text anchoring and the legacy canvas. */
import type { MapperMarker } from '../components/Mapper/mapperTypes';
import { GRID_SIZE } from '../components/Mapper/mapperUtils';

// --- Renderer-aware Marker Hits ---
export const hitsMapMarker = (marker: MapperMarker, wx: number, wy: number, zoom: number, worker: boolean): boolean => {
    const x = (wx - marker.x * GRID_SIZE) * zoom;
    // Room hits use a one-tile worker offset; text infomarks use their exact point.
    const y = -(wy - (worker ? GRID_SIZE : 0) - marker.y * GRID_SIZE) * zoom;
    if (Math.hypot(x, y) < 12) return true;
    if (!marker.text) return false;
    if (worker) {
        const angle = (marker.infomarkAngle ?? 0) * Math.PI / 180;
        const localX = x * Math.cos(angle) + y * Math.sin(angle);
        const localY = -x * Math.sin(angle) + y * Math.cos(angle);
        const size = Math.max(8, Math.min(32, (marker.fontSize || 11) * (marker.id.startsWith('mm2_') ? 1.8 : 2.2)));
        const width = Math.min(marker.text.length, 120) * size * 0.36;
        return localX >= -size * 0.3 - 6 && localX <= width + size * 0.3 + 6
            && localY >= -size * 0.25 - 6 && localY <= size * 0.75 + 6;
    }
    const scale = Math.min(1 / zoom, 4) * zoom;
    const size = (marker.fontSize || 10) * 1.4 * scale;
    const bottom = (marker.dotSize || 8) * scale + 4 * scale;
    return Math.abs(x) <= marker.text.length * size * 0.33 + 6 * scale
        && y >= bottom - 6 * scale && y <= bottom + size + 6 * scale;
};
