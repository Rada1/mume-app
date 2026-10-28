/** @file useCommandPanelCategories.ts — Persistent independent category toggles for command panels. */
import { useEffect, useMemo } from 'react';
import type { useCommandTree } from './useCommandTree';
import { getCommandMenuSectionKey, useCommandMenuSectionsStore } from '../stores/useCommandMenuSectionsStore';

// --- Category visibility and command ordering ---
export const useCommandPanelCategories = (tree: ReturnType<typeof useCommandTree>) => {
 const collapsed = useCommandMenuSectionsStore(state => state.collapsed);
 const toggle = useCommandMenuSectionsStore(state => state.toggle);
 const expand = useCommandMenuSectionsStore(state => state.expand);
 const groupLabel = tree.grouped[tree.group]?.label || '';
 const categories = useMemo(() => tree.commandSections.map(section => ({
  ...section, key: getCommandMenuSectionKey(groupLabel, section.label),
  displayLabel: section.label === 'Combat action' ? 'Combat' : section.label,
  enabled: !collapsed[getCommandMenuSectionKey(groupLabel, section.label)]
 })), [tree.commandSections, groupLabel, collapsed]);
 const commands = useMemo(() => {
  const seen = new Set<string>();
  return categories.filter(category => category.enabled).flatMap(category => category.buttons)
   .filter(button => {
    if (seen.has(button.id)) return false;
    seen.add(button.id);
    return true;
   });
 }, [categories]);
 // External shop/training navigation must reveal its selected command.
 const selectedSection = tree.command ? tree.sectionFor(tree.command) : undefined;
 useEffect(() => {
  if (selectedSection) expand(getCommandMenuSectionKey(groupLabel, selectedSection));
 }, [tree.command?.id, selectedSection, groupLabel, expand]);
 const toggleCategory = (key: string) => {
  const category = categories.find(entry => entry.key === key);
  if (category?.enabled && category.buttons.some(button => button.id === tree.command?.id)) tree.clearCommand();
  tree.cancelPreview();
  toggle(key);
 };
 return { categories, commands, toggleCategory };
};
