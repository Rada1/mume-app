/** @file inlineActionColors.ts — Resolves category and trait colors for inline actions. */

// --- Logic Section ---
import type { EntityKind, InlineCategoryConfig } from '../types';
import { LinkedColorTheme, toThemeLinkedColor } from './themeLinkedColors';
import {
    CATEGORY_KIND_MAP,
    EntityColorMap,
    InlineActionConfigRecord,
    getCategoryConfig,
    getKindForCategory,
    getTraitConfig,
    toCategoryId,
    toTraitId
} from './inlineActionModel';

/** Resolves custom, per-kind, then built-in category colors. */
export const getInlineGlowColor = (
    id: string | null | undefined,
    configs: InlineActionConfigRecord[] = [],
    entityColors: EntityColorMap = {},
    theme: LinkedColorTheme = 'dark'
): string | null => {
    const themeColor = (color: string | null | undefined): string | null => toThemeLinkedColor(color, theme);
    if (!id) return null;
    const category = getCategoryConfig(id);
    const trait = getTraitConfig(id);
    const canonicalId = category?.id || trait?.id || toCategoryId(id) || toTraitId(id) || id;
    const override = configs.find(config => {
        const configId = toCategoryId(config.id) || toTraitId(config.id) || config.id;
        return configId === canonicalId && !!toCategoryId(config.id) && 'color' in config && !!config.color;
    });
    if (override && 'color' in override && override.color) return themeColor(override.color);
    if (canonicalId === 'cat-ally' && entityColors.player) return themeColor(entityColors.player);
    if (canonicalId === 'cat-mount' && category?.color) return themeColor(category.color);
    const entityKind: EntityKind | undefined = CATEGORY_KIND_MAP[canonicalId] ?? trait?.kind ?? undefined;
    if (entityKind && entityColors[entityKind]) return themeColor(entityColors[entityKind]);
    return category?.color ? themeColor(category.color) : null;
};

export const getCategoryColorWithOverrides = (
    id: string | null | undefined,
    configs: InlineActionConfigRecord[] = [],
    fallback: string,
    entityColors: EntityColorMap = {},
    theme: LinkedColorTheme = 'dark'
): string => getInlineGlowColor(id, configs, entityColors, theme) || (toThemeLinkedColor(fallback, theme) || fallback);

export const upsertCategoryColorOverride = (
    id: string,
    kind: EntityKind,
    color: string,
    configs: InlineCategoryConfig[]
): InlineCategoryConfig[] => {
    const category = getCategoryConfig(id);
    const categoryId = category?.id || toCategoryId(id) || id;
    const existing = configs.find(config => (toCategoryId(config.id) || config.id) === categoryId);
    const override: InlineCategoryConfig = {
        ...(existing || {
            id: category?.id || categoryId,
            kind: kind || getKindForCategory(categoryId) || 'object',
            keywords: []
        }),
        color
    };
    return existing
        ? configs.map(config => config === existing ? override : config)
        : [...configs, override];
};
