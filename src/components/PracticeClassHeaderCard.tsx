import React from 'react';
import './Popovers/PracticePopover.css';

interface PracticeClassHeaderCardProps {
    label: string;
}

const PracticeClassHeaderCard: React.FC<PracticeClassHeaderCardProps> = ({ label }) => (
    <div className="practice-class-header-card">{label}</div>
);

export default React.memo(PracticeClassHeaderCard);
