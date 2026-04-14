import React from 'react';
import '../Popovers/PracticePopover.css';

interface PracticeClassHeaderCardProps {
    label: string;
}

const PracticeClassHeaderCard: React.FC<PracticeClassHeaderCardProps> = ({ label }) => (
    <div className="practice-class-header-card" dangerouslySetInnerHTML={{ __html: label }} />
);

export default React.memo(PracticeClassHeaderCard);
