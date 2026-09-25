/**
 * @file useRotatingCommandSuggestion.ts
 * @description Cycles room-aware command examples for an empty command input.
 */

import { useEffect, useMemo, useState } from 'react';
import { useRoomStore } from '../stores/useRoomStore';

// --- Logic Section ---

export const useRotatingCommandSuggestion = (enabled: boolean): string => {
    const chars = useRoomStore(state => state.chars);
    const items = useRoomStore(state => state.items);
    const rawExits = useRoomStore(state => state.rawExits);
    const [index, setIndex] = useState(0);

    const commands = useMemo(() => {
        const list: string[] = [];

        Object.values(chars || {}).forEach(char => {
            const keyword = char.keyword || char.name?.split(' ')[0]?.toLowerCase();
            if (!keyword) return;
            list.push(`examine ${keyword}`);
            if (char.type === 'pc' || char.pc === 1) {
                list.push(`smile ${keyword}`, `nod ${keyword}`, `wave ${keyword}`, `bow ${keyword}`, `wink ${keyword}`);
            }
        });

        Object.entries(rawExits || {}).forEach(([direction, value]) => {
            const exit = value as { closed?: boolean; hasDoor?: boolean; name?: string } | null;
            if (exit?.closed) {
                list.push(`open ${exit.name || 'door'}`, `open ${direction}`);
            } else if (exit?.hasDoor) {
                list.push(`close ${exit.name || 'door'}`);
            }
        });

        items.forEach(item => {
            const keyword = item.keyword || item.name?.split(' ')[0]?.toLowerCase();
            if (keyword) list.push(`get ${keyword}`, `examine ${keyword}`);
        });

        list.push('look', 'score', 'where', 'who', 'inventory', 'equipment', 'practice', 'flee');
        return [...new Set(list)].filter(command => !/^(kill|hit)/i.test(command));
    }, [chars, items, rawExits]);

    useEffect(() => {
        if (!enabled) return;
        const interval = window.setInterval(() => {
            setIndex(previous => (previous + 1) % commands.length);
        }, 4000);
        return () => window.clearInterval(interval);
    }, [enabled, commands]);

    return commands[index % commands.length] || 'look';
};
