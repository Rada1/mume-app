/**
 * @file ShaperCanvasToolbar.tsx
 * @description Layer and canvas action toolbar for Shaper.
 */

interface ShaperCanvasToolbarProps {
    layers: number[];
    viewZ: number;
    showExits: boolean;
    onAddExtraRoom: () => void;
    onSetViewZ: (z: number) => void;
    onSetShowExits: (show: boolean) => void;
    onResetCamera: () => void;
    showComOverlay?: boolean;
    onToggleComOverlay?: () => void;
}

// --- Component Section ---
export const ShaperCanvasToolbar: React.FC<ShaperCanvasToolbarProps> = ({
    layers,
    viewZ,
    showExits,
    onAddExtraRoom,
    onSetViewZ,
    onSetShowExits,
    onResetCamera,
    showComOverlay = false,
    onToggleComOverlay
}) => (
    <div className="shaper-layer-toolbar" aria-label="Concept map layers">
        <span className="shaper-z-level-display">Z: {viewZ}</span>
        <button
            type="button"
            className="shaper-z-level-btn"
            onClick={() => onSetViewZ(viewZ - 1)}
            title="Layer Down"
        >
            -
        </button>
        <button
            type="button"
            className="shaper-z-level-btn"
            onClick={() => onSetViewZ(viewZ + 1)}
            title="Layer Up"
        >
            +
        </button>
        <button type="button" onClick={onAddExtraRoom}>Add Extra Room</button>
        <button type="button" onClick={() => onSetShowExits(!showExits)} className={showExits ? 'active' : ''}>
            {showExits ? 'Hide Exits' : 'Show Exits'}
        </button>
        <button
            type="button"
            onClick={onToggleComOverlay}
            className={`shaper-zoom-reset ${showComOverlay ? 'active' : ''}`}
            title="Toggle resets and load chances overlay"
            style={{
                borderColor: showComOverlay ? '#7c3aed' : undefined,
                background: showComOverlay ? 'rgba(124,58,237,0.15)' : undefined
            }}
        >
            {showComOverlay ? 'Hide Resets View' : 'Resets View'}
        </button>
        <button type="button" onClick={onResetCamera} className="shaper-zoom-reset" title="Reset view">
            Reset view
        </button>
    </div>
);
