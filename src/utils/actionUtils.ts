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
    
    if (button.id.includes('shop') || button.id.includes('innkeeper') || button.id.includes('water') || button.id.includes('drink')) {
        console.log(`[DEBUG] Validating button ${button.id} vs ${entityId} (setId: ${setId}, cat: ${categoryOverride})`);
    }
    // Fallback: If no entity data yet, just use the set hierarchy check
    // This happens for items clicked in the log that haven't been 'scanned' into inventory/eq yet.
    if (!entity) {
        // We use the noun from the entityId if possible (strip auto-item- or auto-obj- prefix)
        const context = entityId.startsWith('auto-item-') ? entityId.replace('auto-item-', '') : 
                        entityId.startsWith('auto-obj-') ? entityId.replace('auto-obj-', '') : undefined;
        const detectedCatId = categoryOverride || (context ? getCategoryForName(context, inlineCategories) : null);
        const fullSetChain = getHierarchyChain(setId, detectedCatId);
        
        if (button.setId.includes('innkeeper') || button.setId.includes('shopkeeper')) {
            console.log(`[DEBUG] Action Chain for ${entityId}: [${fullSetChain.join(',')}] - Target setId: ${button.setId}`);
        }
        // Still apply basic shopkeeper/possession rules by command name
        const isShopCmd = button.command.includes('mend') || button.command.includes('sell') || button.command.includes('value') || button.command === 'list' || button.command.startsWith('buy ');
        const isPosessed = setId === 'inline-obj-char' || setId === 'inventorylist' || 
                           setId === 'inline-obj-worn' || setId === 'equipmentlist';

        if (button.command.startsWith('get ') && !button.command.includes('all') && isPosessed) return false;
        if (isShopCmd && (setId === 'inline-obj-worn' || setId === 'equipmentlist')) return false;
        
        if (isShopCmd && !fullSetChain.includes('inline-shopkeeper')) {
            const hasShopkeeper = roomNpcs?.some(npc => {
                const npcName = (typeof npc === 'string' ? npc : npc.name || npc.shortdesc || '').toLowerCase();
                return /barman|dealer|keeper|merchant|weaponsmith|armourer|smith|trader|grocer|librarian|provisioner|alchemist|herbalist|tailor/i.test(npcName);
            });
            if (!hasShopkeeper) return false;
        }

        if (button.command.startsWith('mend')) {
            const isArmour = detectedCatId === 'inline-armour';
            const isWeapon = detectedCatId === 'inline-weapon';
            if (!isArmour && !isWeapon) return false;
        }

        if (button.command.startsWith('wield ')) {
            const isWeapon = 
                detectedCatId === 'inline-weapon' || 
                /sword|dagger|mace|axe|staff|spear|club|flail|hammer|polearm|scimitar|morning star|halberd|rapier|blade|pike|lance|cleaver/i.test(context || '');
            if (!isWeapon) return false;
        }

        return fullSetChain.includes(button.setId) || button.setId === setId;
    }

    const context = entity.noun;
    
    // 1. Hierarchical Match
    const detectedCatId = categoryOverride || getCategoryForName(context, inlineCategories);
    const fullSetChain = getHierarchyChain(setId, detectedCatId);
    
    // --- SPECIAL HANDLING: Innkeeper/Shopkeeper/Guildmaster detection via roomNpcs ---
    // If we have roomNpcs (GMCP data), we can check if THIS entity (by ID or name matching)
    // is actually a service provider, even if the highlighter didn't tag its category correctly.
    const isServiceButton = button.setId.startsWith('inline-innkeeper') || 
                            button.setId.startsWith('inline-shopkeeper') || 
                            button.setId.startsWith('inline-guildmaster');

    if (isServiceButton && roomNpcs) {
        const matchingNpc = roomNpcs.find(npc => {
            const name = (typeof npc === 'string' ? npc : npc.name || npc.shortdesc || '').toLowerCase();
            const id = (typeof npc === 'string' ? '' : npc.id || '');
            return id === entityId || name.includes(context.toLowerCase());
        });

        if (matchingNpc) {
            const npcName = (typeof matchingNpc === 'string' ? matchingNpc : matchingNpc.name || matchingNpc.shortdesc || '').toLowerCase();
            const isInnkeeper = /innkeeper/i.test(npcName);
            const isShopkeeper = /barman|dealer|keeper|merchant|weaponsmith|armourer|smith|trader|grocer|librarian|provisioner|alchemist|herbalist|tailor/i.test(npcName);
            const isGuildmaster = /guildmaster|teacher|master|trainer|huor/i.test(npcName);

            if (button.setId === 'inline-innkeeper' && isInnkeeper) fullSetChain.push('inline-innkeeper');
            if (button.setId === 'inline-shopkeeper' && isShopkeeper) fullSetChain.push('inline-shopkeeper');
            if (button.setId === 'inline-guildmaster' && isGuildmaster) fullSetChain.push('inline-guildmaster');
        }
    }

    if (!fullSetChain.includes(button.setId) && button.setId !== setId) {
        console.log(`[ActionFilter] Rejected button ${button.id} (${button.label}) for ${entityId}: mismatch setId ${button.setId} vs chain [${fullSetChain.join(',')}]`);
        return false;
    }

    // 2. MUME Specific Rules
    const isShopCmd = button.command.includes('mend') || button.command.includes('sell') || button.command.includes('value') || button.command === 'list' || button.command.startsWith('buy ');
    const isPosessed = setId === 'inline-obj-char' || setId === 'inventorylist' || 
                       setId === 'inline-obj-worn' || setId === 'equipmentlist';

    // Block 'Get' for items already in possession
    if (button.command.startsWith('get ') && !button.command.includes('all') && isPosessed) {
        return false;
    }

    // Block 'Put' for items NOT in possession
    if (button.command.startsWith('put ') && !isPosessed) {
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
            return /barman|dealer|keeper|merchant|weaponsmith|armourer|smith|trader|grocer|librarian|provisioner|alchemist|herbalist|tailor/i.test(npcName);
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
        const isWeaponByName = /sword|dagger|mace|axe|staff|spear|club|flail|hammer|polearm|scimitar|morning star|halberd|rapier|blade|pike|lance|cleaver/i.test(entity.name || '');
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
