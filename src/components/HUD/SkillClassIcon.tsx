/**
 * @file SkillClassIcon.tsx
 * @description Shared tactical class glyph used by class skill buttons.
 */

import React, { FC } from 'react';
import { Sparkles, Swords, Trees, VenetianMask, Wand } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { PracticeClassKey } from '../../utils/practiceClassCatalog';
import './SkillClassIcon.css';

interface SkillClassIconProps {
    classKey: PracticeClassKey;
    size?: number;
}

// --- Logic Section ---

const CLASS_ICONS: Record<PracticeClassKey, LucideIcon> = {
    ranger: Trees,
    thief: VenetianMask,
    warrior: Swords,
    mage: Wand,
    cleric: Sparkles
};

export const SkillClassIcon: FC<SkillClassIconProps> = ({ classKey, size = 18 }) => {
    const ClassIcon = CLASS_ICONS[classKey];
    return (
        <span className={`skill-class-icon skill-class-icon-${classKey}`} aria-hidden="true">
            <ClassIcon className="skill-class-icon-primary" size={size} strokeWidth={2.25} />
        </span>
    );
};
