/**
 * @file index.ts
 * @description Barrel file for the MUME client type system.
 */

export * from './game';
export * from './performance';
export * from './viewport';
export * from './gmcp';
export * from './ui';
export * from './entities';
export * from './mechanics';
export * from './account';
export * from './session';
export * from './timers';
export * from './whereScan';
export * from './gear';
export * from './roomInfo';

// Note: EntityLocation is now uniquely defined in entities.ts to resolve 
// export collisions with ui.ts which was carrying a legacy definition.
export * from './tokens';
export * from './mapperNavigation';

export * from './commandChat';

export * from './commandShop';
export * from './commandPractice';
export * from './panelData';
export * from './commandAliases';
export * from './itemCondition';
export * from './shopLog';
export * from './zoneBackground';
export * from './cornerWeather';
export * from './environmentTransitions';
export * from './mapMarkers';
export * from './soundSettings';
export * from './clientMacros';

export type { ClientPanelStackId, ClientPanelStackWeights, ClientPanelStackHeights } from './clientPanelStack';
