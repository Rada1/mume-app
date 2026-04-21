import { CustomButton, InlineCategoryConfig, GameEntity, EntityCapability, GmcpOccupant } from '../types';
import { getCategoryForName, canonicalizeCategoryId, resolveKindAndLocation } from './categorizationUtils';
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
    kind: string,
    location: string,
    deps: ActionFilterDeps,
    categoryOverride?: string,
    legacySetId?: string
): boolean {
    const { inlineCategories, roomNpcs, entities } = deps;
    const entity = entities[entityId];

    // --- STEP 1: Determine Context & Category ---
    const context = entity?.noun || 
                   entityId.replace(/^(auto-npc-|auto-item-|auto-obj-|roomnpcs:|roomitems:|inventorylist:|equipmentlist:|log-npc-|npc-|player-|object-)/, '')
                           .replace(/-[a-f0-9]+$/, '').replace(/-/g, ' ');

    const dynamicCat = context ? getCategoryForName(context, inlineCategories) : null;
    const genericBaseCats = ['object-room', 'object-inv', 'object-worn', 'npc', 'player'];
    
    // Canonicalize the override to ensure comparison works
    const catIdOverride = categoryOverride ? canonicalizeCategoryId(categoryOverride) : null;

    const detectedCatId = (catIdOverride && !genericBaseCats.includes(catIdOverride)) 
        ? catIdOverride 
        : (dynamicCat || catIdOverride || null);
    
    // Build hierarchy chain using new axes
    const fullSetChain = getHierarchyChain(kind, location, detectedCatId || undefined);

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
    if (!fullSetChain.includes(button.setId) && button.setId !== legacySetId) {
        return false;
    }

    // --- STEP 3: MUME Specific Rules ---
    const isShopCmd = button.command.includes('mend') || button.command.includes('sell') || button.command.includes('value') || button.command === 'list' || button.command.startsWith('buy ');
    const isPosessed = location === 'carried' || location === 'worn';

    // Block 'Get' for items already in possession
    if (button.command.startsWith('get ') && !button.command.includes('all') && isPosessed) {
        return false;
    }

    // Block shop actions for worn items
    if (isShopCmd && location === 'worn') {
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
    providedLocation?: string,
    providedKind?: string
): CustomButton[] {
    if (entries.length === 0) return [];

    // Map each entry (potentially setId:id:context) to its set of valid buttons
    const resolvedEntries = entries.map(entry => {
        const parts = entry.split(':');
        const id = parts.length > 2 ? parts[1] : (parts.length === 2 ? parts[1] : parts[0]);
        const entity = deps.entities[id];
        
        // Derive location and kind
        const axes = resolveKindAndLocation(providedKind || null, providedLocation || entity?.location, baseSetId);
        
        return deps.buttons.filter(b => isButtonValidForEntity(b, id, axes.kind, axes.location, deps, undefined, baseSetId));
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
