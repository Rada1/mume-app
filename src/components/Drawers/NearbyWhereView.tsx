/**
 * @file NearbyWhereView.tsx
 * @description Plain renderer for the Nearby tab's dedicated where-command table.
 */

import React from 'react';
import { RefreshCw } from 'lucide-react';
import { DrawerLine } from '../../types';

interface NearbyWhereViewProps {
    lines: DrawerLine[];
    onRefresh: () => void;
}

export const NearbyWhereView: React.FC<NearbyWhereViewProps> = ({ lines, onRefresh }) => (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, position: 'relative', background: 'rgba(0,0,0,0.1)' }}>
        <div style={{ flex: 1, overflowY: 'auto', padding: '14px 12px 56px', fontFamily: 'var(--font-mono, monospace)', fontSize: '13px', whiteSpace: 'pre', color: 'rgba(255,255,255,0.86)' }}>
            {lines.length > 0 ? (
                lines.map(line => (
                    <div
                        key={line.id}
                        style={{
                            color: line.isHeader ? 'rgba(255,255,255,0.72)' : 'rgba(255,255,255,0.92)',
                            fontWeight: line.isHeader ? 700 : 500,
                            lineHeight: 1.55
                        }}
                    >
                        {line.text}
                    </div>
                ))
            ) : (
                <div style={{ padding: '28px 8px', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontStyle: 'italic', whiteSpace: 'normal' }}>
                    No nearby player data. Tap refresh to update.
                </div>
            )}
        </div>
        <button
            className="refresh-button floating-refresh"
            onClick={(event) => {
                event.stopPropagation();
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
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
            }}
        >
            <RefreshCw size={18} />
        </button>
    </div>
);
