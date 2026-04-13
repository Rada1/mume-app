import { CustomButton, InlineCategoryConfig, GameEntity, EntityCapability, GmcpOccupant } from '../types';
import { getCategoryForName } from './categorizationUtils';
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
    categoryOverride?: string
): boolean {
    const { inlineCategories, roomNpcs, entities } = deps;
    const entity = entities[entityId];
    
    // --- STEP 1: Determine Context & Category ---
    // We try to derive the noun/context of the entity to perform category matching.
    const context = entity?.noun || 
                   entityId.replace(/^(auto-npc-|auto-item-|auto-obj-|roomnpcs:|roomitems:|inventorylist:|equipmentlist:|log-npc-)/, '')
                           .replace(/-[a-f0-9]+$/, '').replace(/-/g, ' ');

    const detectedCatId = categoryOverride || (context ? getCategoryForName(context, inlineCategories) : null);
    const fullSetChain = getHierarchyChain(setId, detectedCatId);

    // Debugging for service-related buttons
    const isServiceButton = button.setId.startsWith('inline-innkeeper') || 
                            button.setId.startsWith('inline-shopkeeper') || 
                            button.setId.startsWith('inline-guildmaster');

    if (isServiceButton) {
        // If the hierarchy chain already includes the target set, we trust it absolutely (e.g. via manual category tag)
        if (fullSetChain.includes(button.setId)) return true;

        let isMatch = false;
        
        // 1. Check explicit capabilities (registered entities)
        if (entity?.capabilities) {
            if (button.setId === 'inline-innkeeper' && entity.capabilities.includes(EntityCapability.Innkeeper)) isMatch = true;
            if (button.setId === 'inline-shopkeeper' && entity.capabilities.includes(EntityCapability.Shopkeeper)) isMatch = true;
            if (button.setId === 'inline-guildmaster' && entity.capabilities.includes(EntityCapability.Guildmaster)) isMatch = true;
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
                if (button.setId === 'inline-innkeeper' && /innkeeper|barman|butterbur|tender|lodging/i.test(npcName)) isMatch = true;
                if (button.setId === 'inline-shopkeeper' && /shopkeeper|blacksmith|dealer|keeper|merchant|weaponsmith|armourer|smith|trader|grocer|librarian|provisioner|alchemist|herbalist|tailor/i.test(npcName)) isMatch = true;
                if (button.setId === 'inline-guildmaster' && /guildmaster|teacher|master|trainer|huor/i.test(npcName)) isMatch = true;
            }
        }

        if (isMatch) {
            if (!fullSetChain.includes(button.setId)) fullSetChain.push(button.setId);
            return true;
        }
    }

    // --- STEP 2: Main Set Validation ---
    if (!fullSetChain.includes(button.setId) && button.setId !== setId) {
        return false;
    }

    // --- STEP 3: MUME Specific Rules ---
    const isShopCmd = button.command.includes('mend') || button.command.includes('sell') || button.command.includes('value') || button.command === 'list' || button.command.startsWith('buy ');
    const isPosessed = setId === 'inline-obj-char' || setId === 'inventorylist' || 
                       setId === 'inline-obj-worn' || setId === 'equipmentlist';

    // Block 'Get' for items already in possession
    if (button.command.startsWith('get ') && !button.command.includes('all') && isPosessed) {
        return false;
    }

    // Block shop actions for worn items
    if (isShopCmd && (setId === 'inline-obj-worn' || setId === 'equipmentlist')) {
        return false;
    }

    // Shop commands require a shopkeeper
    if (isShopCmd && !fullSetChain.includes('inline-shopkeeper')) {
        const hasShopkeeper = roomNpcs?.some(npc => {
            const npcName = (typeof npc === 'string' ? npc : npc.name || npc.shortdesc || '').toLowerCase();
            return /shopkeeper|blacksmith|barman|dealer|keeper|merchant|weaponsmith|armourer|smith|trader|grocer|librarian|provisioner|alchemist|herbalist|tailor/i.test(npcName);
        });
        if (!hasShopkeeper) return false;
    }

    // Mend/Wield only for weapon/armour
    if (button.command.startsWith('mend ')) {
        const isArmour = detectedCatId === 'inline-armour' || entity?.capabilities?.includes(EntityCapability.Wearable);
        const isWeapon = detectedCatId === 'inline-weapon' || entity?.capabilities?.includes(EntityCapability.Weapon);
        if (!isArmour && !isWeapon) return false;
    }

    if (button.command.startsWith('wield ')) {
        const isWeaponByCat = detectedCatId === 'inline-weapon';
        const isWeaponByCap = entity?.capabilities?.includes(EntityCapability.Weapon);
        const isWeaponByName = /sword|dagger|mace|axe|staff|spear|club|flail|hammer|polearm|scimitar|morning star|halberd|rapier|blade|pike|lance|cleaver/i.test(entity?.name || context || '');
        const isWeapon = isWeaponByCat || isWeaponByCap || isWeaponByName;
        
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
    favorites: string[] = []
): CustomButton[] {
    if (entries.length === 0) return [];

    // Map each entry (potentially setId:id) to its set of valid buttons
    const resolvedEntries = entries.map(entry => {
        const parts = entry.split(':');
        const providedSetId = parts.length > 2 ? parts[0] : (parts.length === 2 ? parts[0] : undefined);
        const id = parts.length > 2 ? parts[1] : (parts.length === 2 ? parts[1] : parts[0]);
        // We don't need context for action filtering, just for the final command execution,
        // but we need to correctly identify the location for filtering.

        const entity = deps.entities[id];
        let effectiveSetId = baseSetId;
        
        // Map provided set ID or entity location to the correct action set
        const locationSource = providedSetId || entity?.location;

        if (locationSource === 'roomnpcs') {
            effectiveSetId = 'inlinenpc';
        } else if (locationSource === 'roomitems' || locationSource === 'room' || locationSource === 'inline-obj-room') {
            effectiveSetId = 'inline-obj-room';
        } else if (locationSource === 'inventorylist' || locationSource === 'inv' || locationSource === 'inline-obj-char') {
            effectiveSetId = 'inline-obj-char';
        } else if (locationSource === 'equipmentlist' || locationSource === 'eq' || locationSource === 'worn' || locationSource === 'inline-obj-worn') {
            effectiveSetId = 'inline-obj-worn';
        }
        
        return deps.buttons.filter(b => isButtonValidForEntity(b, id, effectiveSetId, deps));
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
