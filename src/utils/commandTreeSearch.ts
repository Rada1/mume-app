/** @file commandTreeSearch.ts — Reveal and Flush use shared search pace choices. */
import type {CustomButton} from '../types';
import type {CommandActionTargetEntry} from '../objects/commandActionTargetModel';
import {createButton} from './buttonFactory';

// --- Search Commands and Pace Targets Section ---
export const COMMAND_SEARCH_PACES = ['quick','fast','normal','careful','thorough'] as const;
export const isCommandTreeSearchAction = (button:CustomButton):boolean => /^(?:reveal|flush)(?:\s+(?:%n|\$1))?$/i.test(button.command.trim());
export const COMMAND_TREE_SEARCH_BUTTONS = ['reveal','flush'].map(verb=>createButton({
 id:`v2-search-${verb}`,label:verb[0].toUpperCase()+verb.slice(1),command:`${verb} %n`,setId:'trait-utility'
}));
export const getCommandTreeSearchTargets = ():CommandActionTargetEntry[] => COMMAND_SEARCH_PACES.map(pace=>({
 id:`command-search-pace:${pace}`,label:pace[0].toUpperCase()+pace.slice(1),keyword:pace,context:pace,
 category:'cat-command-option',group:'objects',scope:'self'
}));
