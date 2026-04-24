/**
 * @file useEntityRegistry.ts
 * @description Centralized, stateful registry for game entities (NPCs, Players, Items).
 * This is the "Source of Truth" for what an entity can do (Capabilities).
 */

import { useState, useCallback, useRef } from 'react';
import { GameEntity, EntityCapability, EntityLocation } from '../types';
import { extractNoun as smartExtractNoun } from '../utils/keywordUtils';
import { isItemContainer } from '../utils/gameUtils';
import { getCategoryForName, getCategoryType } from '../utils/categorizationUtils';

// palette definitions for consistency (imported from categorizationUtils style)
const COLOR_NPC = 'rgba(253, 224, 71, 0.95)';
const COLOR_PLAYER = '#89CFF0'; // Baby Blue
const COLOR_OBJ = 'rgba(251, 146, 60, 0.95)';

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
        
        // 1. Resolve Category
        const detectedCat = category || getCategoryForName(name) || '';
        const catType = getCategoryType(detectedCat);
        const baseId = detectedCat.startsWith('inline-') ? detectedCat.slice(7) : detectedCat;

        // 2. Base Type Assignment
        const isRoomLocation = location === 'room' as any;
        if (catType === 'player') {
            caps.push(EntityCapability.Player);
            return caps; 
        }

        if (catType === 'npc' || isRoomLocation) {
            caps.push(EntityCapability.Npc);
            
            // Sub-type NPC detection via category ID
            if (baseId === 'innkeeper') caps.push(EntityCapability.Innkeeper);
            else if (baseId === 'shopkeeper') caps.push(EntityCapability.Shopkeeper);
            else if (baseId === 'guildmaster') caps.push(EntityCapability.Guildmaster);
            else if (baseId === 'mounts') caps.push(EntityCapability.Mount);
            
            return caps;
        }

        // 3. Item Capability Detection
        if (baseId === 'corpses' || lower.includes('corpse')) caps.push(EntityCapability.Corpse);
        if (baseId === 'weapon') caps.push(EntityCapability.Weapon);
        if (baseId === 'armour') caps.push(EntityCapability.Wearable);
        if (baseId === 'shield') caps.push(EntityCapability.Shield);
        if (baseId === 'containers') caps.push(EntityCapability.Container);
        if (baseId === 'fluidcontainer') caps.push(EntityCapability.FluidContainer);
        if (baseId === 'food') caps.push(EntityCapability.Food);
        if (baseId === 'lightsource' || baseId === 'lantern') caps.push(EntityCapability.Light);
        if (baseId === 'misc' && (lower.includes('scroll') || lower.includes('book'))) caps.push(EntityCapability.Readable);

        // Fallback or specific sub-types if not fully covered by categories
        if (!caps.includes(EntityCapability.Weapon) && 
            /boots|helmet|cloak|ring|belt|gloves|gauntlets|leggings|sleeves|tunic|bracers|hauberk/i.test(lower)) {
            caps.push(EntityCapability.Wearable);
        }

        return caps;
    }, []);

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
