/**
 * @file actionUtils.ts
 * @description Filters inline action buttons by entity context and character eligibility.
 */

import { CustomButton, InlineCategoryConfig, GameEntity, EntityCapability, GmcpOccupant, EntityLocation, CharacterInfo } from '../types';
import { getButtonIdsForTraits, getResolvedTraitSections, matchesKeyword } from './inlineActionModel';
import { getInlineCategoryAxes, normalizeInlineCategoryId } from './inlineCategoryAxes';
import { isButtonEligibleForCharacter } from './characterEligibility';
import { isMountActionEligible } from './mountEligibility';
import { isDoorPresenceSpellCommand } from './doorCommandUtils';
import { isEnchantableObject } from './enchantTargetEligibility';

export interface ActionFilterDeps {
    buttons: CustomButton[];
    inlineCategories?: InlineCategoryConfig[];
    roomNpcs?: (string | GmcpOccupant)[];
    entities: Record<string, GameEntity>;
    characterInfo?: CharacterInfo;
    currentTerrain?: string;
}

// --- Trait Eligibility Section ---
// Classification depends only on category/name, custom traits and character identity.
// Live per-button validity (room occupants, location and terrain) stays separate below.
export const getEligibleActionButtonIds = (categoryId: string, name: string | null, deps: Pick<ActionFilterDeps, 'inlineCategories' | 'characterInfo'>): ReadonlySet<string> => {
    const sections = getResolvedTraitSections(categoryId, name, deps.inlineCategories || []);
    return new Set(getButtonIdsForTraits(sections
        .filter(section => isButtonEligibleForCharacter(section.trait.requirement, deps.characterInfo))
        .map(section => section.trait)).filter(id => isMountActionEligible(id, name, deps.characterInfo)));
};

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
    context?: string,
    preparedTraitButtons?: ReadonlySet<string>
): boolean {
    const { roomNpcs, entities } = deps;
    const entity = entities[entityId];
    const resolvedCategoryId = normalizeInlineCategoryId(categoryId || legacySetId || entity?.category);
    const axes = getInlineCategoryAxes(resolvedCategoryId, entity?.location);

    // --- STEP 1: Determine Relevant Traits ---
    const traitButtons = preparedTraitButtons ?? getEligibleActionButtonIds(resolvedCategoryId, entity?.name || context || null, deps);

    // --- STEP 2: Main Set Validation ---
    // Resolved traits are authoritative for inline actions.
    if (!traitButtons.has(button.id)) return false;
    if (!isMountActionEligible(button.id, entity?.name || context || null, deps.characterInfo)) return false;
    if (!isButtonEligibleForCharacter(button.requirement, deps.characterInfo)) return false;
    if (button.inlineTargetKinds) {
        const targetKind = axes.isCharacter ? 'character' : axes.isObject ? 'object' : axes.family === 'exit' ? 'exit' : null;
        if (!targetKind || !button.inlineTargetKinds.includes(targetKind)) return false;
    }

    // --- STEP 3: MUME Specific Rule Overrides ---
    if (button.id === 'btn-saddle-mount' && resolvedCategoryId !== 'cat-inventory-object') return false;
    if (button.id === 'btn-saddle-unsaddle' && resolvedCategoryId !== 'cat-mount-object') return false;
    // These rules prune buttons that are physically impossible in the current context
    
    const location = axes.location;
    if (isDoorPresenceSpellCommand(button.command) && (axes.family !== 'exit' || location !== 'room')) return false;
    if (/^(?:lock|unlock)(?:\s|$)/i.test(button.command.trim()) && (axes.family !== 'exit' || location !== 'room')) return false;
    if (/^pick(?:\s|$)/i.test(button.command.trim())) {
        const isRoomDoor = axes.family === 'exit' && location === 'room';
        const isRoomChest = axes.isObject && location === 'room' && /\bchest\b/i.test(entity?.name || context || '');
        if (!isRoomDoor && !isRoomChest) return false;
    }
    const isPosessed = location === 'carried' || location === 'worn';
    if (/^cast\s+['"]?enchant['"]?(?:\s|$)/i.test(button.command.trim())
        && (!axes.isObject || !isPosessed || !isEnchantableObject(entity?.name || context || ''))) {
        return false;
    }
    const isWornContainer = resolvedCategoryId === 'cat-worn-object'
        && traitButtons.has('btn-get')
        && traitButtons.has('btn-container-open');

    // Butchering targets corpses on the ground in the current room only.
    if (/^butcher(?:\s|$)/i.test(button.command.trim()) && location !== 'room') {
        return false;
    }

    // 1. Block 'Get' for possessed items except contents of a worn container.
    if (button.command.startsWith('get ') && !button.command.includes('all') && isPosessed
        && resolvedCategoryId !== 'cat-container-item' && !isWornContainer) {
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

    // 8. Throw applies only to the Twisted rock fragment in inventory.
    if (button.id === 'btn-throw') {
        const lowerName = (entity?.name || context || '').toLowerCase();
        const matchesRock = matchesKeyword(lowerName, 'twisted-rock');
        if (!matchesRock || location !== 'carried') return false;
    }

    // 9. Use actions only apply to known useables in worn gear.
    if (button.id === 'btn-use') {
        const lowerName = (entity?.name || context || '').toLowerCase();
        const matchesStone = matchesKeyword(lowerName, 'pale-blue-stone');
        const matchesStaff = ['bejewelled-oak-staff', 'bejeweled-oak-staff', 'bejewelled-oaken-staff', 'bejeweled-oaken-staff']
            .some(keyword => matchesKeyword(lowerName, keyword));
        const matchesRing = ['golden-topaz-ring', 'golden-garnet-ring', 'golden-emerald-ring', 'golden-opal-ring']
            .some(keyword => matchesKeyword(lowerName, keyword));
        const matchesEye = matchesKeyword(lowerName, 'obsidian-eye');
        const matchesOther = ['black-candle', 'small-pouch', 'small-crystal-phial'].some(k => matchesKeyword(lowerName, k));

        if ((matchesStone || matchesStaff || matchesRing || matchesEye || matchesOther) && location !== 'worn') {
            return false;
        }
    }

    // 10. Cover/Uncover actions only apply when worn
    if ((button.id === 'btn-lightsource-cover' || button.id === 'btn-lightsource-uncover') && location !== 'worn') {
        return false;
    }

    // 11. Room drink water button requires the room to have a water-related terrain
    if (button.id === 'btn-room-drink-water') {
        const terrain = (deps.currentTerrain || '').toLowerCase().trim();
        const isValidWaterSector = ['water', 'shallow', 'shallows', 'underwater', 'rapids', 'rapid'].includes(terrain);
        if (!isValidWaterSector) {
            return false;
        }
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
        
        const traitButtons = getEligibleActionButtonIds(axes.categoryId, entity?.name || null, deps);
        return deps.buttons.filter(b => isButtonValidForEntity(b, id, axes.categoryId, deps, baseSetId, undefined, traitButtons));
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
