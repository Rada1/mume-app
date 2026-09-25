/** Tracks the ordered, separate response lines from compact `info %` commands. */
export type CharacterInfoRefreshField = 'citizenships' | 'age' | 'height' | 'warFame' | 'gold' | 'wimpy';

let pendingFields: CharacterInfoRefreshField[] = [];
let expiresAt = 0;
let notifyOnConsume = false;
const consumeListeners = new Set<(field: CharacterInfoRefreshField) => void>();

export const beginCharacterInfoRefresh = (
    fields: CharacterInfoRefreshField[] = ['citizenships', 'age', 'height', 'warFame', 'gold', 'wimpy'],
    options: { notifyOnConsume?: boolean } = {}
) => {
    pendingFields = fields;
    expiresAt = Date.now() + 10_000;
    notifyOnConsume = options.notifyOnConsume === true;
};

export const subscribeToCharacterInfoRefresh = (listener: (field: CharacterInfoRefreshField) => void) => {
    consumeListeners.add(listener);
    return () => consumeListeners.delete(listener);
};

export const hasPendingCharacterInfoRefresh = (now = Date.now()) =>
    pendingFields.length > 0 && now <= expiresAt;

const consumeField = () => {
    const field = pendingFields.shift();
    if (field && notifyOnConsume) consumeListeners.forEach(listener => listener(field));
    if (!pendingFields.length) notifyOnConsume = false;
    return field;
};

export const consumeCharacterInfoRefreshLine = (content: string, now = Date.now()): Partial<{
    citizenships: number;
    age: string;
    height: string;
    warFame: number;
    gold: number;
    wimpy: number;
}> | null => {
    if (now > expiresAt) pendingFields = [];
    const field = pendingFields[0];
    if (!field) return null;

    const value = content.trim();
    if (field === 'citizenships') {
        const tokens = value.split(/\s+/).filter(Boolean);
        if (!tokens.length || (!/^(?:none|no|nil)$/i.test(value) && !tokens.every(token => /^\p{Lu}[\p{L}'-]*$/u.test(token)))) return null;
        consumeField();
        return { citizenships: /^(?:none|no|nil)$/i.test(value) ? 0 : tokens.length };
    }

    if (field === 'height') {
        // MUME prints a human-readable measurement. Do not accept unrelated
        // login/quest text while the response is pending.
        if (!/\b(?:feet|foot|inches?|centimet(?:re|er)s?)\b/i.test(value)) return null;
        consumeField();
        return { height: value };
    }

    if (field === 'warFame' && /^unknown at war$/i.test(value)) {
        consumeField();
        return { warFame: 0 };
    }

    const numericValue = value.replace(/,/g, '');
    if (!/^-?\d+(?:\.\d+)?$/.test(numericValue)) return null;
    consumeField();
    if (field === 'age') return { age: value };
    if (field === 'gold') return { gold: Number(numericValue) };
    if (field === 'wimpy') return { wimpy: Number(numericValue) };
    return { warFame: Number(numericValue) };
};

/** Test-only reset for the module-level request sequence. */
export const resetCharacterInfoRefreshTracker = () => {
    pendingFields = [];
    expiresAt = 0;
    notifyOnConsume = false;
    consumeListeners.clear();
};
