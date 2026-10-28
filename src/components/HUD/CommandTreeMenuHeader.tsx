/** @file CommandTreeMenuHeader.tsx — Explicit skill sync cancels pending command hover previews. */
import React from 'react';
import { SkillsSyncPrompt } from './SkillsSyncPrompt';

// --- Render Section ---
export const CommandTreeMenuHeader = ({ showSkills, cancelPreview }: {
    showSkills: boolean; cancelPreview: () => void;
}) => showSkills ? <div onPointerEnter={cancelPreview} onFocusCapture={cancelPreview}>
    <SkillsSyncPrompt hideWhenReady presentation="command-header" />
</div> : null;
