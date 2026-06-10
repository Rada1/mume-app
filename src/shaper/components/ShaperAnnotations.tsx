/**
 * @file ShaperAnnotations.tsx
 * @description Room review annotations for collaborative Shaper feedback.
 */

import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import type { ShaperAnnotation } from '../model/shaperTypes';
import './ShaperAnnotations.css';

interface ShaperAnnotationsProps {
    annotations: ShaperAnnotation[];
    onAdd: (annotation: ShaperAnnotation) => void;
    onRemove: (annotationId: string) => void;
}

const createAnnotationId = (): string =>
    typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `annotation-${Date.now()}`;

// --- Component Section ---
export const ShaperAnnotations: React.FC<ShaperAnnotationsProps> = ({ annotations, onAdd, onRemove }) => {
    const [text, setText] = useState('');

    const addAnnotation = () => {
        const trimmed = text.trim();
        if (!trimmed) return;
        onAdd({ id: createAnnotationId(), text: trimmed, createdAt: Date.now() });
        setText('');
    };

    return (
        <section className="shaper-annotations">
            <div className="shaper-annotations-heading">
                <span>Annotations</span>
                <strong>{annotations.length}</strong>
            </div>

            {annotations.length === 0 && <p>No annotations yet.</p>}
            {annotations.map(annotation => (
                <div key={annotation.id} className="shaper-annotation">
                    <p>{annotation.text}</p>
                    <small>{new Date(annotation.createdAt).toLocaleString()}</small>
                    <button type="button" onClick={() => onRemove(annotation.id)} title="Remove annotation">
                        <X size={13} />
                    </button>
                </div>
            ))}

            <form className="shaper-annotation-add" onSubmit={event => { event.preventDefault(); addAnnotation(); }}>
                <textarea value={text} onChange={event => setText(event.target.value)} rows={3} placeholder="Add feedback for this room" />
                <button type="submit" title="Add annotation"><Plus size={14} /></button>
            </form>
        </section>
    );
};
