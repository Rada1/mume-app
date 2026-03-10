import { useState, useRef } from 'react';
import { ShopItem } from '../types';

export function useShopHandler() {
    const [isShopListingActive, setIsShopListingActive] = useState(false);
    const shopItemsRef = useRef<ShopItem[]>([]);

    const parseShopLine = (text: string): ShopItem | null => {
        const lower = text.toLowerCase();
        // Detect start of shop listing
        if (lower.includes('you can buy:') || lower.includes('items matching') || lower.includes('for sale:')) {
            setIsShopListingActive(true);
            shopItemsRef.current = [];
            return null;
        }

        // Pattern: "270. fourteen rapiers (flawless, new) up to seventeen silver and five copper."
        // ID: 270
        // Label: fourteen rapiers (flawless, new)
        // Price: seventeen silver and five copper.
        // Making condition optional
        const itemRegex = /^(\d+)\.\s+(.*?)(?:\s+\((.*?)\))?\s+up to\s+(.*)\.?$/i;
        const match = text.match(itemRegex);

        if (match) {
            // Auto-activate if we see a valid item line even if we missed the header
            if (!isShopListingActive) {
                setIsShopListingActive(true);
            }

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
            return item;
        }

        return null;
    };

    return {
        isShopListingActive,
        setIsShopListingActive,
        parseShopLine
    };
}
