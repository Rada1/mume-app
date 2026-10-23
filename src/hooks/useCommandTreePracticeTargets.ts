/** @file useCommandTreePracticeTargets.ts - Select a practice target without retaining another command preview. */
import type {PracticeSkill} from '../types';
import type {useCommandTreeController} from './useCommandTreeController';
// --- Target Selection Section ---
export const useCommandTreePracticeTargets=(controller:ReturnType<typeof useCommandTreeController>)=>{
 const selectSkill=(skill:PracticeSkill)=>{
  controller.previewEntity(null);
  controller.practice.selectSkill(skill);
 };
 return {...controller.practice,selectSkill};
};
