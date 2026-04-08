import React from 'react';
import { useBaseGame } from '../context/GameContext';

interface PracticeColumnHeaderCardProps {
    sessionsLeft?: number;
}

const PracticeColumnHeaderCard: React.FC<PracticeColumnHeaderCardProps> = ({ sessionsLeft: initialSessions }) => {
    const { practice } = useBaseGame();
    const sessionsLeft = practice.practiceData?.sessionsLeft ?? initialSessions ?? 0;

    return (
        <div style={{ fontFamily: 'var(--font-main)', width: '100%', maxWidth: '500px', padding: '8px 0 16px', fontSize: 'inherit' }}>
            <div style={{ 
                background: 'rgba(184, 134, 11, 0.1)',
                border: '1px solid rgba(184, 134, 11, 0.3)',
                borderRadius: '12px',
                padding: '12px 20px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                boxShadow: 'inset 0 0 15px rgba(184, 134, 11, 0.05)'
            }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 'var(--dynamic-log-size, 16px)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px' }}>Available Sessions</span>
                    <span style={{ color: 'var(--accent)', fontSize: 'var(--dynamic-log-size, 16px)', fontWeight: '900', textShadow: '0 0 15px rgba(184, 134, 11, 0.3)' }}>{sessionsLeft}</span>
                </div>
                <div style={{ 
                    width: '32px', 
                    height: '32px', 
                    borderRadius: '16px', 
                    background: 'rgba(184, 134, 11, 0.2)', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    color: 'var(--accent)'
                }}>
                    <span style={{ fontSize: 'var(--dynamic-log-size, 16px)', fontWeight: '900' }}>!</span>
                </div>
            </div>
        </div>
    );
};

export default React.memo(PracticeColumnHeaderCard);

