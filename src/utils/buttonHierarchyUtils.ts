/**
 * @file buttonHierarchyUtils.ts
 * @description Centralized hierarchy logic for inline button sets (Object & NPC hierarchies).
 */

export const INLINE_HIERARCHY: Record<string, string[]> = {
    'inline-corpses': ['inline-containers', 'inline-obj-room'],
    'inline-containers': ['inline-obj-room'],
    'inline-obj-room': ['inline-object'],
    'inline-weapon': ['inline-object'],
    'inline-armour': ['inline-object'],
    'inline-shield': ['inline-object'],
    'inline-lantern': ['inline-object'],
    'inline-lightsource': ['inline-object'],
    'inline-food': ['inline-object'],
    'inline-water': ['inline-object'],
    'inline-default': ['inline-object'],
    'inline-quiver': ['inline-containers', 'inline-obj-room'],
    'inline-obj-worn': ['inline-object'],
    'inline-obj-char': ['inline-object'],
    'inline-obj-shop': ['inline-object'],
    
    // NPC Hierarchy
    'inline-mounts': ['inlinenpc'],
    'inline-shopkeeper': ['inlinenpc'],
    'inline-shopkeeper-drop': ['inlinenpc'],
    'inline-innkeeper': ['inlinenpc'],
    'inline-guildmaster': ['inlinenpc']
};

/**
 * Builds a chain of set IDs representing the inheritance hierarchy for a given set.
 * @param setId The primary set ID (e.g. 'inline-obj-room' or 'inline-obj-char')
 * @param detectedCatId An optional specific sub-category (e.g. 'inline-weapon') detected from context
 * @returns An array of set IDs in order of priority (most specific first)
 */
export const getHierarchyChain = (setId: string, detectedCatId: string | null = null): string[] => {
    const baseHierarchy = INLINE_HIERARCHY[setId] || [];
    const chain = [setId, ...baseHierarchy];
    
    if (detectedCatId && !chain.includes(detectedCatId)) {
        // Splice sub-category right after the primary context (room/char)
        chain.splice(1, 0, detectedCatId);
        // Also include its parents if missing
        const catParents = INLINE_HIERARCHY[detectedCatId] || [];
        catParents.forEach(p => {
            if (!chain.includes(p)) {
                // Parents of sub-categories usually go to the end
                chain.push(p);
            }
        });
    }
    return Array.from(new Set(chain)); // Final safety against duplicates
};
