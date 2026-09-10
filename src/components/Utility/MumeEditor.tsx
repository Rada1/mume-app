/**
 * @file MumeEditor.tsx
 * @description Docked sliding editor panel for MUME edit sessions and local note composition.
 */

import React, { useState, useEffect } from 'react';
import { useGame } from '../../context/GameContext';
import { DrawerResizeHandle } from '../Drawers/DrawerResizeHandle';
import { X } from 'lucide-react';
import './MumeEditor.css';

interface MumeEditorProps {
    style?: React.CSSProperties;
}

// --- Component Section ---

export const MumeEditor: React.FC<MumeEditorProps> = ({ style }) => {
    const { mumeEditState, setMumeEditState, handleSaveMumeEdit, handleCancelMumeEdit, viewport } = useGame() as {
        mumeEditState: {
            isOpen: boolean;
            mode?: 'view' | 'edit';
            title?: string;
            text: string;
            context?: { kind?: string };
        };
        setMumeEditState: React.Dispatch<React.SetStateAction<any>>;
        handleSaveMumeEdit: (text: string) => void;
        handleCancelMumeEdit: () => void;
        viewport?: { isMobile: boolean };
    };

    const [text, setText] = useState('');
    const isViewMode = mumeEditState.mode === 'view';

    useEffect(() => {
        if (mumeEditState.isOpen) {
            setText(mumeEditState.text || '');
        }
    }, [mumeEditState.isOpen, mumeEditState.text]);

    if (!mumeEditState.isOpen) return null;
    if (
        mumeEditState.context?.kind === 'archive-reply' ||
        mumeEditState.context?.kind === 'archive-compose' ||
        mumeEditState.context?.kind === 'self-description' ||
        mumeEditState.context?.kind === 'self-whois'
    ) return null;

    const handleClose = () => {
        setMumeEditState(prev => ({ ...prev, isOpen: false, context: null }));
    };

    const handleCancel = () => {
        if (isViewMode) {
            handleClose();
            return;
        }
        handleCancelMumeEdit();
    };

    const handleSave = () => {
        if (isViewMode) {
            handleClose();
            return;
        }
        handleSaveMumeEdit(text);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            handleSave();
        }
    };

    const lineCount = text ? text.split('\n').length : 0;
    const charCount = text ? text.length : 0;

    return (
        <aside
            className="docked-panel mume-editor-panel"
            style={style}
            aria-label="MUME Editor"
        >
            {!viewport?.isMobile && (
                <DrawerResizeHandle
                    handleType="left"
                    widthVar="--desktop-editor-width"
                    minWidth={20}
                    maxWidth={65}
                />
            )}

            {/* Header */}
            <div className="mume-editor-panel-header">
                <div className="mume-editor-panel-title">
                    <span>{mumeEditState.title || 'MUME Editor'}</span>
                    <span className="mume-editor-stats">
                        ({lineCount} {lineCount === 1 ? 'line' : 'lines'}, {charCount} chars)
                    </span>
                </div>

                <button
                    type="button"
                    className="mume-editor-panel-close"
                    onClick={handleCancel}
                    title={isViewMode ? 'Close' : 'Cancel'}
                    aria-label="Close editor"
                >
                    <X size={16} />
                </button>
            </div>

            {/* Editor Content Area */}
            <div className="mume-editor-content">
                <textarea
                    className="mume-editor-textarea"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Enter text here... (Ctrl+Enter to save)"
                    readOnly={isViewMode}
                    autoFocus
                />
            </div>

            {/* Footer Actions */}
            <div className="mume-editor-footer">
                <button
                    type="button"
                    className="mume-editor-btn cancel"
                    onClick={handleCancel}
                >
                    {isViewMode ? 'Close' : 'Cancel'}
                </button>
                {!isViewMode && (
                    <button
                        type="button"
                        className="mume-editor-btn save"
                        onClick={handleSave}
                    >
                        Save
                    </button>
                )}
            </div>
        </aside>
    );
};

export default React.memo(MumeEditor);
