/**
 * @file MumeEditor.tsx
 * @description Modal editor for generic MUME edit sessions.
 */

import React, { useState, useEffect, useRef } from 'react';
import { useGame } from '../../context/GameContext';
import { X } from 'lucide-react';
import './MumeEditor.css';

export const MumeEditor: React.FC = () => {
    const { mumeEditState, setMumeEditState, handleSaveMumeEdit, handleCancelMumeEdit } = useGame();
    const [text, setText] = useState('');
    const isViewMode = mumeEditState.mode === 'view';
    
    // Position & sizing state
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [size, setSize] = useState({ width: 800, height: 600 });
    
    // Dragging & resizing status
    const [isDragging, setIsDragging] = useState(false);
    const [isResizing, setIsResizing] = useState(false);
    
    const dragStart = useRef({ x: 0, y: 0 });
    const dragOffset = useRef({ x: 0, y: 0 });
    const resizeStart = useRef({ x: 0, y: 0 });
    const resizeSize = useRef({ width: 800, height: 600 });

    useEffect(() => {
        if (mumeEditState.isOpen) {
            setText(mumeEditState.text);
            // Reset position to center on open
            setPosition({ x: 0, y: 0 });
            setSize({ width: 800, height: 600 });
        }
    }, [mumeEditState.isOpen, mumeEditState.text]);

    useEffect(() => {
        if (!isDragging && !isResizing) return;

        const handleMouseMove = (e: MouseEvent) => {
            if (isDragging) {
                const dx = e.clientX - dragStart.current.x;
                const dy = e.clientY - dragStart.current.y;
                setPosition({
                    x: dragOffset.current.x + dx,
                    y: dragOffset.current.y + dy
                });
            } else if (isResizing) {
                const dx = e.clientX - resizeStart.current.x;
                const dy = e.clientY - resizeStart.current.y;
                setSize({
                    width: Math.max(400, resizeSize.current.width + dx),
                    height: Math.max(300, resizeSize.current.height + dy)
                });
            }
        };

        const handleMouseUp = () => {
            setIsDragging(false);
            setIsResizing(false);
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, isResizing]);

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

    const handleHeaderMouseDown = (e: React.MouseEvent) => {
        if (e.button !== 0) return; // Left click only
        setIsDragging(true);
        dragStart.current = { x: e.clientX, y: e.clientY };
        dragOffset.current = { ...position };
        e.preventDefault();
    };

    const handleResizeMouseDown = (e: React.MouseEvent) => {
        if (e.button !== 0) return;
        setIsResizing(true);
        resizeStart.current = { x: e.clientX, y: e.clientY };
        resizeSize.current = { ...size };
        e.stopPropagation();
        e.preventDefault();
    };

    const style: React.CSSProperties = {
        position: 'absolute',
        width: `${size.width}px`,
        height: `${size.height}px`,
        left: `calc(50% - ${size.width / 2}px + ${position.x}px)`,
        top: `calc(50% - ${size.height / 2}px + ${position.y}px)`,
    };

    return (
        <div className="mume-editor-overlay" onClick={handleCancel}>
            <div 
                className="mume-editor-container"
                style={style}
                onClick={e => e.stopPropagation()}
            >
                <div 
                    className="mume-editor-header"
                    onMouseDown={handleHeaderMouseDown}
                    style={{ cursor: 'move' }}
                >
                    <div className="mume-editor-title-block">
                        <h2>{mumeEditState.title || 'Mume Editor'}</h2>
                    </div>
                    <button className="icon-btn" onClick={handleCancel} onMouseDown={e => e.stopPropagation()}>
                        <X size={20} />
                    </button>
                </div>
                <div className="mume-editor-content">
                    <textarea
                        className="mume-editor-textarea"
                        value={text}
                        onChange={e => setText(e.target.value)}
                        placeholder="Enter text..."
                        readOnly={isViewMode}
                        autoFocus
                    />
                </div>
                <div className="mume-editor-footer">
                    <button className="mume-editor-btn cancel" onClick={handleCancel}>
                        {isViewMode ? 'Close' : 'Cancel'}
                    </button>
                    {!isViewMode && (
                        <button className="mume-editor-btn save" onClick={handleSave}>
                            Save
                        </button>
                    )}
                </div>
                <div 
                    className="mume-editor-resize-handle" 
                    onMouseDown={handleResizeMouseDown}
                />
            </div>
        </div>
    );
};
