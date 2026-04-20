/**
 * @file index.ts
 * @description Barrel file for the MUME client type system.
 */

export * from './game';
export * from './gmcp';
export * from './ui';
export * from './entities';
export * from './mechanics';
export * from './account';
export * from './session';

// Re-export any missing legacy types if necessary, but aim for full modularization.
