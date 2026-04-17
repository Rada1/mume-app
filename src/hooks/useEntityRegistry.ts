/**
 * @file useEntityRegistry.ts
 * @description Centralized, stateful registry for game entities (NPCs, Players, Items).
 * This is the "Source of Truth" for what an entity can do (Capabilities).
 */

import { useState, useCallback, useRef } from 'react';
import { GameEntity, EntityCapability, EntityLocation } from '../types';
import { extractNoun as smartExtractNoun } from '../utils/keywordUtils';
import { isItemContainer } from '../utils/gameUtils';
import { COLOR_OBJ as GLOBAL_COLOR_OBJ } from '../utils/categorizationUtils';

// palette definitions for consistency (imported from categorizationUtils style)
const COLOR_NPC = 'rgba(217, 70, 239, 0.9)';
const COLOR_PLAYER = 'rgba(125, 211, 252, 0.9)';
const COLOR_OBJ = GLOBAL_COLOR_OBJ;

export const useEntityRegistry = () => {
    const [entities, setEntities] = useState<Record<string, GameEntity>>({});
    const entitiesRef = useRef<Record<string, GameEntity>>({});

    // Session memory for mapping long names to short nouns
    const nounMemoryRef = useRef<Record<string, string>>({});

    const extractNoun = useCallback((name: string): string => {
        if (nounMemoryRef.current[name]) return nounMemoryRef.current[name];
        const noun = smartExtractNoun(name);
        nounMemoryRef.current[name] = noun;
        return noun;
    }, []);

    const detectCapabilities = useCallback((name: string, location: EntityLocation, category?: string): EntityCapability[] => {
        const caps: EntityCapability[] = [];
        const lower = name.toLowerCase();
        const noun = extractNoun(name).toLowerCase();

        // 1. Determine base type (NPC vs Player vs Item)
        if (category === 'inlineplayer' || location === 'roomplayers') {
            caps.push(EntityCapability.Player);
            return caps; // Players don't usually have other item-like caps
        }

        if (category === 'inlinenpc' || location === 'roomnpcs' || category?.startsWith('inline-npc') || category?.startsWith('inline-shop') || category?.startsWith('inline-inn') || category?.startsWith('inline-guild') || category?.startsWith('inline-mount')) {
            caps.push(EntityCapability.Npc);
            
            // Sub-type NPC detection
            if (/innkeeper|barman|butterbur|tender|lodging/i.test(lower)) caps.push(EntityCapability.Innkeeper);
            if (/shopkeeper|dealer|keeper|merchant|weaponsmith|armourer|smith|trader|grocer|librarian|provisioner|alchemist|herbalist|tailor|blacksmith|vendor|cobbler|peddler/i.test(lower)) caps.push(EntityCapability.Shopkeeper);
            if (/guildmaster|teacher|master|trainer|huor/i.test(lower)) caps.push(EntityCapability.Guildmaster);
            if (/horse|pony|steed|donkey|mule|warg/i.test(lower)) caps.push(EntityCapability.Mount);
            
            return caps;
        }

        // 2. Item Capability Detection
        if (lower.includes('corpse')) caps.push(EntityCapability.Corpse);

        // Weapon Detection
        const isWeapon = /sword|blade|dagger|axe|mace|spear|staff|club|flail|hammer|polearm|scimitar|morning star|halberd|rapier|pike|lance|cleaver/i.test(lower);
        if (isWeapon) {
            caps.push(EntityCapability.Weapon);
            if (/sword|dagger|scimitar|rapier|blade/i.test(lower)) caps.push(EntityCapability.Blade);
            else if (/mace|club|flail|hammer|blunt/i.test(lower)) caps.push(EntityCapability.Blunt);
            else if (/axe|halberd|cleaver/i.test(lower)) caps.push(EntityCapability.Axe);
            else if (/spear|polearm|pike|lance/i.test(lower)) caps.push(EntityCapability.Spear);
            else if (/staff/i.test(lower)) caps.push(EntityCapability.Staff);
        }

        if (lower.includes('shield') || lower.includes('buckler')) caps.push(EntityCapability.Shield);

        // Containers
        if (isItemContainer(lower)) {
            caps.push(EntityCapability.Container);
        }

        if (/flask|bottle|cup|skin|flagon|goblet|vial|keg|barrel|waterskin|pitcher|jug|mug|stein/i.test(lower)) {
            caps.push(EntityCapability.FluidContainer);
            caps.push(EntityCapability.DrinkContainer);
        }

        if (/meat|bread|biscuit|lembas|mushroom|honey|wafer|cookie|egg|dumpling|bannock|cheese|pastry|flour|cake|pie|rations/i.test(lower)) {
            caps.push(EntityCapability.Food);
        }

        if (/scroll|book|note|map|parchment|letter|journal|libram/i.test(lower)) {
            caps.push(EntityCapability.Readable);
        }

        if (/torch|lantern|lamp|candle|light/i.test(lower)) {
            caps.push(EntityCapability.Light);
        }

        // Wearable (if not a weapon and matches common gear)
        const wearableKeywords = /boots|helmet|cloak|ring|belt|gloves|gauntlets|leggings|sleeves|tunic|surcoat|armor|armour|mail|cap|hat|bracers|greaves|mail|breastplate|cloak|surcoat|robe|tunic|trousers|breeches|shoes|sandals|scabbard|crown|circlet|coif|basinet|scarf|collar|hauberk|shirt|vest|jacket|dress|blouse|cape|mantle|vambraces|skirt|slippers|girdle|sash/i;
        if (wearableKeywords.test(lower) && !caps.includes(EntityCapability.Weapon)) {
            caps.push(EntityCapability.Wearable);
        }

        return caps;
    }, [extractNoun]);

    const registerEntity = useCallback((id: string, name: string, location: EntityLocation, category?: string) => {
        const noun = extractNoun(name);
        const capabilities = detectCapabilities(name, location, category);

        const newEntity: GameEntity = {
            id,
            name,
            noun,
            location,
            capabilities
        };

        setEntities(prev => {
            const next = { ...prev, [id]: newEntity };
            entitiesRef.current = next;
            return next;
        });
        
        return newEntity;
    }, [extractNoun, detectCapabilities]);

    const getEntity = useCallback((id: string) => {
        return entitiesRef.current[id];
    }, []);

    const clearRegistry = useCallback(() => {
        setEntities({});
        entitiesRef.current = {};
    }, []);

    return {
        entities,
        setEntities,
        registerEntity,
        getEntity,
        clearRegistry,
        detectCapabilities,
        extractNoun
    };
};
