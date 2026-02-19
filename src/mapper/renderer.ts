
import { RoomNode } from '../types/index';
export function renderMap(
    ctx: CanvasRenderingContext2D,
    mapper: any, // Use any to avoid strict typing issues with stub
    width: number,
    height: number,
    scale: number,
    offset: { x: number, y: number },
    cameraPos: { x: number, y: number }
) {
    ctx.clearRect(0, 0, width, height);
}
