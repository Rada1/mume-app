/**
 * @file captureBootstrap.ts
 * @description Decides which command-marked captures can begin on plain output.
 */

import { CaptureType } from '../../types/capture';

// --- Logic Section ---

export const EXPECTED_CAPTURE_BOOTSTRAP_TYPES: CaptureType[] = [
    'who',
    'achievement',
    'equipment',
    'inventory',
    'stats',
    'score',
    'info',
    'practice',
    'quests',
    'container',
    'examine',
    'consider',
    'whois',
    'self_title',
    'board_list',
    'board_read',
    'mail_list',
    'mail_read',
    'book_read',
    'shaper_mob_find',
    'shaper_obj_find',
    'shaper_mob_stat',
    'shaper_obj_stat',
    'shaper_mob_info',
    'shaper_obj_info',
    'shaper_live_build_list',
    'shaper_live_room_stat',
    'shaper_live_com_list',
    'shaper_live_lib_list'
];

export const canBootstrapExpectedCapture = (captureType: string): boolean => (
    EXPECTED_CAPTURE_BOOTSTRAP_TYPES.includes(captureType as CaptureType)
);
