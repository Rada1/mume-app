import React, { useState, useEffect } from 'react';
import { useGame } from '../context/GameContext';
import { X } from 'lucide-react';
import './MumeEditor.css';

export const MumeEditor: React.FC = () => {
    const { mumeEditState, setMumeEditState, handleSaveMumeEdit } = useGame();
    const [text, setText] = useState('');

    useEffect(() => {
        if (mumeEditState.isOpen) {
            setText(mumeEditState.text);
        }
    }, [mumeEditState.isOpen, mumeEditState.text]);

    if (!mumeEditState.isOpen) return null;

    const handleCancel = () => {
        setMumeEditState(prev => ({ ...prev, isOpen: false }));
    };

    const handleSave = () => {
        handleSaveMumeEdit(text);
    };

    return (
        <div className="mume-editor-overlay" onClick={handleCancel}>
            <div className="mume-editor-container" onClick={e => e.stopPropagation()}>
                <div className="mume-editor-header">
                    <h2>{mumeEditState.title || 'Mume Editor'}</h2>
                    <button className="icon-btn" onClick={handleCancel}>
                        <X size={20} />
                    </button>
                </div>
                <div className="mume-editor-content">
                    <textarea
                        className="mume-editor-textarea"
                        value={text}
                        onChange={e => setText(e.target.value)}
                        placeholder="Enter text..."
                        autoFocus
                    />
                </div>
                <div className="mume-editor-footer">
                    <button className="mume-editor-btn cancel" onClick={handleCancel}>
                        Cancel
                    </button>
                    <button className="mume-editor-btn save" onClick={handleSave}>
                        Save
                    </button>
                </div>
            </div>
        </div>
    );
};
