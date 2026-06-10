/**
 * @file ShaperCanvasToolbar.tsx
 * @description Layer and canvas action toolbar for Shaper.
 */

import { formatLayer } from './ShaperCanvasGeometry';

interface ShaperCanvasToolbarProps {
    layers: number[];
    viewZ: number;
    showNodes: boolean;
    showExits: boolean;
    onAddExtraRoom: () => void;
    onSetViewZ: (z: number) => void;
    onSetShowNodes: (show: boolean) => void;
    onSetShowExits: (show: boolean) => void;
    onResetCamera: () => void;
}

// --- Component Section ---
export const ShaperCanvasToolbar: React.FC<ShaperCanvasToolbarProps> = ({
    layers,
    viewZ,
    showNodes,
    showExits,
    onAddExtraRoom,
    onSetViewZ,
    onSetShowNodes,
    onSetShowExits,
    onResetCamera
}) => (
    <div className="shaper-layer-toolbar" aria-label="Concept map layers">
        {[...layers, viewZ].filter((z, index, all) => all.indexOf(z) === index).sort((a, b) => a - b).map(z => (
            <button key={z} type="button" className={z === viewZ ? 'active' : ''} onClick={() => onSetViewZ(z)}>
                {formatLayer(z)}
            </button>
        ))}
        <button type="button" onClick={() => onSetViewZ(viewZ - 1)}>Layer Down</button>
        <button type="button" onClick={() => onSetViewZ(viewZ + 1)}>Layer Up</button>
        <button type="button" onClick={onAddExtraRoom}>Add Extra Room</button>
        <button type="button" onClick={() => onSetShowExits(!showExits)} className={showExits ? 'active' : ''}>
            {showExits ? 'Hide Exits' : 'Show Exits'}
        </button>
        <button type="button" onClick={() => onSetShowNodes(!showNodes)} className={showNodes ? 'active' : ''} disabled={!showExits}>
            {showNodes ? 'Hide Nodes' : 'Show Nodes'}
        </button>
        <button type="button" onClick={onResetCamera} className="shaper-zoom-reset" title="Reset view">
            Reset view
        </button>
    </div>
);
