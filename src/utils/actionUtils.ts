/**
 * @file actionUtils.ts
 * @description Filters inline action buttons by entity context and character eligibility.
 */

import { CustomButton, InlineCategoryConfig, GameEntity, EntityCapability, GmcpOccupant, EntityLocation, CharacterInfo } from '../types';
import { getButtonIdsForTraits, getResolvedTraitSections } from './inlineActionModel';
import { getInlineCategoryAxes, normalizeInlineCategoryId } from './inlineCategoryAxes';
import { isButtonEligibleForCharacter } from './characterEligibility';

export interface ActionFilterDeps {
    buttons: CustomButton[];
    inlineCategories?: InlineCategoryConfig[];
    roomNpcs?: (string | GmcpOccupant)[];
    entities: Record<string, GameEntity>;
    characterInfo?: CharacterInfo;
}

/**
 * Checks if a specific button is valid for a given entity based on MUME rules.
 * Category is authoritative; location is derived from category.
 */
export function isButtonValidForEntity(
    button: CustomButton,
    entityId: string,
    categoryId: string,
    deps: ActionFilterDeps,
    legacySetId?: string,
    context?: string
): boolean {
    const { inlineCategories, roomNpcs, entities } = deps;
    const entity = entities[entityId];
    const resolvedCategoryId = normalizeInlineCategoryId(categoryId || legacySetId || entity?.category);
    const axes = getInlineCategoryAxes(resolvedCategoryId, entity?.location);

    // --- STEP 1: Determine Relevant Traits ---
    const resolvedTraitSections = getResolvedTraitSections(
        resolvedCategoryId,
        entity?.name || context || null,
        inlineCategories || []
    );
    const eligibleTraitSections = resolvedTraitSections.filter(section =>
        isButtonEligibleForCharacter(section.trait.requirement, deps.characterInfo)
    );
    const traitButtons = new Set(getButtonIdsForTraits(eligibleTraitSections.map(section => section.trait)));

    // --- STEP 2: Main Set Validation ---
    // Resolved traits are authoritative for inline actions.
    if (!traitButtons.has(button.id)) return false;
    if (!isButtonEligibleForCharacter(button.requirement, deps.characterInfo)) return false;

    // --- STEP 3: MUME Specific Rule Overrides ---
    // These rules prune buttons that are physically impossible in the current context
    
    const location = axes.location;
    const isPosessed = location === 'carried' || location === 'worn';

    // 1. Block 'Get' for items already in possession (unless getting a container item)
    if (button.command.startsWith('get ') && !button.command.includes('all') && isPosessed && resolvedCategoryId !== 'cat-container-item') {
        return false;
    }

    // 2. Shop commands require a shopkeeper (if in a room) or to be in a shop context
    const isShopCmd = button.command.includes('sell') || button.command.includes('value') || button.command === 'list' || button.command.startsWith('buy ');
    if (isShopCmd && location !== 'shop') {
        // If we're not explicitly in a shop context, we need a shopkeeper present in the room
        const hasShopkeeper = roomNpcs?.some(npc => {
            const name = (typeof npc === 'string' ? npc : npc.name || npc.shortdesc || '').toLowerCase();
            const capList = entities[name]?.capabilities || [];
            return capList.includes(EntityCapability.Shopkeeper);
        });
        if (!hasShopkeeper) return false;
    }

    // 3. Block shop actions for worn items (MUME requires you to remove them first)
    if (isShopCmd && location === 'worn') {
        return false;
    }

    // 4. Whetstone actions only apply when worn
    if (button.id === 'btn-whet' && location !== 'worn') {
        return false;
    }
    
    // 5. Recite actions only apply when in inventory
    if (button.id === 'btn-recite' && location !== 'carried') {
        return false;
    }

    // 6. Wield actions only apply when in inventory
    if (button.id === 'btn-weapon-wield' && location === 'worn') {
        return false;
    }

    // 7. Draw actions only apply when worn
    if (button.id === 'btn-draw' && location !== 'worn') {
        return false;
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
    providedLocation?: EntityLocation,
    providedCategory?: string
): CustomButton[] {
    if (entries.length === 0) return [];

    // Map each entry (potentially setId:id:context) to its set of valid buttons
    const resolvedEntries = entries.map(entry => {
        const parts = (entry || '').split(':');
        const id = parts.length > 2 ? parts[1] : (parts.length === 2 ? parts[1] : parts[0]);
        const entity = deps.entities[id];
        
        const categoryId = providedCategory || entity?.category || baseSetId;
        const axes = getInlineCategoryAxes(categoryId, providedLocation || entity?.location);
        
        return deps.buttons.filter(b => isButtonValidForEntity(b, id, axes.categoryId, deps, baseSetId));
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
