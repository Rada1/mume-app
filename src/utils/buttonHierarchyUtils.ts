/**
 * @file buttonHierarchyUtils.ts
 * @description Centralized hierarchy logic for inline button sets (Object & NPC hierarchies).
 */

export const INLINE_HIERARCHY: Record<string, string[]> = {
    'object-corpse': ['object-container', 'object-room'],
    'object-container': ['object-room'],
    'object-room': [],
    'object-weapon': ['object'],
    'object-fluid': ['object'],
    'object-armour': ['object'],
    'object-shield': ['object'],
    'object-food': ['object'],
    'object-water': ['object'],
    'object-treasure': ['object'],
    'object-misc': ['object'],
    'object-quiver': ['object-container', 'object-room'],
    'object-worn': ['object'],
    'object-inv': [],
    'object-shop': ['object'],
    
    // NPC Hierarchy
    'npc': ['object'],
    'npc-mount': ['npc'],
    'npc-shopkeeper': ['npc'],
    'npc-shopkeeper-drop': ['npc'],
    'npc-innkeeper': ['npc'],
    'npc-guildmaster': ['npc']
};

export const getHierarchyChain = (setId: string, detectedCatId: string | null = null): string[] => {
    // Aliases for drawer list views
    if (setId === 'inventorylist') setId = 'object-inv';
    if (setId === 'equipmentlist') setId = 'object-worn';

    const ACTIONABLE_OBJ_CATS = [
        'object-container', 
        'object-quiver', 
        'object-corpse', 
        'object-fluid', 
        'object-water', 
        'object-food', 
        'object-treasure'
    ];
    
    // --- Rule: Room objects should only be 'get' + actionable categories + base objects (Examine) --- 
    if (setId === 'object-room' || setId === 'roomitems') {
        const chain = ['object-room', 'object'];
        if (detectedCatId && ACTIONABLE_OBJ_CATS.includes(detectedCatId)) {
            chain.push(detectedCatId);
            const parents = INLINE_HIERARCHY[detectedCatId] || [];
            chain.push(...parents);
        }
        return Array.from(new Set(chain));
    }

    // --- Rule: Inventory objects should be 'wear/drop' + sub-categories ---
    if (setId === 'object-inv' || setId === 'inv') {
        const chain = ['object-inv'];
        if (detectedCatId) {
            chain.push(detectedCatId);
            const parents = INLINE_HIERARCHY[detectedCatId] || [];
            chain.push(...parents);
        }
        chain.push('object');
        // Filter out room-specific sets to avoid "Get" in inventory
        return Array.from(new Set(chain)).filter(id => id !== 'object-room');
    }

    // --- Rule: Worn objects should allow containers/actionable cats ---
    if (setId === 'object-worn' || setId === 'worn') {
        const chain = [setId];
        if (detectedCatId && ACTIONABLE_OBJ_CATS.includes(detectedCatId)) {
            chain.push(detectedCatId);
            const parents = INLINE_HIERARCHY[detectedCatId] || [];
            chain.push(...parents);
        }
        chain.push('object');
        return Array.from(new Set(chain)).filter(id => id !== 'object-room');
    }

    // Default catch-all hierarchy logic
    const baseHierarchy = INLINE_HIERARCHY[setId] || [];
    let result = [setId, ...baseHierarchy];
    
    if (detectedCatId && !result.includes(detectedCatId)) {
        result.splice(1, 0, detectedCatId);
        const catParents = INLINE_HIERARCHY[detectedCatId] || [];
        result.push(...catParents);
    }
    
    return Array.from(new Set(result));
};
