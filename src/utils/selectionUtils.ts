/**
 * @file selectionUtils.ts
 * @description Utility functions for handling object selection state.
 */

/**
 * Checks if a given object ID is currently selected.
 * Handles the various formats used across the app (id, setId:id, mid:setId:id, etc.)
 */
export const isObjectSelected = (selectedObjectIds: Set<string>, id: string, setId?: string): boolean => {
    if (!selectedObjectIds || !id) return false;
    
    // 1. Check for exact match in the set
    if (selectedObjectIds.has(id)) return true;
    
    // 2. Check for setId:id mismatch (e.g. selecting in drawer vs log)
    if (setId && selectedObjectIds.has(`${setId}:${id}`)) return true;

    // 3. Robust partial match (logic from useLogPointerDown)
    // We search the set for any entry that matches this ID or ends with this ID
    return Array.from(selectedObjectIds).some(entry => {
        if (entry === id) return true;
        if (entry.endsWith(':' + id)) return true;
        
        // Also check if our ID ends with the entry (e.g. entry is ID, id is setId:ID)
        if (id.endsWith(':' + entry)) return true;

        // 4. Cross-component keyword matching (Log <-> Drawer)
        // If entry is "inline-in-room-obj:auto-item-sword" and id is "inventorylist:123:sword"
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
        return false;
    });

    return false;
};

export const normalizeSelectionTarget = (value: string | null | undefined): string => (
    (value || '')
        .toLowerCase()
        .replace(/^[*-]+|[*-]+$/g, '')
        .replace(/^\d+\./, '')
        .replace(/^(a|an|the)\s+/i, '')
        .replace(/[^\p{L}\p{N}'.-]+/gu, ' ')
        .trim()
);

export const targetTextMatchesEntity = (
    target: string | null | undefined,
    ...candidates: Array<string | null | undefined>
): boolean => {
    const normalizedTarget = normalizeSelectionTarget(target);
    if (!normalizedTarget) return false;

    return candidates.some(candidate => {
        const normalizedCandidate = normalizeSelectionTarget(candidate);
        if (!normalizedCandidate) return false;
        return normalizedCandidate === normalizedTarget;
    });
};

export const isEntitySelectedOrTargeted = (
    selectedObjectIds: Set<string> | undefined,
    id: string | null | undefined,
    category: string | null | undefined,
    target: string | null | undefined,
    ...targetCandidates: Array<string | null | undefined>
): boolean => (
    (!!id && isObjectSelected(selectedObjectIds || new Set(), id, category || undefined)) ||
    targetTextMatchesEntity(target, ...targetCandidates)
);
