/** @file useShopListParser.ts — Captures shop stock while respecting silent panel requests. */

import { useCallback, useRef } from 'react';
import type { ShopItem, ShopVariant } from '../../types';
import type { UseGameParserDeps } from './types';
import type { useCaptureParser } from './useCaptureParser';
import { useCommandShopStore } from '../../stores/useCommandShopStore';
import { useUIStore } from '../../stores/useUIStore';
import { usePanelDataStore } from '../../stores/usePanelDataStore';
import { parseShopVariant } from '../../utils/shopVariantParser';

// --- Logic Section ---
export const useShopListParser = (
    capture: Pick<ReturnType<typeof useCaptureParser>, 'isPendingSilent' | 'clearPendingFlags'>,
    deps: Pick<UseGameParserDeps, 'roomNpcs' | 'registerEntity'>
) => {
    const stock = useRef({ active: false, isSilent: false, items: [] as ShopItem[] });
    const roomKey = useRef(useCommandShopStore.getState().roomKey);
    const variants = useRef({ items: [] as ShopVariant[], line: null as string | null, isSilent: null as boolean | null });

    return useCallback((text: string, isBoundary: boolean): boolean => {
        const currentRoom = useCommandShopStore.getState().roomKey;
        if (roomKey.current !== currentRoom) {
            roomKey.current = currentRoom;
            stock.current = { active: false, isSilent: false, items: [] };
            variants.current = { items: [], line: null, isSilent: null };
        }
        const ui = useUIStore.getState();
        if (isBoundary && usePanelDataStore.getState().isActive('shop')) usePanelDataStore.getState().complete('shop');
        const stockRow = text.match(/^\s*(\d+)\.\s+(.+?)\s+(?:up to|for)\s+(.+?)(?:\s+<([^>]+)>)?\s*\.?\s*$/);
        const separator = /^\s*-{3,}\s*$/.test(text);
        const priceContinuation = /^\s*and\s+.+\b(?:lauren|celeb|busc|gold|silver|copper)\.?\s*$/i.test(text)
            || /^\s{2,}.+\b(?:lauren|celeb|busc|gold|silver|copper)\.?\s*$/i.test(text);
        const speaker = text.match(/^([A-Z][a-zA-Z\s\'-]+?)\s+(?:says|tells you|asks|whispers|says\s+to\s+you),?\s+['"]?(you can buy:|items? (?:for sale|matching)|\d+ items? for sale)/i);
        const startsStock = /^you can buy:|^items? (?:for sale|matching)|^\d+ items? for sale/i.test(text) || Boolean(speaker);
        let suppress = false;
        const variantProduct = ui.shopVariantRequest;
        if (variantProduct !== null) {
            const candidate = variants.current.line ? `${variants.current.line} ${text.trim()}` : text;
            const variant = parseShopVariant(candidate);
            const heading = /^\s*\d+\.\s+.+:\s*$/.test(text);
            if (variant || heading || startsStock) {
                if (variants.current.isSilent === null) {
                    variants.current.isSilent = capture.isPendingSilent();
                    capture.clearPendingFlags();
                }
                suppress = variants.current.isSilent;
            }
            if (variant) {
                if (/\band$/i.test(variant.price)) variants.current.line = candidate;
                else {
                    variants.current.items.push(variant);
                    variants.current.line = null;
                }
            }
            if (!isBoundary && (separator || priceContinuation || text.trim() === '')) suppress ||= Boolean(variants.current.isSilent);
            if (isBoundary || (text.trim() === '' && variants.current.items.length > 0)) {
                suppress ||= !isBoundary && Boolean(variants.current.isSilent);
                ui.setShopVariants(variantProduct, [...variants.current.items]);
                if (isBoundary) {
                    ui.setShopVariantRequest(null);
                    variants.current = { items: [], line: null, isSilent: null };
                }
            }
        }
        if (variantProduct === null && (startsStock || (!stock.current.active && stockRow && capture.isPendingSilent()))) {
            const keeperName = speaker?.[1].trim();
            if (keeperName) {
                const keeper = deps.roomNpcs?.find(npc => npc.name?.toLowerCase() === keeperName.toLowerCase());
                if (keeper) deps.registerEntity(`roomchars:${keeper.id}`, keeper.name, 'room', 'shopkeeper');
                ui.setShopkeeperName(keeperName);
            }
            stock.current = { active: true, items: [], isSilent: capture.isPendingSilent() };
            capture.clearPendingFlags();
            suppress ||= stock.current.isSilent;
        }
        if (stock.current.active) {
            if (!isBoundary && text.trim() === '') suppress ||= stock.current.isSilent;
            if (isBoundary || (text.trim() === '' && stock.current.items.length > 0)) {
                if (stock.current.items.length > 0) ui.setShopItems([...stock.current.items]);
                suppress ||= !isBoundary && stock.current.isSilent;
                if (isBoundary || !stock.current.isSilent) stock.current = { active: false, isSilent: false, items: [] };
            } else {
                if (stockRow) {
                    stock.current.items.push({ num: Number(stockRow[1]), name: stockRow[2].trim(), price: stockRow[3].trim(), vnum: stockRow[4] });
                    suppress ||= stock.current.isSilent;
                }
                if (separator || priceContinuation) {
                    suppress ||= stock.current.isSilent;
                    const previous = stock.current.items.at(-1);
                    if (priceContinuation && previous && /(?:\band|,)\s*$/i.test(previous.price)) {
                        const continuation = /\band\s*$/i.test(previous.price) ? text.trim().replace(/^and\s+/i, '') : text.trim();
                        previous.price = `${previous.price} ${continuation}`;
                    }
                }
            }
        }
        if (ui.isShopOpen) {
            const money = text.match(/^([\d,]+\s+gold coins?(?:,\s+[\d,]+\s+silver penn(?:ies|y))?(?:(?:,?\s+and\s+|,\s+)[\d,]+\s+copper penn(?:ies|y))?)\s*\.?\s*$/i);
            if (money) ui.setShopBalance(money[1].trim());
        }
        return suppress;
    }, [capture, deps.roomNpcs, deps.registerEntity]);
};
