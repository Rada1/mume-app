/**
 * @file UnifiedView.tsx
 * @description A generic, high-performance view that renders parsed MUD lines sequentially.
 * Replaces specialized views with a "MUD-native" monospaced rendering approach.
 */

import React from 'react';
import { RefreshCw } from 'lucide-react';
import { DrawerLine } from '../../../types';
import { LineItem } from '../LineItem';
import { useGame } from '../../../context/GameContext';
import { extractMumeKeyword, isItemContainer } from '../../../utils/gameUtils';

interface UnifiedViewProps {
    lines: DrawerLine[];
    onRefresh?: () => void;
    emptyMessage?: string;
    category?: string;
}

const getContainerIndexAndKeyword = (line: DrawerLine, lines: DrawerLine[]) => {
    const keyword = extractMumeKeyword(line.text);
    if (!keyword) return { count: 1, keyword: '' };
    
    let count = 0;
    for (const item of lines) {
        if (item.isItem) {
            const itemKeyword = extractMumeKeyword(item.text);
            if (itemKeyword === keyword) {
                count++;
            }
        }
        if (item.id === line.id) {
            break;
        }
    }
    return { count, keyword };
};

export const UnifiedView: React.FC<UnifiedViewProps> = ({
    lines,
    onRefresh,
    emptyMessage = "No information captured yet.",
    category
}) => {
    const { 
        expandedContainers, 
        setExpandedContainers, 
        containerContents, 
        executeCommand, 
        parser 
    } = useGame();

    return (
        <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            flex: 1,
            minHeight: 0,
            position: 'relative',
            background: 'rgba(0,0,0,0.1)'
        }}>
            <div style={{ 
                flex: 1, 
                overflowY: 'auto', 
                padding: '0 8px 20px 8px',
                fontFamily: 'var(--font-mono, monospace)',
                fontSize: 'var(--dynamic-log-size, 16px)'
            }}>
                {lines.length > 0 ? (
                    lines.map((line) => {
                        const isExpanded = expandedContainers.has(line.id);
                        const isLoading = isExpanded && !containerContents[line.id];
                        const showChevron = line.isItem && isItemContainer(line.text);

                        const handleToggleExpand = () => {
                            if (isExpanded) {
                                setExpandedContainers((prev: Set<string>) => {
                                    const next = new Set(prev);
                                    next.delete(line.id);
                                    return next;
                                });
                            } else {
                                setExpandedContainers((prev: Set<string>) => {
                                    const next = new Set(prev);
                                    next.add(line.id);
                                    return next;
                                });
                                // Send look command
                                const { count, keyword } = getContainerIndexAndKeyword(line, lines);
                                if (keyword) {
                                    const cmd = `look in ${count}.${keyword}`;
                                    if (parser?.setPendingFlags) {
                                        parser.setPendingFlags(true, true, cmd);
                                    }
                                    if (parser?.setLastRequestedContainerId) {
                                        parser.setLastRequestedContainerId(line.id);
                                    }
                                    executeCommand(cmd, true, true, false, true);
                                }
                            }
                        };

                        return (
                            <React.Fragment key={line.id}>
                                <LineItem 
                                    line={line} 
                                    category={category}
                                    isExpanded={isExpanded}
                                    isLoading={isLoading}
                                    onToggleExpand={showChevron ? handleToggleExpand : undefined}
                                />
                                {isExpanded && containerContents[line.id] && (
                                    <div style={{ 
                                        paddingLeft: '16px', 
                                        borderLeft: '2px solid rgba(255, 255, 255, 0.05)', 
                                        marginLeft: '18px',
                                        marginTop: '2px',
                                        marginBottom: '4px'
                                    }}>
                                        {containerContents[line.id]
                                            .filter(subLine => {
                                                const clean = subLine.text.replace(/<[^>]*>/g, '').trim().toLowerCase();
                                                if (clean.includes('empty')) return true;
                                                if (subLine.isHeader) return false;
                                                if (clean === '') return false;
                                                return !(clean.startsWith('in ') || clean.startsWith('when you look') || clean.endsWith(':'));
                                            })
                                            .map((subLine) => {
                                                const alignedSubLine = {
                                                    ...subLine,
                                                    prefix: line.prefix ? ' '.repeat(line.prefix.length) : undefined
                                                };
                                                const { count, keyword } = getContainerIndexAndKeyword(line, lines);
                                                const parentNoun = keyword ? `${count}.${keyword}` : undefined;
                                                return (
                                                    <LineItem 
                                                        key={subLine.id} 
                                                        line={alignedSubLine} 
                                                        category={category}
                                                        parentNoun={parentNoun}
                                                    />
                                                );
                                            })}
                                    </div>
                                )}
                            </React.Fragment>
                        );
                    })
                ) : (
                    <div style={{ 
                        padding: '40px 20px', 
                        textAlign: 'center', 
                        color: 'rgba(255,255,255,0.3)',
                        fontStyle: 'italic',
                        fontSize: '0.9rem'
                    }}>
                        {emptyMessage}
                    </div>
                )}
            </div>

            {onRefresh && (
                <button
                    className="refresh-button floating-refresh"
                    onClick={(e) => {
                        e.stopPropagation();
                        onRefresh();
                    }}
                    style={{
                        position: 'absolute', 
                        bottom: '12px', 
                        right: '12px', 
                        zIndex: 110,
                        background: 'rgba(60, 60, 65, 0.6)', 
                        backdropFilter: 'blur(10px)',
                        border: '1px solid rgba(255,255,255,0.15)', 
                        color: 'rgba(255,255,255,0.9)',
                        width: '36px', 
                        height: '36px', 
                        borderRadius: '18px', 
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                        transition: 'all 0.2s'
                    }}
                >
                    <RefreshCw size={18} />
                </button>
            )}
        </div>
    );
};
