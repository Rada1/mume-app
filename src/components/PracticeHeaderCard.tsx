import React from 'react';
import { BookOpen } from 'lucide-react';
import { useBaseGame } from '../context/GameContext';
import './Popovers/PracticePopover.css'; // Reuse existing styles or add new ones

interface PracticeHeaderCardProps {
    sessionsLeft: number;
}

const PracticeHeaderCard: React.FC<PracticeHeaderCardProps> = ({ sessionsLeft: initialSessions }) => {
    const { practice } = useBaseGame();
    const sessionsLeft = practice.practiceData?.sessionsLeft ?? initialSessions;

    return (
        <div className="practice-header-card">
            <div className="practice-header-content">
                <BookOpen size={18} className="practice-header-icon" />
                <span className="practice-header-text">
                    You have <span className="sessions-count">{sessionsLeft}</span> sessions left to spend
                </span>
            </div>
        </div>
    );
};

export default React.memo(PracticeHeaderCard);
