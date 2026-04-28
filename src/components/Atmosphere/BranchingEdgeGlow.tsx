/**
 * @file BranchingEdgeGlow.tsx
 * @description Procedural branching pulse renderer for high-contrast edge maps.
 */

import React, { useEffect, useRef } from 'react';
import { BranchingEdgeGlowControls, BranchingEdgeGlowProps } from '../../types';
import './BranchingEdgeGlow.css';

// --- Types Section ---
type GlowState = {
    width: number;
    height: number;
    edgeMask: Uint8Array;
    edgeIndexes: Uint32Array;
    visited: Uint8Array;
    activation: Float32Array;
    activeIndexes: number[];
    heads: number[];
    accumulator: number;
    lastFrame: number;
    lastLiveTime: number;
};

type CanvasBundle = {
    visible: HTMLCanvasElement;
    pulse: HTMLCanvasElement;
    sample: HTMLCanvasElement;
    visibleCtx: CanvasRenderingContext2D;
    pulseCtx: CanvasRenderingContext2D;
    sampleCtx: CanvasRenderingContext2D;
};

const DEFAULT_CONTROLS: BranchingEdgeGlowControls = {
    spreadSpeed: 1400,
    branchingFactor: 0.82,
    persistenceMs: 20000
};

const EDGE_THRESHOLD = 36;
const MAX_SIM_WIDTH = 1400;
const NEIGHBOR_OFFSETS = [
    -1, -1, 0, -1, 1, -1,
    -1, 0, 1, 0,
    -1, 1, 0, 1, 1, 1
];

// --- Logic Section ---
const getContext = (canvas: HTMLCanvasElement): CanvasRenderingContext2D | null => {
    return canvas.getContext('2d', { willReadFrequently: true });
};

const pickSeed = (indexes: Uint32Array): number => {
    return indexes[Math.floor(Math.random() * indexes.length)] ?? 0;
};

const resetTraversal = (state: GlowState): void => {
    state.visited.fill(0);
    state.activation.fill(-100000);
    state.activeIndexes = [];
    const seed = pickSeed(state.edgeIndexes);
    state.heads = [seed];
    state.visited[seed] = 1;
};

const shuffle = (items: number[]): number[] => {
    for (let i = items.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [items[i], items[j]] = [items[j], items[i]];
    }
    return items;
};

const getNeighbors = (index: number, state: GlowState): number[] => {
    const x = index % state.width;
    const y = Math.floor(index / state.width);
    const neighbors: number[] = [];

    for (let i = 0; i < NEIGHBOR_OFFSETS.length; i += 2) {
        const nx = x + NEIGHBOR_OFFSETS[i];
        const ny = y + NEIGHBOR_OFFSETS[i + 1];
        if (nx < 0 || ny < 0 || nx >= state.width || ny >= state.height) continue;

        const next = ny * state.width + nx;
        if (state.edgeMask[next] === 1 && state.visited[next] === 0) {
            neighbors.push(next);
        }
    }

    return shuffle(neighbors);
};

const stepTraversal = (state: GlowState, now: number, controls: BranchingEdgeGlowControls): void => {
    if (state.heads.length === 0) {
        if (now - state.lastLiveTime > controls.persistenceMs) resetTraversal(state);
        return;
    }

    const headSlot = Math.floor(Math.random() * state.heads.length);
    const head = state.heads[headSlot];
    state.heads[headSlot] = state.heads[state.heads.length - 1];
    state.heads.pop();

    state.activation[head] = now;
    state.activeIndexes.push(head);
    state.lastLiveTime = now;

    const neighbors = getNeighbors(head, state);
    for (let i = 0; i < neighbors.length; i += 1) {
        if (i > 0 && Math.random() > controls.branchingFactor) continue;

        const next = neighbors[i];
        state.visited[next] = 1;
        state.heads.push(next);
    }
};

const drawGlow = (bundle: CanvasBundle, state: GlowState, now: number, persistenceMs: number): void => {
    const imageData = bundle.pulseCtx.createImageData(state.width, state.height);
    const nextActive: number[] = [];

    for (const index of state.activeIndexes) {
        const age = now - state.activation[index];
        if (age >= persistenceMs) continue;

        const brightness = 1 - age / persistenceMs;
        const offset = index * 4;
        imageData.data[offset] = 192 + Math.floor(10 * brightness);
        imageData.data[offset + 1] = 218 + Math.floor(8 * brightness);
        imageData.data[offset + 2] = 230 + Math.floor(6 * brightness);
        imageData.data[offset + 3] = Math.floor(96 * brightness);
        nextActive.push(index);
    }

    state.activeIndexes = nextActive;
    bundle.pulseCtx.clearRect(0, 0, state.width, state.height);
    bundle.pulseCtx.putImageData(imageData, 0, 0);

    bundle.visibleCtx.clearRect(0, 0, state.width, state.height);
    bundle.visibleCtx.globalCompositeOperation = 'lighter';
    bundle.visibleCtx.filter = 'blur(11px)';
    bundle.visibleCtx.globalAlpha = 0.54;
    bundle.visibleCtx.drawImage(bundle.pulse, 0, 0);
    bundle.visibleCtx.filter = 'blur(5px)';
    bundle.visibleCtx.globalAlpha = 0.34;
    bundle.visibleCtx.drawImage(bundle.pulse, 0, 0);
    bundle.visibleCtx.filter = 'none';
    bundle.visibleCtx.globalAlpha = 0.34;
    bundle.visibleCtx.drawImage(bundle.pulse, 0, 0);
    bundle.visibleCtx.globalCompositeOperation = 'source-over';
};

const buildState = (bundle: CanvasBundle, image: HTMLImageElement): GlowState | null => {
    const rect = bundle.visible.getBoundingClientRect();
    const width = Math.max(1, Math.min(MAX_SIM_WIDTH, Math.floor(rect.width * 1.5)));
    const height = Math.max(1, Math.floor(width * (rect.height / Math.max(1, rect.width))));

    for (const canvas of [bundle.visible, bundle.pulse, bundle.sample]) {
        canvas.width = width;
        canvas.height = height;
    }

    const ratio = Math.min(width / image.naturalWidth, height / image.naturalHeight);
    const drawWidth = image.naturalWidth * ratio;
    const drawHeight = image.naturalHeight * ratio;
    const drawX = (width - drawWidth) / 2;
    const drawY = (height - drawHeight) / 2;

    bundle.sampleCtx.clearRect(0, 0, width, height);
    bundle.sampleCtx.drawImage(image, drawX, drawY, drawWidth, drawHeight);

    const pixels = bundle.sampleCtx.getImageData(0, 0, width, height).data;
    const edgeList: number[] = [];
    const edgeMask = new Uint8Array(width * height);

    for (let i = 0; i < pixels.length; i += 4) {
        const value = pixels[i] + pixels[i + 1] + pixels[i + 2];
        if (value > EDGE_THRESHOLD) {
            const index = i / 4;
            edgeMask[index] = 1;
            edgeList.push(index);
        }
    }

    if (edgeList.length === 0) return null;

    const state: GlowState = {
        width,
        height,
        edgeMask,
        edgeIndexes: Uint32Array.from(edgeList),
        visited: new Uint8Array(width * height),
        activation: new Float32Array(width * height),
        activeIndexes: [],
        heads: [],
        accumulator: 0,
        lastFrame: performance.now(),
        lastLiveTime: performance.now()
    };

    resetTraversal(state);
    return state;
};

// --- Component Section ---
export const BranchingEdgeGlow: React.FC<BranchingEdgeGlowProps> = ({ imageUrl, controls }) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    useEffect(() => {
        const visible = canvasRef.current;
        if (!visible || !imageUrl) return undefined;

        const pulse = document.createElement('canvas');
        const sample = document.createElement('canvas');
        const visibleCtx = getContext(visible);
        const pulseCtx = getContext(pulse);
        const sampleCtx = getContext(sample);
        if (!visibleCtx || !pulseCtx || !sampleCtx) return undefined;

        let frame = 0;
        let state: GlowState | null = null;
        let disposed = false;
        const mergedControls = { ...DEFAULT_CONTROLS, ...controls };
        const bundle = { visible, pulse, sample, visibleCtx, pulseCtx, sampleCtx };
        const image = new Image();

        const animate = (now: number): void => {
            if (disposed || !state) return;

            const dt = Math.min(64, now - state.lastFrame);
            state.lastFrame = now;
            state.accumulator += dt * (mergedControls.spreadSpeed / 1000);

            while (state.accumulator >= 1) {
                stepTraversal(state, now, mergedControls);
                state.accumulator -= 1;
            }

            drawGlow(bundle, state, now, mergedControls.persistenceMs);
            frame = requestAnimationFrame(animate);
        };

        const load = (): void => {
            state = buildState(bundle, image);
            if (state) frame = requestAnimationFrame(animate);
        };

        image.onload = load;
        image.src = imageUrl;

        const resizeObserver = new ResizeObserver(() => {
            if (!image.complete || disposed) return;
            state = buildState(bundle, image);
        });
        resizeObserver.observe(visible);

        return () => {
            disposed = true;
            cancelAnimationFrame(frame);
            resizeObserver.disconnect();
        };
    }, [controls, imageUrl]);

    if (!imageUrl) return null;

    return (
        <div className="branching-edge-glow" aria-hidden="true">
            <canvas ref={canvasRef} className="branching-edge-glow__canvas" />
        </div>
    );
};
