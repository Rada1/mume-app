/**
 * @file buttonHierarchyUtils.ts
 * @description Centralized hierarchy logic for inline button sets (Object & NPC hierarchies).
 */

export const INLINE_HIERARCHY: Record<string, string[]> = {
    'object-corpse': ['object-container', 'location-room'],
    'object-container': ['location-room'],
    'object-weapon': ['object'],
    'object-fluid': ['object'],
    'object-armour': ['object'],
    'object-shield': ['object'],
    'object-food': ['object'],
    'object-room': ['object'],
    'object-water': ['object'],
    'object-treasure': ['object'],
    'object-misc': ['object'],
    'object-quiver': ['object-container', 'location-room'],
    
    // Entity Kinds
    'player': ['inlineplayer', 'object'],
    'npc': ['inlinenpc', 'object'],
    
    // Specialized NPCs
    'npc-mount': ['npc'],
    'npc-shopkeeper': ['npc'],
    'npc-shopkeeper-drop': ['npc'],
    'npc-innkeeper': ['npc'],
    'npc-guildmaster': ['npc']
};

export const LOCATION_SETS: Record<string, string> = {
    'room': 'location-room',
    'carried': 'location-carried',
    'worn': 'location-worn',
    'shop': 'location-shop'
};

/**
 * Resolves the full chain of button sets that apply to a specific entity.
 * Additive logic: [kind] + [location-specific] + [category-specific]
 */
export const getHierarchyChain = (kind: string, location: string, categoryId?: string): string[] => {
    const result: string[] = [kind]; // e.g., 'object' or 'npc'

    // Add location-specific layer
    const locationSetId = LOCATION_SETS[location];
    if (locationSetId) {
        result.push(locationSetId);
    }

    // Add category-specific layer and its parents from INLINE_HIERARCHY
    if (categoryId && !result.includes(categoryId)) {
        result.push(categoryId);
        const catParents = INLINE_HIERARCHY[categoryId] || [];
        result.push(...catParents);
    }
    
    // Ensure 'object' is always present if kind is npc or player (they inherit from base interactive)
    if ((kind === 'npc' || kind === 'player') && !result.includes('object')) {
        result.push('object');
    }

    return Array.from(new Set(result));
};
