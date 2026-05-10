/**
 * @file UnifiedView.tsx
 * @description A generic, high-performance view that renders parsed MUD lines sequentially.
 * Replaces specialized views with a "MUD-native" monospaced rendering approach.
 */

import React from 'react';
import { RefreshCw } from 'lucide-react';
import { DrawerLine } from '../../../types';
import { LineItem } from '../LineItem';

interface UnifiedViewProps {
    lines: DrawerLine[];
    onRefresh?: () => void;
    emptyMessage?: string;
    category?: string;
    location?: 'carried' | 'inv' | 'worn' | 'room';
}

export const UnifiedView: React.FC<UnifiedViewProps> = ({
    lines,
    onRefresh,
    emptyMessage = "No information captured yet.",
    category,
    location
}) => {
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
                    lines.map((line) => (
                        <LineItem 
                            key={line.id} 
                            line={line} 
                            category={category}
                            location={location}
                        />
                    ))
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
