import { useCallback, RefObject } from 'react';
import { CustomButton } from '../types';
import { pluralizeMumeSubject } from '../utils/gameUtils';

export function useMessageHighlighter(
    target: string | null,
    buttonsRef: RefObject<CustomButton[]>,
    roomPlayers: string[],
    roomNpcs: string[],
    characterName: string | null,
    roomItems: string[]
) {
    const processMessageHtml = useCallback((html: string, mid?: string) => {
        let newHtml = html;

        const safeHighlight = (currentHtml: string, patternStr: string, replacer: (match: string) => string) => {
            try {
                const pattern = patternStr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                // Match tags OR the word pattern. Tags are group 1, pattern is group 2.
                const regex = new RegExp(`(<[^>]+>)|(\\b${pattern}\\b)`, 'gi');
                return currentHtml.replace(regex, (m, g1, g2) => {
                    if (g1) return g1; // Return tag unchanged
                    return replacer(g2);
                });
            } catch (e) { return currentHtml; }
        };

        // 1. Highlight Current Target (Top priority)
        if (target) {
            newHtml = safeHighlight(newHtml, target, (m) =>
                `<span class="inline-btn target-highlight" data-id="target-hl" data-mid="${mid || ''}" data-cmd="target" data-context="${m}" data-action="menu">${m}</span>`
            );
        }

        // 2. Inline Highlight Buttons
        if (buttonsRef.current) {
            buttonsRef.current.filter(b => b.display === 'inline' && b.trigger?.enabled && b.trigger.pattern).forEach(b => {
                newHtml = safeHighlight(newHtml, b.trigger!.pattern!, (m) => {
                    return `<span class="inline-btn" data-id="${b.id}" data-mid="${mid || ''}" data-cmd="${b.command}" data-context="${m}" data-action="${b.actionType || 'command'}" data-spit="${b.trigger?.spit ? 'true' : 'false'}" style="background-color: ${b.style.backgroundColor}">${m}</span>`;
                });
            });
        }

        // 3. Room Occupants (Players - PCs)
        const pcMap = new Map<string, string>();
        [...roomPlayers].filter(name => name !== characterName).forEach(name => {
            pcMap.set(name, name);
            const plural = pluralizeMumeSubject(name);
            if (plural !== name) pcMap.set(plural, name);
        });

        Array.from(pcMap.keys()).sort((a, b) => b.length - a.length)
            .forEach(matchText => {
                const originalName = pcMap.get(matchText)!;
                newHtml = safeHighlight(newHtml, matchText, (m) => {
                    return `<span class="inline-btn auto-occupant pc-highlighter" data-id="auto-${originalName}" data-mid="${mid || ''}" data-cmd="inlineplayer" data-context="${originalName}" data-action="menu" style="background-color: rgba(100, 100, 255, 0.3); border-bottom: 1px dashed rgba(255,255,255,0.4)">${m}</span>`;
                });
            });

        // 4. Room NPCs (Mobs)
        const npcMap = new Map<string, string>();
        const pcNames = new Set(Array.from(pcMap.keys()).map(k => k.toLowerCase()));
        if (characterName) pcNames.add(characterName.toLowerCase());

        roomNpcs.forEach(originalName => {
            const lowerName = originalName.toLowerCase();
            if (pcNames.has(lowerName)) return;

            const stripped = originalName.replace(/^(A|An|The)\s+/i, '');
            const variants = [originalName, stripped];
            variants.forEach(v => {
                const lowerV = v.toLowerCase();
                if (pcNames.has(lowerV)) return;

                npcMap.set(v, originalName);
                const plural = pluralizeMumeSubject(v);
                if (plural !== v) npcMap.set(plural, originalName);
            });
        });

        Array.from(npcMap.keys()).sort((a, b) => b.length - a.length)
            .forEach(matchText => {
                const originalName = npcMap.get(matchText)!;
                newHtml = safeHighlight(newHtml, matchText, (m) => {
                    return `<span class="inline-btn auto-npc npc-highlighter" data-id="auto-npc-${originalName}" data-mid="${mid || ''}" data-cmd="inlinenpc" data-context="${originalName}" data-action="menu" style="background-color: rgba(255, 100, 100, 0.25); border-bottom: 1px dotted rgba(255,255,255,0.4)">${m}</span>`;
                });
            });

        // 5. Room Items
        const sortedItems = [...roomItems].sort((a, b) => b.length - a.length);
        sortedItems.forEach(name => {
            newHtml = safeHighlight(newHtml, name, (m) => {
                return `<span class="inline-btn auto-item" data-id="auto-item-${name}" data-mid="${mid || ''}" data-cmd="selection" data-context="${m}" data-action="menu" style="background-color: rgba(100, 255, 100, 0.15); border-bottom: 1px dotted rgba(255,255,255,0.3)">${m}</span>`;
            });
        });

        return newHtml;
    }, [target, buttonsRef, roomPlayers, roomNpcs, characterName, roomItems]);

    return { processMessageHtml };
}
