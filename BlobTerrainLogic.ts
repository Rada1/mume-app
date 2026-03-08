/**
 * BlobTerrainLogic.ts
 * 
 * This file contains the core logic for generating "blob" style terrain connections
 * for a grid-based map (specifically designed for MUME Mapper).
 * 
 * The blob behavior allows terrain features (like Forest, Water, etc.) to visually
 * connect to adjacent tiles of the same type, creating organic, rounded shapes
 * instead of blocky squares.
 * 
 * HOW IT WORKS:
 * 1. A cell is divided into 4 quadrants (Top-Right, Bottom-Right, Bottom-Left, Top-Left).
 * 2. For each quadrant, we check the adjacent orthogonal neighbors (Top, Bottom, Left, Right)
 *    and the diagonal neighbor for that quadrant.
 * 3. Based on which neighbors share the same terrain type, we draw a specific SVG path segment:
 *    - Fully surrounded (Orthogonal + Diagonal): Fill the corner completely.
 *    - Orthogonal only (No Diagonal): Create an inner curve (concave).
 *    - One Orthogonal only: Draw a straight edge extending to the neighbor.
 *    - No neighbors: Draw an outer rounded corner (convex).
 * 4. The path is drawn on a 100x100 coordinate system for the cell, starting at the top-middle (50, 0)
 *    and drawing clockwise.
 */

export type TerrainType = 'None' | 'Field' | 'Forest' | 'Mountains' | 'Hills' | 'Brush' | 'Shallows' | 'Water' | 'Road' | 'City' | 'Tunnel' | 'Cavern' | 'Building' | 'Rapids' | 'Underwater';

/**
 * Calculates the SVG path data for a single cell based on its neighbors.
 * 
 * @param x The x-coordinate of the cell in the grid.
 * @param y The y-coordinate of the cell in the grid.
 * @param grid The 2D array representing the map grid.
 * @returns A string representing the SVG path `d` attribute for the blob shape.
 */
export function getBlobPathData(x: number, y: number, grid: TerrainType[][]): string {
  const type = grid[y][x];
  
  // If the cell has no terrain, it doesn't render a blob.
  if (type === 'None') {
    return "";
  }

  const height = grid.length;
  const width = grid[0]?.length || 0;

  // Helper function to check if a neighbor exists and matches the current cell's terrain type.
  const getNeighbor = (dx: number, dy: number): boolean => {
    const nx = x + dx;
    const ny = y + dy;
    // Bounds check
    if (nx < 0 || nx >= width || ny < 0 || ny >= height) return false;
    return grid[ny][nx] === type;
  };

  // Check all 8 neighbors
  const T = getNeighbor(0, -1);   // Top
  const B = getNeighbor(0, 1);    // Bottom
  const L = getNeighbor(-1, 0);   // Left
  const R = getNeighbor(1, 0);    // Right
  const TL = getNeighbor(-1, -1); // Top-Left
  const TR = getNeighbor(1, -1);  // Top-Right
  const BL = getNeighbor(-1, 1);  // Bottom-Left
  const BR = getNeighbor(1, 1);   // Bottom-Right

  let d = "";

  // The SVG path is drawn on a 100x100 coordinate system for the cell.
  // We start at the top-middle (50, 0) and draw clockwise.

  // --- Top-Right Quadrant ---
  if (T && R && TR) {
    // Fully surrounded in this quadrant: fill the corner completely.
    d += "M 50 0 L 100 0 L 100 50 ";
  } else if (T && R && !TR) {
    // Orthogonal neighbors exist, but diagonal is missing: create an inner curve.
    d += "M 50 0 L 80 0 A 20 20 0 0 0 100 20 L 100 50 ";
  } else if (T && !R) {
    // Only top neighbor: straight line up, then sharp corner.
    d += "M 50 0 L 80 0 L 80 50 ";
  } else if (!T && R) {
    // Only right neighbor: sharp corner, then straight line right.
    d += "M 50 20 L 100 20 L 100 50 ";
  } else {
    // No neighbors in this quadrant: draw an outer rounded corner.
    d += "M 50 20 A 30 30 0 0 1 80 50 ";
  }

  // --- Bottom-Right Quadrant ---
  if (B && R && BR) {
    d += "L 100 100 L 50 100 ";
  } else if (B && R && !BR) {
    d += "L 100 80 A 20 20 0 0 0 80 100 L 50 100 ";
  } else if (!B && R) {
    d += "L 100 80 L 50 80 ";
  } else if (B && !R) {
    d += "L 80 100 L 50 100 ";
  } else {
    d += "A 30 30 0 0 1 50 80 ";
  }

  // --- Bottom-Left Quadrant ---
  if (B && L && BL) {
    d += "L 0 100 L 0 50 ";
  } else if (B && L && !BL) {
    d += "L 20 100 A 20 20 0 0 0 0 80 L 0 50 ";
  } else if (B && !L) {
    d += "L 20 100 L 20 50 ";
  } else if (!B && L) {
    d += "L 0 80 L 0 50 ";
  } else {
    d += "A 30 30 0 0 1 20 50 ";
  }

  // --- Top-Left Quadrant ---
  if (T && L && TL) {
    d += "L 0 0 Z";
  } else if (T && L && !TL) {
    d += "L 0 20 A 20 20 0 0 0 20 0 Z";
  } else if (!T && L) {
    d += "L 0 20 L 50 20 Z";
  } else if (T && !L) {
    d += "L 20 0 Z";
  } else {
    d += "A 30 30 0 0 1 50 20 Z";
  }

  return d;
}

/**
 * Example usage in a React component:
 * 
 * import { getBlobPathData, TerrainType } from './BlobTerrainLogic';
 * 
 * const TerrainCell = ({ x, y, grid, color, symbol }) => {
 *   const pathData = getBlobPathData(x, y, grid);
 *   
 *   if (!pathData) return null;
 * 
 *   return (
 *     <svg viewBox="0 0 100 100" style={{ position: 'absolute', width: '100%', height: '100%', overflow: 'visible' }}>
 *       <path d={pathData} fill={color} />
 *       <text x="50" y="55" textAnchor="middle" dominantBaseline="middle" fontSize="36">
 *         {symbol}
 *       </text>
 *     </svg>
 *   );
 * };
 */
