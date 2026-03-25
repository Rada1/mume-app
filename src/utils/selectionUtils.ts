/**
 * @file selectionUtils.ts
 * @description Utility functions for handling object selection state.
 */

/**
 * Checks if a given object ID is currently selected.
 * Handles the various formats used across the app (id, setId:id, mid:setId:id, etc.)
 */
export const isObjectSelected = (selectedObjectIds: Set<string>, id: string, setId?: string): boolean => {
    if (!id) return false;
    
    // 1. Check for exact match in the set
    if (selectedObjectIds.has(id)) return true;
    
    // 2. Check for setId:id mismatch (e.g. selecting in drawer vs log)
    if (setId && selectedObjectIds.has(`${setId}:${id}`)) return true;

    // 3. Robust partial match (logic from useLogPointerDown)
    // We search the set for any entry that matches this ID or ends with this ID
    for (const entry of selectedObjectIds) {
        if (entry === id) return true;
        if (entry.endsWith(':' + id)) return true;
        
        // Also check if our ID ends with the entry (e.g. entry is ID, id is setId:ID)
        if (id.endsWith(':' + entry)) return true;

        // 4. Cross-component keyword matching (Log <-> Drawer)
        // If entry is "inline-obj-room:auto-item-sword" and id is "inventorylist:123:sword"
        // Both contain "sword" as the final part.
        const entryParts = entry.split(':');
        const idParts = id.split(':');
        let entryLeaf = entryParts[entryParts.length - 1];
        let idLeaf = idParts[idParts.length - 1];

        // Normalize: remove common "auto-" prefixes used in message highlighter
        const normalize = (val: string) => val.replace(/^auto-(item|npc|obj|target|player)-/, '');
        entryLeaf = normalize(entryLeaf);
        idLeaf = normalize(idLeaf);

        if (entryLeaf && idLeaf && entryLeaf === idLeaf) {
            // Check if both are "item" type objects to avoid clashing with NPCs or players if they share names
            const isEntryItem = entry.includes('-item') || entry.includes('inventorylist') || entry.includes('equipmentlist') || entry.includes('-obj');
            const isIdItem = id.includes('-item') || id.includes('inventorylist') || id.includes('equipmentlist') || id.includes('-obj');
            
            if (isEntryItem && isIdItem) return true;
        }
    }

    return false;
};
