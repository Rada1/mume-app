/**
 * @file useEntityRegistry.ts
 * @description Centralized, stateful registry for game entities (NPCs, Players, Items).
 * This is the "Source of Truth" for what an entity can do (Capabilities).
 */

import { useState, useCallback, useRef } from 'react';
import { GameEntity, EntityCapability, EntityLocation } from '../types';
import { extractNoun as smartExtractNoun } from '../utils/keywordUtils';
import {
    getCategoryConfig,
    getKindForCategory,
    getTraitConfig,
    getTraitsForName,
    toCategoryId,
    toTraitId
} from '../utils/inlineActionModel';

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
        const caps: Set<EntityCapability> = new Set();
        const lower = name.toLowerCase();
        
        // 1. Resolve Traits (Additive)
        // We look for traits from the name and also include the specifically passed category if it exists
        const matchedTraits = getTraitsForName(name).map(trait => trait.id);
        if (category) matchedTraits.push(toTraitId(category) || toCategoryId(category) || category);
        
        // Remove duplicates and canonicalize
        const uniqueTraits = Array.from(new Set(matchedTraits));

        for (const traitId of uniqueTraits) {
            const categoryConfig = getCategoryConfig(traitId);
            const traitConfig = getTraitConfig(traitId);
            const catType = getKindForCategory(categoryConfig?.id) || traitConfig?.kind || null;
            const baseId = (traitConfig?.id || categoryConfig?.id || traitId)
                .replace(/^(trait|cat|inline)-/, '')
                .replace(/^object-/, '');

            // 2. Player/NPC Logic (Additive)
            if (catType === 'player' || baseId === 'ally' || baseId === 'enemy' || baseId === 'neutral') {
                caps.add(EntityCapability.Player);
                if (baseId === 'ally') caps.add(EntityCapability.Ally);
                if (baseId === 'enemy') caps.add(EntityCapability.Enemy);
                if (baseId === 'neutral') caps.add(EntityCapability.Neutral);
            } else if (catType === 'npc' || baseId === 'npc') {
                caps.add(EntityCapability.Npc);
                
                // Sub-type NPC detection
                if (baseId === 'innkeeper' || lower.includes('innkeeper')) caps.add(EntityCapability.Innkeeper);
                if (baseId === 'shopkeeper' || lower.includes('shopkeeper')) caps.add(EntityCapability.Shopkeeper);
                if (baseId === 'guildmaster' || lower.includes('guildmaster')) caps.add(EntityCapability.Guildmaster);
                if (baseId === 'mount' || baseId === 'mounts' || lower.includes('horse') || lower.includes('pony') || lower.includes('warg')) {
                    caps.add(EntityCapability.Mount);
                }
            }

            // 3. Item Capability Detection (Additive)
            const isItem = catType === 'object' || ['weapon', 'armour', 'shield', 'container', 'containers', 'corpse', 'corpses', 'food', 'fluid-container', 'fluidcontainer'].includes(baseId);
            
            if (isItem || location === 'carried' || location === 'worn') {
                if (baseId === 'corpse' || baseId === 'corpses' || lower.includes('corpse')) caps.add(EntityCapability.Corpse);
                if (baseId === 'weapon' || lower.includes('sword') || lower.includes('blade')) caps.add(EntityCapability.Weapon);
                if (baseId === 'armour' || lower.includes('mail') || lower.includes('plate')) caps.add(EntityCapability.Wearable);
                if (baseId === 'shield' || lower.includes('shield')) caps.add(EntityCapability.Shield);
                if (baseId === 'container' || baseId === 'containers' || lower.includes('bag') || lower.includes('chest')) caps.add(EntityCapability.Container);
                if (baseId === 'fluid-container' || baseId === 'fluidcontainer' || lower.includes('flask') || lower.includes('bottle')) caps.add(EntityCapability.FluidContainer);
                if (baseId === 'food' || lower.includes('bread') || lower.includes('meat')) caps.add(EntityCapability.Food);
                if (baseId === 'lightsource' || lower.includes('lantern') || lower.includes('torch')) caps.add(EntityCapability.Light);
                
                if (lower.includes('scroll') || lower.includes('book')) caps.add(EntityCapability.Readable);
            }
        }

        // Special case: fallback for room entities that didn't match any trait
        if (caps.size === 0 && location === 'room') {
            caps.add(EntityCapability.Npc);
        }

        // 5. Shared MUME rules (e.g. if it's a weapon, it's also wearable in some slots, etc.)
        if (caps.has(EntityCapability.Weapon)) {
            // In MUME, weapons are held, but for button filtering, they share 'object' traits
        }

        return Array.from(caps);
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
        entitiesRef,
        setEntities,
        registerEntity,
        getEntity,
        clearRegistry,
        detectCapabilities,
        extractNoun
    };
};
