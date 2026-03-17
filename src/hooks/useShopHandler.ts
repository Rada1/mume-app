import { useState, useRef } from 'react';
import { ShopItem } from '../types';

export function useShopHandler() {
    const [isShopListingActive, setIsShopListingActive] = useState(false);
    const [isUiRequested, setIsUiRequested] = useState(false);
    const [shopItems, setShopItems] = useState<ShopItem[]>([]);
    const logBuffer = useRef<string[]>([]);
    const currentItems = useRef<ShopItem[]>([]);

    const parseShopLine = (text: string): ShopItem | null => {
        const lower = text.toLowerCase();
        
        // Detect start of shop listing
        if (lower.includes('you can buy:') || lower.includes('items matching') || lower.includes('for sale:')) {
            setIsShopListingActive(true);
            logBuffer.current = [text];
            currentItems.current = [];
            return null;
        }

        if (!isShopListingActive) return null;

        logBuffer.current.push(text);

        // Pattern examples:
        // "270. fourteen rapiers (flawless, new) up to seventeen silver and five copper."
        // "  1. a small glass vial (standard) for one silver and five copper."
        const itemRegex = /^\s*(\d+)\.\s+(.*?)(?:\s+\((.*?)\))?\s+(?:up to|for)\s+(.*)\.?$/i;
        const match = text.match(itemRegex);

        if (match) {
            const [_, id, fullName, condition, price] = match;

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

            const item: ShopItem = {
                id,
                name: sanitizedName,
                shortName: shortName,
                description: condition ? `${sanitizedName} (${condition.trim()})` : sanitizedName,
                condition: condition ? condition.trim() : 'standard',
                price: price.trim().replace(/\.$/, '')
            };
            currentItems.current.push(item);
            return item;
        }

        return null;
    };

    const finalizeShop = (addMessage?: (type: any, text: string, combatOverride?: boolean, mid?: string, isRoomName?: boolean, precalculated?: { textOnly: string, lower: string }, shopItem?: any) => void) => {
        if (!isShopListingActive) return null;

        const items = [...currentItems.current];
        const result = {
            items,
            raw: logBuffer.current.join('\n')
        };

        if (isUiRequested) {
            setShopItems(items);
        }

        if (addMessage && items.length > 0) {
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
        finalizeShop
    };
}
