import { CustomButton, InlineCategoryConfig, GameEntity, EntityCapability, GmcpOccupant } from '../types';
import { getCategoryForName, canonicalizeCategoryId, resolveKindAndLocation, getTraitConfigsForName, getButtonSetIdForCategory } from './categorizationUtils';
import { getHierarchyChain, getRelevantSets } from './buttonHierarchyUtils';

export interface ActionFilterDeps {
    buttons: CustomButton[];
    inlineCategories?: InlineCategoryConfig[];
    roomNpcs?: (string | GmcpOccupant)[];
    entities: Record<string, GameEntity>;
}

/**
 * Checks if a specific button is valid for a given entity based on MUME rules.
 * DIRT SIMPLE VERSION: Trust the kind and location axes.
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

    // --- STEP 1: Determine Relevant Sets (The "Trait-Based" way) ---
    // We combine the base kind/location with the entity's detected capabilities
    const traitConfigs = entity?.name ? getTraitConfigsForName(entity.name, inlineCategories || []) : [];
    const extraSets = traitConfigs.map(getButtonSetIdForCategory).filter(Boolean) as string[];

    const relevantSets = entity 
        ? getRelevantSets(entity, extraSets)
        : Array.from(new Set([
            ...getHierarchyChain(kind, location, categoryOverride),
            ...extraSets
          ]));

    const canonicalButtonSetId = canonicalizeCategoryId(button.setId);
    const canonicalLegacySetId = legacySetId ? canonicalizeCategoryId(legacySetId) : undefined;
    const canonicalRelevantSets = relevantSets.map(setId => canonicalizeCategoryId(setId));

    // --- STEP 2: Main Set Validation ---
    // If the button set is in our relevant traits, it's valid
    let isValidSet =
        relevantSets.includes(button.setId) ||
        canonicalRelevantSets.includes(canonicalButtonSetId) ||
        button.setId === legacySetId ||
        (!!canonicalLegacySetId && canonicalButtonSetId === canonicalLegacySetId);

    if (!isValidSet) return false;

    // --- STEP 3: MUME Specific Rule Overrides ---
    // These rules prune buttons that are physically impossible in the current context
    
    const isPosessed = location === 'carried' || location === 'worn';

    // 1. Block 'Get' for items already in possession
    if (button.command.startsWith('get ') && !button.command.includes('all') && isPosessed) {
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
        const parts = (entry || '').split(':');
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
