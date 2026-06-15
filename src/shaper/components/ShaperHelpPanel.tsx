/**
 * @file ShaperHelpPanel.tsx
 * @description Searchable and formatted builder guides panel with clickable TOC links and next/prev search cursor navigation.
 */

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Search, ChevronDown, ChevronUp } from 'lucide-react';

// @ts-ignore
import buildersGuide from '../../../docs/builders_guide.md?raw';
// @ts-ignore
import comHelp from '../../../docs/com_help.md?raw';
// @ts-ignore
import infoZoneHelp from '../../../docs/info_zone_stat_help.md?raw';
// @ts-ignore
import libCommandsRef from '../../../docs/lib_commands_reference.md?raw';
// @ts-ignore
import libHelp from '../../../docs/lib_help.md?raw';
// @ts-ignore
import roomHelp from '../../../docs/room_help.md?raw';
// @ts-ignore
import shaperHelp from '../../../docs/shaper.md?raw';

interface GuideOption {
    id: string;
    title: string;
    content: string;
}

interface HeadingLink {
    text: string;
    lineIndex: number;
    id: string;
}

// --- Component Section ---
export const ShaperHelpPanel: React.FC = () => {
    const listContainerRef = useRef<HTMLDivElement>(null);
    const guides = useMemo<GuideOption[]>(() => [
        { id: 'builders_guide', title: "Ariakas' Building Guide", content: buildersGuide },
        { id: 'room_help', title: 'Room Building Help', content: roomHelp },
        { id: 'com_help', title: '/com Reset Commands Help', content: comHelp },
        { id: 'lib_commands_ref', title: '/lib Command Reference', content: libCommandsRef },
        { id: 'lib_help', title: '/lib Scripts Help', content: libHelp },
        { id: 'info_zone_stat_help', title: '/info & /stat Help', content: infoZoneHelp },
        { id: 'shaper', title: 'Shaper Workspace Spec', content: shaperHelp }
    ], []);

    const [activeGuideId, setActiveGuideId] = useState<string>('builders_guide');
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [matchCursor, setMatchCursor] = useState<number>(0);

    const activeGuide = useMemo(() => {
        return guides.find(g => g.id === activeGuideId) || guides[0];
    }, [guides, activeGuideId]);

    const lines = useMemo(() => {
        return activeGuide.content.split('\n');
    }, [activeGuide]);

    // Find where TOC section starts dynamically
    const tocStartIndex = useMemo(() => {
        return lines.findIndex(l => l.toUpperCase().includes('TABLE OF CONTENTS'));
    }, [lines]);

    // Gather all headings (definitions) from the guide content
    const headings = useMemo<HeadingLink[]>(() => {
        const list: HeadingLink[] = [];
        lines.forEach((line, index) => {
            const trimmed = line.trim();
            if (!trimmed) return;

            // Check if this line is followed by an underline of === or ---
            const nextLine = lines[index + 1];
            const hasUnderline = nextLine && /^[=-]{3,}\s*$/.test(nextLine.trim());

            // Check if it's standard markdown heading
            const isMarkdownHeading = line.startsWith('#');

            // Check if it matches a chapter or section heading format
            const isChapterOrSectionFormat = /^Chapter\s+\d+/i.test(trimmed) || /^\d+\.\d*\.?\s+[A-Z]/i.test(trimmed);

            // It's a heading if:
            // 1. It has an underline
            // 2. Or it's a markdown heading
            // 3. Or it matches the format AND is outside the Table of Contents range
            const isTocRange = tocStartIndex !== -1 && index >= tocStartIndex && index < tocStartIndex + 35;

            if (hasUnderline || isMarkdownHeading || (isChapterOrSectionFormat && !isTocRange)) {
                list.push({
                    text: trimmed,
                    lineIndex: index,
                    id: `heading-${index}`
                });
            }
        });
        return list;
    }, [lines, tocStartIndex]);

    // Find all line indexes matching search query
    const matches = useMemo<number[]>(() => {
        const list: number[] = [];
        if (!searchQuery.trim()) return list;
        const query = searchQuery.toLowerCase();
        lines.forEach((line, index) => {
            if (line.toLowerCase().includes(query)) {
                list.push(index);
            }
        });
        return list;
    }, [lines, searchQuery]);

    // Reset match cursor when search query or active guide changes
    useEffect(() => {
        setMatchCursor(0);
    }, [searchQuery, activeGuideId]);

    // Auto-scroll to current match cursor
    useEffect(() => {
        if (matches.length > 0 && matches[matchCursor] !== undefined) {
            const lineIndex = matches[matchCursor];
            const lineElement = document.getElementById(`line-${lineIndex}`);
            if (lineElement && listContainerRef.current) {
                const container = listContainerRef.current;
                const elementTop = lineElement.offsetTop;
                const elementHeight = lineElement.offsetHeight;
                const containerHeight = container.clientHeight;
                container.scrollTo({
                    top: elementTop - containerHeight / 2 + elementHeight / 2,
                    behavior: 'smooth'
                });
            }
        }
    }, [matches, matchCursor]);

    const handleNextMatch = () => {
        if (matches.length === 0) return;
        setMatchCursor(prev => (prev + 1) % matches.length);
    };

    const handlePrevMatch = () => {
        if (matches.length === 0) return;
        setMatchCursor(prev => (prev - 1 + matches.length) % matches.length);
    };

    const scrollToLine = (lineIndex: number) => {
        const lineElement = document.getElementById(`line-${lineIndex}`);
        if (lineElement && listContainerRef.current) {
            listContainerRef.current.scrollTo({
                top: lineElement.offsetTop - 20,
                behavior: 'smooth'
            });
        }
    };

    // Helper to identify if a line is a TOC item that can link to a real heading
    const getTocLinkTargetIndex = (line: string, index: number): number => {
        const trimmed = line.trim();
        // A TOC item must be within the TOC range
        const isTocRange = tocStartIndex !== -1 && index >= tocStartIndex && index < tocStartIndex + 35;
        if (!isTocRange) return -1;

        // Check if it matches "Chapter X" or "X.Y"
        if (!(/^Chapter\s+\d+/i.test(trimmed) || /^\d+\.\d+\.?\s+/i.test(trimmed))) return -1;

        // Find the corresponding heading definition later in the file (after the TOC range)
        const cleanTocText = trimmed.toLowerCase().replace(/[^a-z0-9]/g, '');
        const match = headings.find(h => {
            if (h.lineIndex <= tocStartIndex + 35) return false;
            const cleanHeading = h.text.toLowerCase().replace(/[^a-z0-9]/g, '');
            return cleanHeading.includes(cleanTocText) || cleanTocText.includes(cleanHeading);
        });
        return match ? match.lineIndex : -1;
    };

    const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (e.shiftKey) {
                handlePrevMatch();
            } else {
                handleNextMatch();
            }
        }
    };

    return (
        <div className="shaper-db-panel" style={{ display: 'flex', flexDirection: 'column', height: '100%', minWidth: 0 }}>
            <div className="shaper-db-header">
                <h2>Help & Guides</h2>
                <p>Learn resets, mapping, and zone building standards</p>
            </div>

            <div className="shaper-db-filters" style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <select 
                        value={activeGuideId} 
                        onChange={e => setActiveGuideId(e.target.value)}
                        style={{
                            flex: 1,
                            border: '1px solid rgba(255, 255, 255, 0.14)',
                            borderRadius: '6px',
                            background: '#0e0e0e',
                            color: '#eef2f6',
                            padding: '8px 9px',
                            font: 'inherit'
                        }}
                    >
                        {guides.map(g => (
                            <option key={g.id} value={g.id}>{g.title}</option>
                        ))}
                    </select>

                    {headings.length > 0 && (
                        <select
                            onChange={e => {
                                const val = Number(e.target.value);
                                if (!isNaN(val)) scrollToLine(val);
                            }}
                            defaultValue=""
                            style={{
                                flex: 1,
                                border: '1px solid rgba(255, 255, 255, 0.14)',
                                borderRadius: '6px',
                                background: '#0e0e0e',
                                color: '#eef2f6',
                                padding: '8px 9px',
                                font: 'inherit'
                            }}
                        >
                            <option value="" disabled>Jump to Section...</option>
                            {headings.map(h => (
                                <option key={h.id} value={h.lineIndex}>{h.text}</option>
                            ))}
                        </select>
                    )}
                </div>

                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <div className="shaper-search-wrapper" style={{ margin: 0, flex: 1 }}>
                        <Search size={16} className="shaper-search-icon" />
                        <input
                            type="text"
                            placeholder="Search guide content..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            onKeyDown={handleSearchKeyDown}
                        />
                    </div>
                    {matches.length > 0 && (
                        <div style={{ display: 'flex', gap: '4px', alignItems: 'center', flexShrink: 0 }}>
                            <span style={{ fontSize: '11px', color: '#aab7c4', minWidth: '40px', textAlign: 'center' }}>
                                {matchCursor + 1}/{matches.length}
                            </span>
                            <button
                                type="button"
                                className="shaper-btn shaper-btn-secondary"
                                style={{ padding: '6px 8px', minWidth: 0, height: '32px' }}
                                onClick={handlePrevMatch}
                                title="Previous Match (Shift+Enter)"
                            >
                                <ChevronUp size={14} />
                            </button>
                            <button
                                type="button"
                                className="shaper-btn shaper-btn-secondary"
                                style={{ padding: '6px 8px', minWidth: 0, height: '32px' }}
                                onClick={handleNextMatch}
                                title="Next Match (Enter)"
                            >
                                <ChevronDown size={14} />
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <div 
                ref={listContainerRef}
                className="shaper-db-list" 
                style={{ 
                    flex: 1, 
                    background: '#141313', 
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '6px',
                    padding: '12px',
                    overflow: 'auto',
                    fontFamily: 'monospace',
                    fontSize: '12px',
                    lineHeight: '1.5',
                    position: 'relative'
                }}
            >
                {lines.map((line, index) => {
                    const isMatch = matches.includes(index);
                    const isActiveMatch = isMatch && matches[matchCursor] === index;
                    const heading = headings.find(h => h.lineIndex === index);
                    const tocTargetIndex = getTocLinkTargetIndex(line, index);

                    return (
                        <div 
                            key={index} 
                            id={`line-${index}`}
                            style={{
                                background: isActiveMatch ? 'rgba(240, 180, 91, 0.35)' : isMatch ? 'rgba(240, 180, 91, 0.12)' : undefined,
                                color: isActiveMatch ? '#ffffff' : heading ? '#f0b45b' : tocTargetIndex !== -1 ? '#8ecbf0' : '#c9d3dd',
                                fontWeight: heading ? 'bold' : 'normal',
                                cursor: tocTargetIndex !== -1 ? 'pointer' : 'text',
                                textDecoration: tocTargetIndex !== -1 ? 'underline' : 'none',
                                whiteSpace: 'pre-wrap'
                            }}
                            onClick={() => {
                                if (tocTargetIndex !== -1) {
                                    scrollToLine(tocTargetIndex);
                                }
                            }}
                        >
                            {line || ' '}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
