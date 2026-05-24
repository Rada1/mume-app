/**
 * @file TracingHUD.tsx
 * @description Floating developer overlay panel for visual background alignment,
 * landmark anchor calibration, and path tracing of coastlines, rivers, mountains, and forests.
 */

import React, { useState } from 'react';
import { MiddleEarthVectors } from './mapperTypes';

interface TracingHUDProps {
    calibration: {
        bgScale: number;
        bgTranslateX: number;
        bgTranslateY: number;
        bgOpacity: number;
    };
    setCalibration: React.Dispatch<React.SetStateAction<{
        bgScale: number;
        bgTranslateX: number;
        bgTranslateY: number;
        bgOpacity: number;
    }>>;
    activePath: number[][];
    vectors: MiddleEarthVectors;
    onAddPath: (layer: 'coastlines' | 'rivers' | 'mountains' | 'forests') => void;
    onAddLabel: (text: string, size: number) => void;
    onClearPath: () => void;
    onUndoPoint: () => void;
    hoverCoord: { mx: number; my: number; px: number; py: number } | null;
    anchorRegisterState: 'idle' | 'mithlond' | 'hobbiton' | 'bree' | 'rivendell';
    setAnchorRegisterState: (state: 'idle' | 'mithlond' | 'hobbiton' | 'bree' | 'rivendell') => void;
    anchors: {
        mithlond: { px: number; py: number } | null;
        hobbiton: { px: number; py: number } | null;
        bree: { px: number; py: number } | null;
        rivendell: { px: number; py: number } | null;
    };
    onAutoCalibrate: () => void;
    onClearAnchors: () => void;
    onSaveAllToVectorsJson: () => void;
}

// --- Logic Section: UI Component ---

export const TracingHUD: React.FC<TracingHUDProps> = ({
    calibration,
    setCalibration,
    activePath,
    vectors,
    onAddPath,
    onAddLabel,
    onClearPath,
    onUndoPoint,
    hoverCoord,
    anchorRegisterState,
    setAnchorRegisterState,
    anchors,
    onAutoCalibrate,
    onClearAnchors,
    onSaveAllToVectorsJson
}) => {
    const [activeTab, setActiveTab] = useState<'trace' | 'calibrate' | 'data'>('trace');
    const [isMovedDown, setIsMovedDown] = useState(true);
    const [activeLayer, setActiveLayer] = useState<'coastlines' | 'rivers' | 'mountains' | 'forests'>('coastlines');
    const [labelText, setLabelText] = useState('');
    const [labelSize, setLabelSize] = useState(14);

    const handleCopyJson = () => {
        const jsonStr = JSON.stringify(
            {
                calibration,
                ...vectors
            },
            null,
            2
        );
        navigator.clipboard.writeText(jsonStr);
        alert('Copied vectors & calibration JSON to clipboard!');
    };

    // Styling constants (Glassmorphism theme)
    const panelStyle: React.CSSProperties = {
        position: 'absolute',
        top: isMovedDown ? 'auto' : '12px',
        bottom: isMovedDown ? '12px' : 'auto',
        right: '12px',
        width: '320px',
        maxHeight: 'calc(100% - 24px)',
        backgroundColor: 'rgba(15, 23, 42, 0.85)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '12px',
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5)',
        color: '#f8fafc',
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: '12px',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
    };

    const headerStyle: React.CSSProperties = {
        padding: '12px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        fontWeight: 'bold',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'linear-gradient(to right, rgba(30, 41, 59, 0.5), rgba(15, 23, 42, 0.5))'
    };

    const tabNavStyle: React.CSSProperties = {
        display: 'flex',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
    };

    const tabButtonStyle = (isActive: boolean): React.CSSProperties => ({
        flex: 1,
        padding: '8px',
        backgroundColor: isActive ? 'transparent' : 'rgba(0,0,0,0.2)',
        border: 'none',
        borderBottom: isActive ? '2px solid #3b82f6' : 'none',
        color: isActive ? '#f8fafc' : '#94a3b8',
        cursor: 'pointer',
        textAlign: 'center',
        fontWeight: isActive ? 'bold' : 'normal',
        outline: 'none'
    });

    const bodyStyle: React.CSSProperties = {
        padding: '12px',
        overflowY: 'auto',
        flex: 1
    };

    const sliderContainerStyle: React.CSSProperties = {
        marginBottom: '10px'
    };

    const flexRowBetweenStyle: React.CSSProperties = {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '4px'
    };

    const controlButtonStyle: React.CSSProperties = {
        padding: '6px 12px',
        backgroundColor: '#1e293b',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        borderRadius: '6px',
        color: '#f8fafc',
        cursor: 'pointer',
        fontSize: '11px',
        marginRight: '6px',
        marginBottom: '6px',
        transition: 'background-color 0.2s'
    };

    const primaryButtonStyle: React.CSSProperties = {
        ...controlButtonStyle,
        backgroundColor: '#2563eb',
        borderColor: '#3b82f6',
        fontWeight: 'bold'
    };

    return (
        <div style={panelStyle}>
            <div style={headerStyle}>
                <span>Middle-earth Tracing HUD</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                        onClick={() => setIsMovedDown(!isMovedDown)}
                        style={{
                            backgroundColor: 'rgba(255, 255, 255, 0.1)',
                            border: 'none',
                            borderRadius: '4px',
                            color: '#f8fafc',
                            cursor: 'pointer',
                            padding: '2px 6px',
                            fontSize: '10px'
                        }}
                    >
                        {isMovedDown ? "Move Up ▲" : "Move Down ▼"}
                    </button>
                    <span style={{ fontSize: '10px', color: '#10b981' }}>Dev Mode Active</span>
                </div>
            </div>

            <div style={tabNavStyle}>
                <button
                    style={tabButtonStyle(activeTab === 'trace')}
                    onClick={() => setActiveTab('trace')}
                >
                    Trace Path
                </button>
                <button
                    style={tabButtonStyle(activeTab === 'calibrate')}
                    onClick={() => setActiveTab('calibrate')}
                >
                    Calibrate
                </button>
                <button
                    style={tabButtonStyle(activeTab === 'data')}
                    onClick={() => setActiveTab('data')}
                >
                    Data/Save
                </button>
            </div>

            <div style={bodyStyle}>
                {/* --- Trace Tab --- */}
                {activeTab === 'trace' && (
                    <div>
                        <div style={{ marginBottom: '10px' }}>
                            <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>Active Layer:</label>
                            <select
                                value={activeLayer}
                                onChange={(e) => setActiveLayer(e.target.value as any)}
                                style={{
                                    width: '100%',
                                    padding: '6px',
                                    backgroundColor: '#0f172a',
                                    color: '#f8fafc',
                                    border: '1px solid rgba(255,255,255,0.2)',
                                    borderRadius: '6px'
                                }}
                            >
                                <option value="coastlines">Coastlines</option>
                                <option value="rivers">Rivers</option>
                                <option value="mountains">Mountains</option>
                                <option value="forests">Forests</option>
                            </select>
                        </div>

                        <div style={{ marginBottom: '12px' }}>
                            <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>Active Path Points: {activePath.length}</div>
                            <div style={{ display: 'flex', flexWrap: 'wrap' }}>
                                <button style={controlButtonStyle} onClick={onUndoPoint} disabled={activePath.length === 0}>
                                    Undo Last
                                </button>
                                <button style={controlButtonStyle} onClick={onClearPath} disabled={activePath.length === 0}>
                                    Clear Path
                                </button>
                                <button
                                    style={primaryButtonStyle}
                                    onClick={() => onAddPath(activeLayer)}
                                    disabled={activePath.length < 2}
                                >
                                    Save Path to Layer
                                </button>
                            </div>
                        </div>

                        <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '10px', marginBottom: '12px' }}>
                            <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>Add Label:</label>
                            <input
                                type="text"
                                placeholder="Label Text (e.g. THE SHIRE)"
                                value={labelText}
                                onChange={(e) => setLabelText(e.target.value)}
                                style={{
                                    width: '150px',
                                    padding: '5px',
                                    backgroundColor: '#0f172a',
                                    color: '#f8fafc',
                                    border: '1px solid rgba(255,255,255,0.2)',
                                    borderRadius: '6px',
                                    marginRight: '6px'
                                }}
                            />
                            <input
                                type="number"
                                placeholder="Size"
                                value={labelSize}
                                onChange={(e) => setLabelSize(parseInt(e.target.value) || 14)}
                                style={{
                                    width: '50px',
                                    padding: '5px',
                                    backgroundColor: '#0f172a',
                                    color: '#f8fafc',
                                    border: '1px solid rgba(255,255,255,0.2)',
                                    borderRadius: '6px',
                                    marginRight: '6px'
                                }}
                            />
                            <button
                                style={primaryButtonStyle}
                                onClick={() => {
                                    if (labelText.trim()) {
                                        onAddLabel(labelText.trim(), labelSize);
                                        setLabelText('');
                                    }
                                }}
                            >
                                Add
                            </button>
                        </div>
                    </div>
                )}

                {/* --- Calibrate Tab --- */}
                {activeTab === 'calibrate' && (
                    <div>
                        <div style={sliderContainerStyle}>
                            <div style={flexRowBetweenStyle}>
                                <span>Background Opacity</span>
                                <input
                                    type="number"
                                    min="0"
                                    max="1"
                                    step="0.05"
                                    value={calibration.bgOpacity}
                                    onChange={(e) => {
                                        const val = parseFloat(e.target.value);
                                        if (!isNaN(val)) setCalibration(prev => ({ ...prev, bgOpacity: val }));
                                    }}
                                    style={{
                                        width: '75px',
                                        backgroundColor: '#0f172a',
                                        color: '#f8fafc',
                                        border: '1px solid rgba(255, 255, 255, 0.2)',
                                        borderRadius: '4px',
                                        padding: '2px 6px',
                                        fontSize: '11px',
                                        textAlign: 'right',
                                        outline: 'none'
                                    }}
                                />
                            </div>
                            <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.05"
                                value={calibration.bgOpacity}
                                onChange={(e) =>
                                    setCalibration((prev) => ({ ...prev, bgOpacity: parseFloat(e.target.value) }))
                                }
                                style={{ width: '100%' }}
                            />
                        </div>

                         <div style={sliderContainerStyle}>
                            <div style={flexRowBetweenStyle}>
                                <span>Scale</span>
                                <input
                                    type="number"
                                    min="0.01"
                                    max="100.0"
                                    step="0.0001"
                                    value={calibration.bgScale}
                                    onChange={(e) => {
                                        const val = parseFloat(e.target.value);
                                        if (!isNaN(val)) setCalibration(prev => ({ ...prev, bgScale: val }));
                                    }}
                                    style={{
                                        width: '75px',
                                        backgroundColor: '#0f172a',
                                        color: '#f8fafc',
                                        border: '1px solid rgba(255, 255, 255, 0.2)',
                                        borderRadius: '4px',
                                        padding: '2px 6px',
                                        fontSize: '11px',
                                        textAlign: 'right',
                                        outline: 'none'
                                    }}
                                />
                            </div>
                            <input
                                type="range"
                                min="0.01"
                                max="100.0"
                                step="0.0001"
                                value={calibration.bgScale}
                                onChange={(e) =>
                                    setCalibration((prev) => ({ ...prev, bgScale: parseFloat(e.target.value) }))
                                }
                                style={{ width: '100%' }}
                             />
                         </div>
 
                         <div style={sliderContainerStyle}>
                             <div style={flexRowBetweenStyle}>
                                 <span>Translate X</span>
                                 <input
                                     type="number"
                                     min="-300000"
                                     max="300000"
                                     step="1"
                                     value={Math.round(calibration.bgTranslateX)}
                                     onChange={(e) => {
                                         const val = parseInt(e.target.value);
                                         if (!isNaN(val)) setCalibration(prev => ({ ...prev, bgTranslateX: val }));
                                     }}
                                     style={{
                                         width: '75px',
                                         backgroundColor: '#0f172a',
                                         color: '#f8fafc',
                                         border: '1px solid rgba(255, 255, 255, 0.2)',
                                         borderRadius: '4px',
                                         padding: '2px 6px',
                                         fontSize: '11px',
                                         textAlign: 'right',
                                         outline: 'none'
                                     }}
                                 />
                             </div>
                             <input
                                 type="range"
                                 min="-300000"
                                 max="300000"
                                 step="1"
                                 value={calibration.bgTranslateX}
                                 onChange={(e) =>
                                     setCalibration((prev) => ({ ...prev, bgTranslateX: parseInt(e.target.value) }))
                                 }
                                 style={{ width: '100%' }}
                             />
                         </div>
 
                         <div style={sliderContainerStyle}>
                             <div style={flexRowBetweenStyle}>
                                 <span>Translate Y</span>
                                 <input
                                     type="number"
                                     min="-300000"
                                     max="300000"
                                     step="1"
                                     value={Math.round(calibration.bgTranslateY)}
                                     onChange={(e) => {
                                         const val = parseInt(e.target.value);
                                         if (!isNaN(val)) setCalibration(prev => ({ ...prev, bgTranslateY: val }));
                                     }}
                                     style={{
                                         width: '75px',
                                         backgroundColor: '#0f172a',
                                         color: '#f8fafc',
                                         border: '1px solid rgba(255, 255, 255, 0.2)',
                                         borderRadius: '4px',
                                         padding: '2px 6px',
                                         fontSize: '11px',
                                         textAlign: 'right',
                                         outline: 'none'
                                     }}
                                 />
                             </div>
                             <input
                                 type="range"
                                 min="-300000"
                                 max="300000"
                                 step="1"
                                 value={calibration.bgTranslateY}
                                 onChange={(e) =>
                                     setCalibration((prev) => ({ ...prev, bgTranslateY: parseInt(e.target.value) }))
                                 }
                                 style={{ width: '100%' }}
                             />
                         </div>

                        <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '10px' }}>
                            <div style={{ fontWeight: 'bold', marginBottom: '6px' }}>Landmark Anchor Calibration:</div>
                            <div style={{ marginBottom: '8px' }}>
                                <button
                                    style={{
                                        ...controlButtonStyle,
                                        backgroundColor: anchorRegisterState === 'mithlond' ? '#dc2626' : '#1e293b'
                                    }}
                                    onClick={() => setAnchorRegisterState(anchorRegisterState === 'mithlond' ? 'idle' : 'mithlond')}
                                >
                                    Set Mithlond (60, -76)
                                </button>
                                <span style={{ marginLeft: '4px', fontSize: '10px' }}>
                                    {anchors.mithlond ? `[${anchors.mithlond.px}, ${anchors.mithlond.py}]` : 'Not Set'}
                                </span>
                            </div>
                            <div style={{ marginBottom: '8px' }}>
                                <button
                                    style={{
                                        ...controlButtonStyle,
                                        backgroundColor: anchorRegisterState === 'hobbiton' ? '#dc2626' : '#1e293b'
                                    }}
                                    onClick={() => setAnchorRegisterState(anchorRegisterState === 'hobbiton' ? 'idle' : 'hobbiton')}
                                >
                                    Set Hobbiton Central (156, -68)
                                </button>
                                <span style={{ marginLeft: '4px', fontSize: '10px' }}>
                                    {anchors.hobbiton ? `[${anchors.hobbiton.px}, ${anchors.hobbiton.py}]` : 'Not Set'}
                                </span>
                            </div>
                            <div style={{ marginBottom: '8px' }}>
                                <button
                                    style={{
                                        ...controlButtonStyle,
                                        backgroundColor: anchorRegisterState === 'bree' ? '#dc2626' : '#1e293b'
                                    }}
                                    onClick={() => setAnchorRegisterState(anchorRegisterState === 'bree' ? 'idle' : 'bree')}
                                >
                                    Set West Gate of Bree (227, -97)
                                </button>
                                <span style={{ marginLeft: '4px', fontSize: '10px' }}>
                                    {anchors.bree ? `[${anchors.bree.px}, ${anchors.bree.py}]` : 'Not Set'}
                                </span>
                            </div>
                            <div style={{ marginBottom: '8px' }}>
                                <button
                                    style={{
                                        ...controlButtonStyle,
                                        backgroundColor: anchorRegisterState === 'rivendell' ? '#dc2626' : '#1e293b'
                                    }}
                                    onClick={() => setAnchorRegisterState(anchorRegisterState === 'rivendell' ? 'idle' : 'rivendell')}
                                >
                                    Set Rivendell (393, 1)
                                </button>
                                <span style={{ marginLeft: '4px', fontSize: '10px' }}>
                                    {anchors.rivendell ? `[${anchors.rivendell.px}, ${anchors.rivendell.py}]` : 'Not Set'}
                                </span>
                            </div>

                            <div style={{ display: 'flex', marginTop: '10px' }}>
                                <button
                                    style={primaryButtonStyle}
                                    onClick={onAutoCalibrate}
                                    disabled={Object.values(anchors).filter(Boolean).length < 2}
                                >
                                    Calculate & Apply
                                </button>
                                <button style={controlButtonStyle} onClick={onClearAnchors}>
                                    Reset
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* --- Data Tab --- */}
                {activeTab === 'data' && (
                    <div>
                        <div style={{ marginBottom: '10px' }}>
                            <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>Vectors Count:</div>
                            <div>Coastlines: {vectors.coastlines.length} lines</div>
                            <div>Rivers: {vectors.rivers.length} lines</div>
                            <div>Mountains: {vectors.mountains.length} ridges</div>
                            <div>Forests: {vectors.forests.length} zones</div>
                            <div>Labels: {vectors.labels.length} text</div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <button style={primaryButtonStyle} onClick={handleCopyJson}>
                                Copy JSON to Clipboard
                            </button>
                            <button style={controlButtonStyle} onClick={onSaveAllToVectorsJson}>
                                Save Directly to file
                            </button>
                        </div>

                        <div style={{ marginTop: '10px', fontSize: '10px', color: '#94a3b8', lineHeight: '1.4' }}>
                            <strong>Instructions:</strong>
                            <ol style={{ paddingLeft: '14px', margin: '4px 0' }}>
                                <li>Tap Coastline, River, Forest, or Mountains options.</li>
                                <li>Click/tap on the canvas to place points trace-by-trace.</li>
                                <li>Click 'Save Path' to write that stroke.</li>
                                <li>To add a label, type text, hover click position, and hit Add.</li>
                                <li>Click 'Save Directly' to write the vectors JSON file.</li>
                            </ol>
                        </div>
                    </div>
                )}
            </div>

            {/* Coordinates Footer */}
            <div
                style={{
                    padding: '8px 12px',
                    borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                    backgroundColor: 'rgba(0,0,0,0.3)',
                    fontSize: '10px',
                    color: '#94a3b8',
                    display: 'flex',
                    justifyContent: 'space-between'
                }}
            >
                <span>
                    MUME: {hoverCoord ? `${Math.round(hoverCoord.mx)}, ${Math.round(hoverCoord.my)}` : 'N/A'}
                </span>
                <span>
                    Pixel: {hoverCoord ? `${Math.round(hoverCoord.px)}, ${Math.round(hoverCoord.py)}` : 'N/A'}
                </span>
            </div>
        </div>
    );
};

