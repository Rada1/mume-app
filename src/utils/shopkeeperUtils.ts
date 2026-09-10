/**
 * @file shopkeeperUtils.ts
 * @description Identifies shopkeepers among the current room occupants.
 */

// --- Logic Section ---
import { EntityCapability, GameEntity, GmcpOccupant } from '../types';

const KNOWN_MUME_SHOPKEEPERS = new Set([
    'nordri', 'harn', 'gillie', 'sadie', 'corbec', 'clara', 'bill', 'eostra', 'kraz',
    'litri', 'gymir', 'thulin', 'edrahil', 'lindir', 'al', 'olo', 'gaffer', 'boffin',
    'thrain', 'dwalin', 'gimli', 'gloin', 'bofur', 'bombur', 'thorin', 'arminas',
    'fili', 'kili', 'elrond', 'galadriel', 'celeborn', 'thranduil', 'legolas',
    'balin', 'dori', 'nori', 'ori', 'oen', 'grocer', 'weaponsmith', 'armourer',
    'provisioner', 'innkeeper', 'dealer', 'merchant', 'keeper', 'smith', 'trader',
    'magni', 'modi', 'var', 'syn', 'gullveig'
]);

const SHOPKEEPER_NAME_PATTERN = /\b(?:shopkeeper|dealer|merchant|keeper|smith|trader|grocer|weaponsmith|armourer|provisioner|innkeeper)\b/i;

const getEntityForOccupant = (
    occupant: GmcpOccupant,
    entities: Record<string, GameEntity>
): GameEntity | undefined => {
    if (occupant.id === undefined) return undefined;
    return entities[`roomchars:${occupant.id}`] ?? entities[String(occupant.id)];
};

export const findRoomShopkeeper = (
    occupants: readonly GmcpOccupant[] | undefined,
    entities: Record<string, GameEntity>
): GmcpOccupant | undefined => occupants?.find(occupant => {
    const entity = getEntityForOccupant(occupant, entities);
    if (entity?.capabilities.includes(EntityCapability.Shopkeeper) || entity?.capabilities.includes(EntityCapability.Innkeeper)) {
        return true;
    }

    const name = occupant.name?.trim().toLowerCase();
    return Boolean(name && (KNOWN_MUME_SHOPKEEPERS.has(name) || SHOPKEEPER_NAME_PATTERN.test(name)));
});
