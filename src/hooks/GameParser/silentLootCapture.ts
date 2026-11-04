/** @file silentLootCapture.ts — Hide background loot snapshots while preserving live game messages. */

// --- Response visibility ---
export const shouldHideSilentLootCapture = ({activeType, expectedType, activeSilent, pendingSilent,
 isSnoop, isPrompt, isLive, isCommunication, isEnvironment}: {
 activeType: string; expectedType: string; activeSilent: boolean; pendingSilent: boolean;
 isSnoop: boolean; isPrompt: boolean; isLive: boolean; isCommunication: boolean; isEnvironment: boolean;
}): boolean => {
 if (isSnoop || isPrompt || isLive || isCommunication || isEnvironment) return false;
 return (activeSilent && ['inventory', 'examine', 'board_read', 'mail_read', 'mail_list'].includes(activeType))
  || (pendingSilent && ['inventory', 'examine', 'board_read', 'mail_read', 'mail_list'].includes(expectedType));
};
