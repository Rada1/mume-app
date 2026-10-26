/** @file archiveInterface.ts — Temporary switch for the unfinished board and mail interface. */
// --- Availability Section ---
export const BOARD_MAIL_INTERFACE_ENABLED = false;
export const isBoardMailCapture = (type: string | null | undefined): boolean =>
    ['board_list', 'board_read', 'mail_list', 'mail_read'].includes(type || '');
