import { useCallback, RefObject } from 'react';
import { CustomButton } from '../types';

export function useMessageHighlighter(
    target: string | null,
    buttonsRef: RefObject<CustomButton[]>,
    roomPlayers: string[],
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

        // 3. Room Occupants (Auto-acquired highlights)
        // Sort by length longest-first so "Morgundul orc-guard" matches before "orc-guard"
        const filteredPlayers = [...roomPlayers].filter(name => name !== characterName);
        filteredPlayers.sort((a, b) => b.length - a.length)
            .forEach(name => {
                newHtml = safeHighlight(newHtml, name, (m) => {
                    return `<span class="inline-btn auto-occupant" data-id="auto-${name}" data-mid="${mid || ''}" data-cmd="inlineplayer" data-context="${m}" data-action="menu" style="background-color: rgba(100, 100, 255, 0.3); border-bottom: 1px dashed rgba(255,255,255,0.4)">${m}</span>`;
                });
            });

        // 4. Room Items
        const sortedItems = [...roomItems].sort((a, b) => b.length - a.length);
        sortedItems.forEach(name => {
            newHtml = safeHighlight(newHtml, name, (m) => {
                return `<span class="inline-btn auto-item" data-id="auto-item-${name}" data-mid="${mid || ''}" data-cmd="selection" data-context="${m}" data-action="menu" style="background-color: rgba(100, 255, 100, 0.15); border-bottom: 1px dotted rgba(255,255,255,0.3)">${m}</span>`;
            });
        });

        return newHtml;
    }, [target, buttonsRef, roomPlayers, characterName, roomItems]);

    return { processMessageHtml };
}
