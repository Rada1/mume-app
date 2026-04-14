/**
 * @file buttonHierarchyUtils.ts
 * @description Centralized hierarchy logic for inline button sets (Object & NPC hierarchies).
 */

export const INLINE_HIERARCHY: Record<string, string[]> = {
    'inline-corpses': ['inline-containers', 'inline-obj-room'],
    'inline-containers': ['inline-obj-room'],
    'inline-obj-room': [],
    'inline-weapon': ['inline-object'],
    'inline-fluidcontainer': ['inline-object'],
    'inline-armour': ['inline-object'],
    'inline-shield': ['inline-object'],
    'inline-lantern': ['inline-object'],
    'inline-lightsource': ['inline-object'],
    'inline-food': ['inline-object'],
    'inline-water': ['inline-object'],
    'inline-default': ['inline-object'],
    'inline-quiver': ['inline-containers', 'inline-obj-room'],
    'inline-obj-worn': ['inline-object'],
    'inline-obj-char': [],
    'inline-obj-shop': ['inline-object'],
    
    // NPC Hierarchy
    'inlinenpc': ['inline-default'],
    'inline-mounts': ['inlinenpc'],
    'inline-shopkeeper': ['inlinenpc'],
    'inline-shopkeeper-drop': ['inlinenpc'],
    'inline-innkeeper': ['inlinenpc'],
    'inline-guildmaster': ['inlinenpc']
};

export const getHierarchyChain = (setId: string, detectedCatId: string | null = null): string[] => {
    // Aliases for drawer list views
    if (setId === 'inventorylist') setId = 'inline-obj-char';
    if (setId === 'equipmentlist') setId = 'inline-obj-worn';

    const ACTIONABLE_OBJ_CATS = ['inline-containers', 'inline-quiver', 'inline-corpses', 'inline-fluidcontainer', 'inline-water', 'inline-food', 'inline-lightsource', 'inline-lantern', 'inline-treasure'];
    
    // --- Rule: Room objects should only be 'get' + actionable categories + base objects (Examine) --- 
    if (setId === 'inline-obj-room') {
        const chain = ['inline-obj-room', 'inline-object'];
        if (detectedCatId && ACTIONABLE_OBJ_CATS.includes(detectedCatId)) {
            chain.push(detectedCatId);
            const parents = INLINE_HIERARCHY[detectedCatId] || [];
            chain.push(...parents);
        }
        return Array.from(new Set(chain));
    }

    // --- Rule: Inventory objects should be 'wear/drop' + sub-categories ---
    if (setId === 'inline-obj-char') {
        const chain = ['inline-obj-char'];
        if (detectedCatId) {
            chain.push(detectedCatId);
            const parents = INLINE_HIERARCHY[detectedCatId] || [];
            chain.push(...parents);
        }
        chain.push('inline-object');
        // Filter out room-specific sets to avoid "Get" in inventory
        return Array.from(new Set(chain)).filter(id => id !== 'inline-obj-room');
    }

    // --- Rule: Worn objects should allow containers/actionable cats ---
    if (setId === 'inline-obj-worn') {
        const chain = [setId];
        if (detectedCatId && ACTIONABLE_OBJ_CATS.includes(detectedCatId)) {
            chain.push(detectedCatId);
            const parents = INLINE_HIERARCHY[detectedCatId] || [];
            chain.push(...parents);
        }
        chain.push('inline-object');
        return Array.from(new Set(chain)).filter(id => id !== 'inline-obj-room');
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
