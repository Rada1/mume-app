import React, { useState, useEffect, useRef } from 'react';

interface KeywordEditModalProps {
    context: string;
    displayText: string;
    currentKeyword: string;
    hasOverride: boolean;
    onSave: (keyword: string) => void;
    onReset: () => void;
    onClose: () => void;
}

export const KeywordEditModal: React.FC<KeywordEditModalProps> = ({
    context, displayText, currentKeyword, hasOverride, onSave, onReset, onClose
}) => {
    const [value, setValue] = useState(currentKeyword);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setValue(currentKeyword);
        setTimeout(() => { inputRef.current?.focus(); inputRef.current?.select(); }, 80);
    }, [currentKeyword]);

    const handleSave = () => {
        const trimmed = value.trim();
        if (trimmed) onSave(trimmed);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleSave();
        if (e.key === 'Escape') onClose();
    };

    return (
        <div className="modal-overlay" onPointerDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
            <div className="modal keyword-edit-modal" style={{ maxWidth: 360 }}>
                <div className="modal-header">
                    <span className="modal-title" style={{ fontSize: '1rem' }}>Edit keyword</span>
                    <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>
                </div>

                <div style={{ marginBottom: 12, color: 'rgba(255,255,255,0.5)', fontSize: '0.82rem', fontStyle: 'italic' }}>
                    "{displayText !== context ? displayText : context}"
                </div>

                <label style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)', marginBottom: 6, display: 'block' }}>
                    Keyword sent to MUME:
                </label>
                <input
                    ref={inputRef}
                    className="settings-input"
                    value={value}
                    onChange={e => setValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="enter keyword…"
                    style={{ width: '100%', marginBottom: 16 }}
                />

                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    {hasOverride && (
                        <button className="btn btn-danger" style={{ marginRight: 'auto', fontSize: '0.82rem' }} onClick={onReset}>
                            Reset
                        </button>
                    )}
                    <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
                    <button className="btn btn-primary" onClick={handleSave} disabled={!value.trim()}>Save</button>
                </div>
            </div>
        </div>
    );
};
