import { useState, useRef } from 'react';
import { ShopItem } from '../types';

export function useShopHandler() {
    const [isShopListingActive, _setIsShopListingActive] = useState(false);
    const isShopListingActiveRef = useRef(false);
    const setIsShopListingActive = (val: boolean) => {
        isShopListingActiveRef.current = val;
        _setIsShopListingActive(val);
    };
    const [isUiRequested, setIsUiRequested] = useState(false);
    const [shopItems, setShopItems] = useState<ShopItem[]>([]);
    const logBuffer = useRef<string[]>([]);
    const currentItems = useRef<ShopItem[]>([]);

    const pendingDetailItemIdRef = useRef<string | null>(null);
    const detailBuffer = useRef<string[]>([]);

    const parseShopLine = (text: string): ShopItem | null => {
        const lower = text.toLowerCase();
        
        // Detect start of shop listing
        if (lower.includes('you can buy:') || lower.includes('items matching') || lower.includes('for sale:')) {
            if (!isShopListingActiveRef.current) {
                setIsShopListingActive(true);
                logBuffer.current = [text];
                currentItems.current = [];
            } else {
                logBuffer.current.push(text);
            }
            return null;
        }

        if (!isShopListingActiveRef.current) return null;

        logBuffer.current.push(text);

        // Pattern examples:
        // "270. fourteen rapiers (flawless, new) up to seventeen silver and five copper."
        // "  1. a small glass vial (standard) for one silver and five copper."
        const itemRegex = /(?:\*\*\*.*?\*\*\* )?\s*(\d+)\.\s+(.*?)(?:\s+\((.*?)\))?\s+(?:up to|for)?\s+(.*)\.?$/i;
        const match = text.match(itemRegex);

        if (match) {
            const [_, id, fullName, rawCondition, price] = match;

            const nameParts = fullName.trim().split(' ');
            const numberWords = [
                'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
                'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty',
                'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'
            ];

            let sanitizedName = fullName.trim();
            const firstWord = nameParts[0].toLowerCase();
            const isNumberWord = numberWords.some(num =>
                firstWord === num || firstWord.startsWith(num + '-')
            );

            if (nameParts.length > 1 && isNumberWord) {
                sanitizedName = nameParts.slice(1).join(' ');
            }

            const shortName = nameParts.length > 1
                ? nameParts.slice(-1)[0]
                : sanitizedName;

            let condition = undefined;
            let age = undefined;
            if (rawCondition) {
                const parts = rawCondition.split(',').map(p => p.trim());
                condition = parts[0];
                if (parts.length > 1) age = parts[1];
            }

            const item: ShopItem = {
                id,
                name: sanitizedName,
                shortName: shortName,
                description: rawCondition ? `${sanitizedName} (${rawCondition.trim()})` : sanitizedName,
                condition,
                age,
                price: price.trim().replace(/\.$/, '')
            };
            currentItems.current.push(item);
            return item;
        }

        return null;
    };

    const parseShopDetailLine = (text: string) => {
        detailBuffer.current.push(text);
    };

    const finalizeShopDetail = (setPopoverState?: (state: any) => void) => {
        const itemId = pendingDetailItemIdRef.current;
        const details = detailBuffer.current.join('\n');
        
        console.log('[ShopHandler] Finalizing Detail Capture:', { itemId, detailLength: details.length });

        if (itemId && setPopoverState) {
            setPopoverState((prev: any) => {
                if (!prev || prev.type !== 'shop-card' || !prev.shopItems) return prev;
                return {
                    ...prev,
                    shopItems: prev.shopItems.map((item: any) => 
                        item.id === itemId ? { ...item, details } : item
                    )
                };
            });
        }
        
        pendingDetailItemIdRef.current = null;
        detailBuffer.current = [];
    };

    const finalizeShop = (
        addMessage?: (type: any, text: string, combatOverride?: boolean, mid?: string, isRoomName?: boolean, precalculated?: { textOnly: string, lower: string }, shopItem?: any) => void,
        setPopoverState?: (state: any) => void
    ) => {
        if (!isShopListingActiveRef.current) return null;

        const items = [...currentItems.current];
        const result = {
            items,
            raw: logBuffer.current.join('\n')
        };

        if (isUiRequested) {
            setShopItems(items);
        }

        if (setPopoverState && items.length > 0) {
            setPopoverState({
                type: 'shop-card',
                x: window.innerWidth / 2 - 150,
                y: window.innerHeight / 2 - 200,
                setId: 'shop',
                shopItems: items
            });
        } else if (addMessage && items.length > 0) {
            const header = logBuffer.current[0] ?? '';
            setTimeout(() => {
                if (header) addMessage('game', header, undefined, `shop-hdr-${Date.now()}`);
                items.forEach((item, idx) => {
                    addMessage('shop-item', item.description, undefined, `shop-${item.id}-${Date.now()}-${idx}`, false, undefined, item);
                });
            }, 10);
        }

        setIsShopListingActive(false);
        setIsUiRequested(false);
        currentItems.current = [];
        logBuffer.current = [];

        return result;
    };

    return {
        isShopListingActive,
        setIsShopListingActive,
        isUiRequested,
        setIsUiRequested,
        shopItems,
        setShopItems,
        parseShopLine,
        finalizeShop,
        pendingDetailItemIdRef,
        parseShopDetailLine,
        finalizeShopDetail
    };
}
