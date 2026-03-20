import React from 'react';
import { useBaseGame } from '../context/GameContext';

// Must match PracticeSkillCard column constants
const COL_SESS  = '100px';
const COL_BTN   = '40px';
const COL_KNOW  = '110px';
const GRID_TEMPLATE = `1fr ${COL_SESS} ${COL_BTN} ${COL_KNOW}`;

interface PracticeColumnHeaderCardProps {
    sessionsLeft?: number;
}

const PracticeColumnHeaderCard: React.FC<PracticeColumnHeaderCardProps> = ({ sessionsLeft: initialSessions }) => {
    const { practice } = useBaseGame();
    const sessionsLeft = practice.practiceData?.sessionsLeft ?? initialSessions ?? 0;

    return (
        <div style={{ fontFamily: 'var(--font-main)', width: '100%', maxWidth: '500px', padding: '8px 0 4px', fontSize: 'inherit' }}>
            {/* Session count */}
            <div style={{ color: '#a855f7', fontSize: '0.9em', marginBottom: '8px', fontWeight: 600, opacity: 0.9 }}>
                {sessionsLeft} practice session{sessionsLeft !== 1 ? 's' : ''} left to spend
            </div>
            {/* Column labels — locked grid */}
            <div style={{ 
                display: 'grid', 
                gridTemplateColumns: GRID_TEMPLATE,
                alignItems: 'center', 
                color: 'var(--text-dim)', 
                opacity: 0.5, 
                fontWeight: 'bold', 
                textTransform: 'uppercase', 
                letterSpacing: '0.1em', 
                fontSize: '0.85em' 
            }}>
                <span style={{ whiteSpace: 'nowrap' }}>Skill</span>
                <span style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>Sessions</span>
                <span style={{ textAlign: 'center' }}>+</span>
                <span style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>Knowledge</span>
            </div>
            {/* Divider */}
            <div style={{ height: '1px', background: 'rgba(168, 85, 247, 0.2)', marginTop: '4px' }} />
        </div>
    );
};

export default React.memo(PracticeColumnHeaderCard);
