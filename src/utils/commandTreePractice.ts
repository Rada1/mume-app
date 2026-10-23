/** @file commandTreePractice.ts - Practice command entry and specialized skill targets. */
import type {CustomButton} from '../types';
import {createButton} from './buttonFactory';
// --- Practice Command Section ---
export const COMMAND_TREE_PRACTICE_BUTTON=createButton({id:'v2-practice-skills',label:'Practice',command:'practice %n',setId:'trait-guildmaster'});
export const isCommandTreePracticeAction=(button:CustomButton|null)=>button?.id===COMMAND_TREE_PRACTICE_BUTTON.id;
