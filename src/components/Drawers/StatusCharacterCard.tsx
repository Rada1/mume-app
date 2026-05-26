/**
 * @file StatusCharacterCard.tsx
 * @description Character identity card for the Status drawer.
 */

import React from 'react';
import { CharacterInfo } from '../../stores/slices/vitalsSlice';
import SubraceBanner from '../HUD/SubraceBanner';

interface StatusCharacterCardProps {
    characterInfo: CharacterInfo;
}

// --- Logic Section ---

const MetaRow: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
        <span style={{ fontSize: '0.78em', color: 'rgba(255,255,255,0.36)', flexShrink: 0 }}>{label}</span>
        <span style={{
            fontSize: '1em',
            color: '#4ade80',
            textShadow: '0 0 8px rgba(74,222,128,0.3)',
            fontWeight: 500,
            textAlign: 'right',
            wordBreak: 'break-word',
        }}>{value}</span>
    </div>
);

export const StatusCharacterCard: React.FC<StatusCharacterCardProps> = ({ characterInfo }) => (
    <div style={{
        position: 'relative',
        minHeight: 96,
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: 8,
        padding: '10px 128px 10px 12px',
        display: 'flex',
        flexDirection: 'column',
        gap: 7,
        overflow: 'hidden',
    }}>
        <div style={{
            fontSize: '0.68em',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '1.5px',
            color: 'rgba(255,255,255,0.22)',
            marginBottom: 2,
        }}>
            Character
        </div>
        {characterInfo.fullname ? (
            <div style={{ fontSize: '1.2em', fontWeight: 600, color: 'rgba(255,255,255,0.9)', lineHeight: 1.3 }}>
                {characterInfo.fullname}
            </div>
        ) : characterInfo.name ? (
            <div style={{ fontSize: '1.2em', fontWeight: 600, color: 'rgba(255,255,255,0.9)' }}>
                {characterInfo.name}
            </div>
        ) : (
            <div style={{ fontSize: '1em', color: 'rgba(255,255,255,0.2)', fontStyle: 'italic' }}>Not logged in</div>
        )}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 12px', marginTop: 2 }}>
            {characterInfo.level > 0 && <MetaRow label="Level" value={characterInfo.level} />}
            {characterInfo.race && <MetaRow label="Race" value={[characterInfo.race, characterInfo.subrace].filter(Boolean).join(' - ')} />}
            {characterInfo.class && <MetaRow label="Class" value={[characterInfo.class, characterInfo.subclass].filter(Boolean).join(' - ')} />}
        </div>
        <SubraceBanner characterInfo={characterInfo} placement="drawer" />
    </div>
);
