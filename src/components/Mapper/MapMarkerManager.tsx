/** @file Editor for the map marker selected on the map. */
import React from 'react';
import { X } from 'lucide-react';
import type { useMapMarkerEditor } from '../../hooks/useMapMarkerEditor';
import './MapMarkerManager.css';

// --- Marker Panel ---
export const MapMarkerManager = ({ editor }: { editor: ReturnType<typeof useMapMarkerEditor> }) =>
    <div className="map-marker-editor-backdrop" onPointerDown={event => {
        if (event.target === event.currentTarget) editor.close();
    }}>
        <section className="map-marker-editor map-popup-surface" role="dialog" aria-label="Map marker"
            onKeyDown={event => { event.stopPropagation(); if (event.key === 'Escape') editor.close(); }}>
            <header><strong>MAP MARKER</strong><button type="button" aria-label="Close marker editor" onClick={editor.close}><X size={16} /></button></header>
            {editor.draft && <form onSubmit={event => { event.preventDefault(); editor.save(); }}>
                <label>Label<input value={editor.draft.text} onChange={event => editor.change('text', event.target.value)} /></label>
                <div className="map-marker-fields">
                    <label>X<input type="number" step="any" required value={editor.draft.x} onChange={event => editor.change('x', event.target.value)} /></label>
                    <label>Y<input type="number" step="any" required value={editor.draft.y} onChange={event => editor.change('y', event.target.value)} /></label>
                    <label>Floor<input type="number" step="any" required value={editor.draft.z} onChange={event => editor.change('z', event.target.value)} /></label>
                    <label>Text size<input type="number" min="6" max="72" step="any" required value={editor.draft.fontSize} onChange={event => editor.change('fontSize', event.target.value)} /></label>
                    {editor.showDotSize && <label>Dot size<input type="number" min="1" max="30" step="any" required value={editor.draft.dotSize} onChange={event => editor.change('dotSize', event.target.value)} /></label>}
                </div>
                {editor.error && <p role="alert">{editor.error}</p>}
                <footer><button type="button" className="map-marker-delete" onClick={editor.remove}>Delete marker</button>
                    <button type="button" onClick={editor.close}>Cancel</button><button type="submit">Save</button></footer>
            </form>}
            {editor.deleted && <div className="map-marker-undo" role="status">Marker deleted.<button type="button" onClick={editor.undo}>Undo</button></div>}
        </section>
    </div>;
