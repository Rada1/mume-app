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
    'inline-player': ['inlineplayer', 'player', 'object'],
    'inline-npc': ['inlinenpc', 'npc', 'object'],
    'inlinenpc': ['inline-npc'], // Legacy compat
    'inlineplayer': ['inline-player'], // Legacy compat
    
    // Specialized NPCs
    'inline-mounts': ['inline-npc', 'npc'],
    'inline-shopkeeper': ['inline-npc', 'npc'],
    'inline-shopkeeper-drop': ['inline-npc', 'npc'],
    'inline-innkeeper': ['inline-npc', 'npc'],
    'inline-guildmaster': ['inline-npc', 'npc'],
    
    // Specialized Objects
    'inline-weapon': ['object-weapon', 'inline-object', 'object'],
    'inline-armour': ['object-armour', 'inline-object', 'object'],
    'inline-shield': ['object-shield', 'inline-object', 'object'],
    'inline-containers': ['object-container', 'inline-object', 'object'],
    'inline-food': ['object-food', 'inline-object', 'object'],
    'inline-fluidcontainer': ['object-fluid', 'inline-object', 'object'],
    'inline-water': ['object-water', 'inline-object', 'object'],
    'inline-treasure': ['object-treasure', 'inline-object', 'object'],
    'inline-corpses': ['object-corpse', 'inline-object', 'object'],
    'inline-object': ['object']
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
