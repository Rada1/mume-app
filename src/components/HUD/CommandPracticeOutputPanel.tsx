/** @file CommandPracticeOutputPanel.tsx — Training replies in the shared Details panel position. */
import React from 'react';
import type { CommandPracticeProps } from '../../types';
import { CapturedDetailsSidePanel } from '../Popovers/StandardMenu/CapturedDetailsSidePanel';

// --- Render Section ---
export const CommandPracticeOutputPanel: React.FC<CommandPracticeProps> = ({ practice }) => {
    if (!practice.outputVisible) return null;
    return (
        <CapturedDetailsSidePanel
            practiceLines={practice.report.lines}
            practiceSkillName={practice.report.skillName}
            isPracticePending={Boolean(practice.report.pendingCommand)}
            onClose={() => practice.setOutputOpen(false)}
        />
    );
};
