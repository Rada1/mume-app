/**
 * @file shaperAiGeneration.ts
 * @description Prompt and response helpers for Shaper AI prose generation.
 */

// --- Type Section ---
export type ShaperAiTarget = 'room-description' | 'room-name' | 'door-description';

export type ShaperAiPromptSpec = {
    target: ShaperAiTarget;
    prompt: string;
    responseSchema: Record<string, unknown>;
    samplePayload: Record<string, string>;
};

type OllamaModelTag = {
    name?: unknown;
    model?: unknown;
    capabilities?: unknown;
};

// --- Guide Section ---
const MAX_TEXT_FIELD = 700;
const MAX_DESCRIPTION_FIELD = 320;
const MAX_LIST_ITEMS = 8;

const BUILDER_GUIDE_RULES = `MUME builder guide rules:
- Room names should generally be three or four words.
- Use title case for room names, but keep articles, short prepositions, and
  coordinating conjunctions lowercase unless they are the final word.
- Use "the" for unique rooms or features, and "a" or "an" for common places.
- Choose the preposition by checking: "You are <preposition> <name>."
- Room descriptions describe what can be seen in the room.
- Room descriptions should be at least three full lines.
- Keep description lines under 80 characters after wrapping.
- Return only the description body, not the room name or "You are..." helper.
- Avoid starting room descriptions with "You are in/on/at <room name>."
- Do not force player emotions, reactions, movement, or bodily actions.
- Do not describe temporary mobiles or objects as permanent room features.
- If a notable feature deserves detail, mention it briefly and leave deeper
  detail for keywords or exit descriptions.`;

const LORE_RULES = `Lore and context rules:
- Treat zone lore, story, history, map notes, room notes, neighbors, sector,
  flags, libraries, and exit details as creative canon.
- Match the zone's established place names, mood, culture, geography, and era.
- Do not invent major lore facts, factions, landmarks, or history not implied
  by the provided context.
- Existing room names and descriptions are context only; generate a fresh
  replacement, not a copy or minor paraphrase.`;

const truncateText = (value: string, limit: number): string =>
    value.length > limit ? `${value.slice(0, limit).trim()}...` : value;

const compactContext = (value: unknown, key = ''): unknown => {
    if (typeof value === 'string') {
        const limit = key === 'description' || key === 'lore' ? MAX_DESCRIPTION_FIELD : MAX_TEXT_FIELD;
        return truncateText(value, limit);
    }
    if (Array.isArray(value)) return value.slice(0, MAX_LIST_ITEMS).map(item => compactContext(item));
    if (!value || typeof value !== 'object') return value;
    return Object.fromEntries(
        Object.entries(value as Record<string, unknown>)
            .map(([entryKey, entryValue]) => [entryKey, compactContext(entryValue, entryKey)])
    );
};

const contextForTarget = (context: unknown, target: ShaperAiTarget): unknown => {
    const compacted = compactContext(context);
    if (target !== 'room-name' || !compacted || typeof compacted !== 'object') return compacted;
    const record = { ...(compacted as Record<string, unknown>) };
    if (typeof record.name === 'string' && record.name.trim()) {
        record.currentNameToReplace = record.name;
        delete record.name;
    }
    return record;
};

const contextBlock = (context: unknown, target: ShaperAiTarget): string =>
    JSON.stringify(contextForTarget(context, target), null, 2);

// --- Model Section ---
const preferredModelNames = ['gemma3:4b', 'gemma3:12b', 'gemma3:1b'];

const modelName = (tag: OllamaModelTag): string =>
    typeof tag.name === 'string' ? tag.name : typeof tag.model === 'string' ? tag.model : '';

const modelCapabilities = (tag: OllamaModelTag): string[] =>
    Array.isArray(tag.capabilities)
        ? tag.capabilities.filter((item): item is string => typeof item === 'string')
        : [];

export const selectShaperOllamaModel = (tagsData: unknown, preferred?: string): string => {
    if (preferred?.trim()) return preferred.trim();
    if (!tagsData || typeof tagsData !== 'object' || !Array.isArray((tagsData as { models?: unknown }).models)) return '';
    const tags = (tagsData as { models: OllamaModelTag[] }).models;
    const completionModels = tags.filter(tag => {
        const name = modelName(tag);
        const capabilities = modelCapabilities(tag);
        return name && !capabilities.includes('embedding');
    });
    const nonThinking = completionModels.filter(tag => !modelCapabilities(tag).includes('thinking'));
    const candidates = nonThinking.length ? nonThinking : completionModels;
    for (const preferredName of preferredModelNames) {
        const match = candidates.find(tag => modelName(tag) === preferredName);
        if (match) return modelName(match);
    }
    return modelName(candidates[0] ?? {});
};

// --- Schema Section ---
export const samplePayloadForTarget = (target: ShaperAiTarget): Record<string, string> => {
    if (target === 'room-name') return { name: 'a Mossy Hollow', preposition: 'in' };
    if (target === 'door-description') return { exitDescription: 'A weathered door waits in the stonework.' };
    return {
        description: [
            'Grass spreads in a rough carpet across the open field, broken by',
            'patches of bare earth and low weeds. The land rolls gently here,',
            'leaving the sky broad overhead and the air clear around you.'
        ].join('\n')
    };
};

const responseSchemaForTarget = (target: ShaperAiTarget): Record<string, unknown> => {
    if (target === 'room-name') {
        return {
            type: 'OBJECT',
            properties: { name: { type: 'STRING' }, preposition: { type: 'STRING' } },
            required: ['name', 'preposition']
        };
    }
    if (target === 'door-description') {
        return {
            type: 'OBJECT',
            properties: { exitDescription: { type: 'STRING' } },
            required: ['exitDescription']
        };
    }
    return {
        type: 'OBJECT',
        properties: { description: { type: 'STRING' } },
        required: ['description']
    };
};

// --- Prompt Section ---
export const normalizeShaperAiTarget = (target: unknown): ShaperAiTarget => {
    if (target === 'room-name' || target === 'door-description') return target;
    return 'room-description';
};

export const buildShaperAiPromptSpec = (
    targetValue: unknown,
    context: unknown
): ShaperAiPromptSpec => {
    const target = normalizeShaperAiTarget(targetValue);
    const samplePayload = samplePayloadForTarget(target);
    const shared = `${BUILDER_GUIDE_RULES}

${LORE_RULES}

Room context:
${contextBlock(context, target)}

Respond only with JSON matching this example payload:
${JSON.stringify(samplePayload, null, 2)}`;

    if (target === 'room-name') {
        return {
            target,
            samplePayload,
            responseSchema: responseSchemaForTarget(target),
            prompt: `Suggest a new MUME room name and matching preposition.
If currentNameToReplace is present, do not return that exact name.
${shared}`
        };
    }
    if (target === 'door-description') {
        return {
            target,
            samplePayload,
            responseSchema: responseSchemaForTarget(target),
            prompt: `Write a concise MUME exit or door description for the specified direction.
${shared}`
        };
    }
    return {
        target,
        samplePayload,
        responseSchema: responseSchemaForTarget(target),
        prompt: `Write a MUME room description that follows the builder guide.
${shared}`
    };
};

// --- Response Section ---
export const textFromGeneratedPayload = (value: unknown, keys: string[]): string => {
    if (!value || typeof value !== 'object') return '';
    const record = value as Record<string, unknown>;
    for (const key of keys) {
        const field = record[key];
        if (typeof field === 'string' && field.trim()) return field;
    }
    const nested = record.properties;
    if (nested && typeof nested === 'object') return textFromGeneratedPayload(nested, keys);
    return '';
};
