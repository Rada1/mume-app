/** @file swipeCenterActionLabel.ts — Resolves the command label shown in a wheel center. */

import type { CustomButton } from '../../../types';
import { getClassKeyFromSetId, getSkillPresentation } from '../../../utils/skillPresentation';
import { FOLLOWERS_COMMAND_PREFIX } from '../../../stores/useTacticalCommandPrefixStore';

// --- Logic Section ---
export const toSwipeCenterActionLabel = (button: CustomButton): string => {
    const command = (button.command || '').trim();
    const normalized = command.toLowerCase();
    if (!command) return button.label || '';
    if (normalized === FOLLOWERS_COMMAND_PREFIX) return 'Command';
    if (button.actionType === 'menu') {
        const menuLabel = normalized.endsWith('spelllist') ? 'spells'
            : normalized.endsWith('skilllist') ? 'skills'
            : normalized.endsWith(' list') ? normalized.replace(/\s+list$/, '')
            : normalized.replace(/list$/, '') || command;
        return getSkillPresentation(menuLabel, menuLabel, getClassKeyFromSetId(button.setId)).label;
    }
    return getSkillPresentation(command, command, getClassKeyFromSetId(button.setId)).label;
};
