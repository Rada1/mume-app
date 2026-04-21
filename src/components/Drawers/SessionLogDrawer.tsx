/**
 * @file SessionLogDrawer.tsx
 * @description Drawer for viewing the full session log archive and selecting trim ranges.
 */

import React, { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Search, Play, Scissors, Video, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useUI, useBaseGame } from '../../context/GameContext';
import './SessionLogDrawer.css';

const formatOffset = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
};

interface LogLine {
    id: string;
    timestamp: number;
    text: string;
    type: 'rx' | 'tx' | 'sys';
}

export const SessionLogDrawer: React.FC<{ isOpen: boolean; onClose: () => void }> = ({
    isOpen,
    onClose
}) => {
    const { replayer } = useUI();
    const { sessionMode } = useBaseGame();
    const [searchQuery, setSearchQuery] = useState('');
    const parentRef = useRef<HTMLDivElement>(null);

    // Decode session log into readable lines
    const logLines = useMemo(() => {
        if (!replayer.log || !replayer.log.log) return [];

        const lines: LogLine[] = [];
        let combinedRx = '';
        let lastRxTs = 0;

        replayer.log.log.forEach((entry, idx) => {
            const typ = entry.typ;
            const data = entry.d;
            const ts = entry.t;

            if (typ === 'rx') {
                let text: string;
                if (typeof data === 'string') text = data;
                else if (Array.isArray(data)) text = new TextDecoder().decode(new Uint8Array(data));
                else if (data instanceof Uint8Array) text = new TextDecoder().decode(data);
                else text = String(data);

                combinedRx += text;
                lastRxTs = ts;
            } else if (typ === 'tx' || typ === 'sys') {
                // Flush RX
                if (combinedRx) {
                    const rxLines = combinedRx.split('\n');
                    rxLines.forEach((line, lIdx) => {
                        if (line.trim() || lIdx < rxLines.length - 1) {
                            lines.push({
                                id: `rx-${idx}-${lIdx}`,
                                timestamp: lastRxTs,
                                text: line.replace(/\x1b\[[0-9;]*m/g, ''), // Strip ANSI for archive view
                                type: 'rx'
                            });
                        }
                    });
                    combinedRx = '';
                }

                if (typ === 'tx') {
                    lines.push({
                        id: `tx-${idx}`,
                        timestamp: ts,
                        text: String(data),
                        type: 'tx'
                    });
                } else if (typ === 'sys') {
                    lines.push({
                        id: `sys-${idx}`,
                        timestamp: ts,
                        text: typeof data === 'string' ? data : JSON.stringify(data),
                        type: 'sys'
                    });
                }
            }
        });

        // Final flush
        if (combinedRx) {
            const rxLines = combinedRx.split('\n');
            rxLines.forEach((line, lIdx) => {
                lines.push({
                    id: `rx-final-${lIdx}`,
                    timestamp: lastRxTs,
                    text: line.replace(/\x1b\[[0-9;]*m/g, ''),
                    type: 'rx'
                });
            });
        }

        return lines;
    }, [replayer.log]);

    const filteredLines = useMemo(() => {
        if (!searchQuery.trim()) return logLines;
        const q = searchQuery.toLowerCase();
        return logLines.filter(l => l.text.toLowerCase().includes(q));
    }, [logLines, searchQuery]);

    const rowVirtualizer = useVirtualizer({
        count: filteredLines.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => 26,
        overscan: 10,
    });

    const handleLineClick = useCallback((line: LogLine) => {
        replayer.seek(line.timestamp);
        replayer.play();
    }, [replayer]);

    const setStart = (ts: number) => {
        replayer.setTrimRange([ts, replayer.state.trimRange?.[1] ?? null]);
    };

    const setEnd = (ts: number) => {
        replayer.setTrimRange([replayer.state.trimRange?.[0] ?? null, ts]);
    };

    const isWithinTrim = (ts: number) => {
        const [start, end] = replayer.state.trimRange || [null, null];
        if (start === null || end === null) return false;
        return ts >= start && ts <= end;
    };

    if (!isOpen) return null;

    return (
        <div className={`character-drawer-overlay ${isOpen ? 'open' : ''}`} style={{ zIndex: 4000 }}>
            <div className={`character-drawer-content log-card-drawer ${isOpen ? 'open' : ''}`}>
                <div className="session-log-drawer">
                    <div className="session-log-header">
                        <div className="session-log-header-main">
                            <h2><Scissors size={20} /> Session Archive</h2>
                            <button className="close-button" onClick={onClose}><X size={20} /></button>
                        </div>
                        <div className="search-container">
                            <Search size={16} className="search-icon" />
                            <input
                                type="text"
                                className="search-input"
                                placeholder="Search log for keywords..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="log-virtual-container" ref={parentRef}>
                        <div
                            style={{
                                height: `${rowVirtualizer.getTotalSize()}px`,
                                width: '100%',
                                position: 'relative',
                            }}
                        >
                            {rowVirtualizer.getVirtualItems().map((virtualItem) => {
                                const line = filteredLines[virtualItem.index];
                                const isStart = replayer.state.trimRange?.[0] === line.timestamp;
                                const isEnd = replayer.state.trimRange?.[1] === line.timestamp;
                                const inTrim = isWithinTrim(line.timestamp);

                                return (
                                    <div
                                        key={virtualItem.key}
                                        className={`log-item ${inTrim ? 'selected' : ''} ${isStart ? 'is-start' : ''} ${isEnd ? 'is-end' : ''}`}
                                        style={{
                                            position: 'absolute',
                                            top: 0,
                                            left: 0,
                                            width: '100%',
                                            height: `${virtualItem.size}px`,
                                            transform: `translateY(${virtualItem.start}px)`,
                                        }}
                                        onClick={() => handleLineClick(line)}
                                    >
                                        <div className="log-timestamp">{formatOffset(line.timestamp)}</div>
                                        <div className="log-content">{line.text || ' '}</div>
                                        <div className="log-actions">
                                            <button
                                                className={`log-action-btn ${isStart ? 'active' : ''}`}
                                                title="Set Start"
                                                onClick={(e) => { e.stopPropagation(); setStart(line.timestamp); }}
                                            >
                                                <ChevronRight size={14} />
                                            </button>
                                            <button
                                                className={`log-action-btn ${isEnd ? 'active' : ''}`}
                                                title="Set End"
                                                onClick={(e) => { e.stopPropagation(); setEnd(line.timestamp); }}
                                            >
                                                <ChevronLeft size={14} />
                                            </button>
                                            <button
                                                className="log-action-btn"
                                                title="Play from here"
                                                onClick={(e) => { e.stopPropagation(); handleLineClick(line); }}
                                            >
                                                <Play size={14} />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {replayer.state.trimRange?.[0] !== null && replayer.state.trimRange?.[1] !== null && (
                        <div className="trim-range-indicator">
                            <div className="trim-info">
                                RANGE: {formatOffset(replayer.state.trimRange![0]!)} - {formatOffset(replayer.state.trimRange![1]!)}
                                ({Math.round((replayer.state.trimRange![1]! - replayer.state.trimRange![0]!) / 1000)}s)
                            </div>
                            <button
                                className="record-btn"
                                onClick={() => replayer.startExport()}
                                disabled={replayer.state.isExporting}
                            >
                                <Video size={18} />
                                {replayer.state.isExporting ? 'RECORDING...' : 'EXPORT WEBM'}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
