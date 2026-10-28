/** @file corpseLogTarget.ts — Preserve corpse identity when log text shares a living creature keyword. */
import { getCorpseCommandKeyword } from './objectTargetModel';
import { getInlineCategoryAxes } from '../utils/inlineCategoryAxes';
import { formatMumeTarget } from '../utils/keywordUtils';

// --- Log target normalization ---
export const getCorpseLogTarget = (label: string | null | undefined, context: string | null | undefined, category: string | null | undefined) => {
 if (!label || !/\bcorpse\b/i.test(label)) return null;
 const supplied = formatMumeTarget(context) || '';
 const ordinal = supplied.match(/^(\d+\.)/)?.[1] || '';
 const selector = /^(?:\d+\.)?[\w'-]+-corpse$/i.test(supplied)
  ? supplied : `${ordinal}${getCorpseCommandKeyword(label).replace(/^\d+\./, '')}`;
 const axes = getInlineCategoryAxes(category);
 return {context:selector, category:axes.isObject ? axes.categoryId : 'cat-room-object'};
};
