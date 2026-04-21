import { CustomButton, InlineCategoryConfig, GameEntity, EntityCapability, GmcpOccupant } from '../types';
import { getCategoryForName, canonicalizeCategoryId } from './categorizationUtils';
import { getHierarchyChain } from './buttonHierarchyUtils';

export interface ActionFilterDeps {
    buttons: CustomButton[];
    inlineCategories?: InlineCategoryConfig[];
    roomNpcs?: (string | GmcpOccupant)[];
    entities: Record<string, GameEntity>;
}

/**
 * Checks if a specific button is valid for a given entity based on MUME rules.
 */
export function isButtonValidForEntity(
    button: CustomButton,
    entityId: string,
    setId: string,
    deps: ActionFilterDeps,
    categoryOverride?: string,
    location?: string,
    kind?: string
): boolean {
    const { inlineCategories, roomNpcs, entities } = deps;
    const entity = entities[entityId];
    
    // --- STEP 1: Determine Context & Category ---
    const context = entity?.noun || 
                   entityId.replace(/^(auto-npc-|auto-item-|auto-obj-|roomnpcs:|roomitems:|inventorylist:|equipmentlist:|log-npc-|npc-|player-|object-)/, '')
                           .replace(/-[a-f0-9]+$/, '').replace(/-/g, ' ');

    const dynamicCat = context ? getCategoryForName(context, inlineCategories) : null;
    const genericBaseCats = ['object-room', 'object-inv', 'object-worn', 'npc'];
    
    // Canonicalize the override to ensure comparison works
    const catIdOverride = categoryOverride ? canonicalizeCategoryId(categoryOverride) : null;

    const detectedCatId = (catIdOverride && !genericBaseCats.includes(catIdOverride)) 
        ? catIdOverride 
        : (dynamicCat || catIdOverride || null);
    
    // Use the explicit location if provided, otherwise derive from legacy setId
    let effectiveLocation = location;
    if (!effectiveLocation) {
        if (setId === 'object-inv' || setId === 'inventorylist' || setId === 'inv') effectiveLocation = 'inv';
        else if (setId === 'object-worn' || setId === 'equipmentlist' || setId === 'eq') effectiveLocation = 'worn';
        else if (setId === 'object-shop') effectiveLocation = 'shop';
        else if (setId === 'object-room' || setId === 'roomitems' || setId === 'room') effectiveLocation = 'room';
    }

    // Build hierarchy chain. If we have a location, we use kind + location for the chain.
    const baseId = (kind && effectiveLocation) ? `${kind}-${effectiveLocation}` : setId;
    const fullSetChain = getHierarchyChain(baseId, detectedCatId);

    // Debugging for service-related buttons
    const isServiceButton = button.setId === 'npc-innkeeper' || 
                            button.setId === 'npc-shopkeeper' || 
                            button.setId === 'npc-guildmaster';

    if (isServiceButton) {
        // If the hierarchy chain already includes the target set, we trust it absolutely
        if (fullSetChain.includes(button.setId)) return true;

        let isMatch = false;
        
        // 1. Check explicit capabilities (registered entities)
        if (entity?.capabilities) {
            if (button.setId === 'npc-innkeeper' && entity.capabilities.includes(EntityCapability.Innkeeper)) isMatch = true;
            if (button.setId === 'npc-shopkeeper' && entity.capabilities.includes(EntityCapability.Shopkeeper)) isMatch = true;
            if (button.setId === 'npc-guildmaster' && entity.capabilities.includes(EntityCapability.Guildmaster)) isMatch = true;
        }

        // 2. Check roomNpcs (fallback for log-parsed or GMCP entities)
        if (!isMatch && roomNpcs) {
            const searchNoun = context.toLowerCase();
            const matchingNpc = roomNpcs.find(npc => {
                const name = (typeof npc === 'string' ? npc : npc.name || npc.shortdesc || '').toLowerCase();
                const id = (typeof npc === 'string' ? '' : npc.id || '');
                const keyword = (typeof npc === 'string' ? '' : npc.keyword || '').toLowerCase();
                return id === entityId || name.includes(searchNoun) || keyword.includes(searchNoun);
            });

            if (matchingNpc) {
                const npcName = (typeof matchingNpc === 'string' ? matchingNpc : matchingNpc.name || matchingNpc.shortdesc || '').toLowerCase();
                const npcCatId = getCategoryForName(npcName, inlineCategories);
                if (button.setId === 'npc-innkeeper' && npcCatId === 'npc-innkeeper') isMatch = true;
                if (button.setId === 'npc-shopkeeper' && npcCatId === 'npc-shopkeeper') isMatch = true;
                if (button.setId === 'npc-guildmaster' && npcCatId === 'npc-guildmaster') isMatch = true;
            }
        }

        if (isMatch) {
            if (!fullSetChain.includes(button.setId)) fullSetChain.push(button.setId);
            return true;
        }
    }

    // --- STEP 2: Main Set Validation ---
    if (!fullSetChain.includes(button.setId) && button.setId !== setId && button.setId !== kind) {
        return false;
    }

    // --- STEP 3: MUME Specific Rules ---
    const isShopCmd = button.command.includes('mend') || button.command.includes('sell') || button.command.includes('value') || button.command === 'list' || button.command.startsWith('buy ');
    const isPosessed = effectiveLocation === 'inv' || effectiveLocation === 'worn' || effectiveLocation === 'carried';

    // Block 'Get' for items already in possession
    if (button.command.startsWith('get ') && !button.command.includes('all') && isPosessed) {
        return false;
    }

    // Block shop actions for worn items
    if (isShopCmd && effectiveLocation === 'worn') {
        return false;
    }

    // Shop commands require a shopkeeper
    if (isShopCmd && !fullSetChain.includes('npc-shopkeeper')) {
        const hasShopkeeper = roomNpcs?.some(npc => {
            const npcName = (typeof npc === 'string' ? npc : npc.name || npc.shortdesc || '').toLowerCase();
            return getCategoryForName(npcName, inlineCategories) === 'npc-shopkeeper';
        });
        if (!hasShopkeeper) return false;
    }

    // Mend/Wield only for weapon/armour
    if (button.command.startsWith('mend ')) {
        const isArmour = detectedCatId === 'object-armour' || entity?.capabilities?.includes(EntityCapability.Wearable);
        const isWeapon = detectedCatId === 'object-weapon' || entity?.capabilities?.includes(EntityCapability.Weapon);
        if (!isArmour && !isWeapon) return false;
    }

    if (button.command.startsWith('wield ')) {
        const isWeapon = detectedCatId === 'object-weapon' || entity?.capabilities?.includes(EntityCapability.Weapon);
        if (!isWeapon) return false;
    }

    return true;
}

/**
 * Returns buttons that are valid for ALL provided entities.
 */
export function getCommonActions(
    entries: string[],
    baseSetId: string,
    deps: ActionFilterDeps,
    favorites: string[] = [],
    location?: string,
    kind?: string
): CustomButton[] {
    if (entries.length === 0) return [];

    // Map each entry (potentially setId:id:context) to its set of valid buttons
    const resolvedEntries = entries.map(entry => {
        const parts = entry.split(':');
        // Legacy: parts[0] might be setId, parts[1] is entityId
        // New: entries might already have kind/location if metadata is rich
        const id = parts.length > 2 ? parts[1] : (parts.length === 2 ? parts[1] : parts[0]);
        const entity = deps.entities[id];
        
        // Derive location from entity if not explicitly provided
        const effectiveLocation = location || entity?.location;
        const effectiveKind = kind || (id.includes('npc') ? 'npc' : (id.includes('player') ? 'player' : 'object'));
        
        return deps.buttons.filter(b => isButtonValidForEntity(b, id, baseSetId, deps, undefined, effectiveLocation, effectiveKind));
    });

    // Find the intersection of button commands
    const intersection = resolvedEntries.reduce((common, current) => {
        const currentCommands = new Set(current.map(b => b.command));
        return common.filter(b => currentCommands.has(b.command));
    }, resolvedEntries[0]);

    // Ensure unique commands in the final list
    const seenCommands = new Set<string>();
    const uniqueActions = intersection.filter(b => {
        if (seenCommands.has(b.command)) return false;
        seenCommands.add(b.command);
        if (b.id.includes('shop') || b.id.includes('innkeeper')) {
            console.log(`[DEBUG] Final decision for ${b.id}: VALID`);
        }
        return true;
    });

    // Priority: Favorites first, then by set depth/ID
    return uniqueActions.sort((a, b) => {
        const aFav = favorites.includes(a.command) ? 1 : 0;
        const bFav = favorites.includes(b.command) ? 1 : 0;
        if (aFav !== bFav) return bFav - aFav;
        return a.setId.localeCompare(b.setId);
    });
}
