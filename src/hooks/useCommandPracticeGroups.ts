/** @file useCommandPracticeGroups.ts - Idempotent disclosure state without retaining React events. */
import {useCallback,useState} from 'react';
// --- Disclosure Logic Section ---
export const useCommandPracticeGroups=()=>{
 const [openGroups,setOpenGroups]=useState<Record<string,boolean>>({});
 const setGroupOpen=useCallback((label:string,open:boolean)=>{
  setOpenGroups(previous=>Boolean(previous[label])===open ? previous : {...previous,[label]:open});
 },[]);
 return {openGroups,setGroupOpen};
};
