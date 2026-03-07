import { useCallback, RefObject, useRef } from 'react';
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
    const cacheRef = useRef<Map<string, { html: string, deps: string }>>(new Map());

    const depsHash = JSON.stringify([target, roomPlayers, roomNpcs, roomItems, characterName]);

    const processMessageHtml = useCallback((html: string, mid?: string, isRoomName?: boolean) => {
        if (!mid) return html;

        const cached = cacheRef.current.get(mid);
        if (cached && cached.deps === depsHash) {
            return cached.html;
        }

        let newHtml = html;

        // Use a more robust pattern matching strategy that avoids clobbering existing tags
        const safeHighlight = (currentHtml: string, patternStr: string, replacer: (match: string) => string) => {
            try {
                // Escape regex specials
                let escaped = patternStr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                // Replace literal spaces with flexible whitespace match to handle MUD formatting
                escaped = escaped.replace(/\s+/g, '\\s+');

                // The regex matches EITHER an HTML tag OR the pattern if it's flanked by non-word boundaries
                const regex = new RegExp(`(<[^>]+>)|(\\b${escaped}\\b)`, 'gi');

                return currentHtml.replace(regex, (wholeMatch, tag, patternMatch) => {
                    if (tag) return tag; // Skip tags
                    return replacer(patternMatch);
                });
            } catch (e) { return currentHtml; }
        };

        // Gather all highlight candidates
        interface Candidate {
            pattern: string;
            replacer: (m: string) => string;
            length: number;
        }
        const candidates: Candidate[] = [];

        // 1. Current Target
        if (target) {
            candidates.push({
                pattern: target,
                replacer: (m) => `<span class="inline-btn target-highlight" draggable="true" data-id="target-hl" data-mid="${mid}" data-cmd="target" data-context="${m}" data-action="menu">${m}</span>`,
                length: target.length
            });
        }

        // 2. Buttons
            buttonsRef.current.filter(b => b.display === 'inline' && b.trigger?.enabled && b.trigger.pattern).forEach(b => {
                candidates.push({
                    pattern: b.trigger!.pattern!,
                    replacer: (m) => `<span class="inline-btn" draggable="true" data-id="${b.id}" data-mid="${mid}" data-cmd="${b.command}" data-context="${m}" data-icon="${b.icon || ''}" data-action="${b.actionType || 'command'}" data-spit="${b.trigger?.spit ? 'true' : 'false'}" data-swipes='${b.swipeCommands ? JSON.stringify(b.swipeCommands).replace(/'/g, "&apos;") : ""}' data-swipe-actions='${b.swipeActionTypes ? JSON.stringify(b.swipeActionTypes).replace(/'/g, "&apos;") : ""}' style="background-color: ${b.style.backgroundColor}">${m}</span>`,
                    length: b.trigger!.pattern!.length
                });
            });

        if (!isRoomName) {
            // 3. PCs
            const pcNames = new Set([...roomPlayers].filter(name => name !== characterName));
            pcNames.forEach(name => {
                const patterns = [name, pluralizeMumeSubject(name)].filter(Boolean);
                patterns.forEach(p => {
                    candidates.push({
                        pattern: p,
                        replacer: (m) => `<span class="inline-btn auto-occupant pc-highlighter" draggable="true" data-id="auto-${name}" data-mid="${mid}" data-cmd="inlineplayer" data-context="${name}" data-action="menu" style="background-color: rgba(100, 100, 255, 0.3); border-bottom: 1px dashed rgba(255,255,255,0.4)">${m}</span>`,
                        length: p.length
                    });
                });
            });

            // 4. NPCs
            const npcNames = new Set(roomNpcs);
            const pSet = new Set(Array.from(pcNames).map(p => p.toLowerCase()));
            if (characterName) pSet.add(characterName.toLowerCase());

            npcNames.forEach(originalName => {
                const lowerName = originalName.toLowerCase();
                if (pSet.has(lowerName)) return;

                const stripped = originalName.replace(/^(A|An|The)\s+/i, '');
                const patterns = [originalName, stripped, pluralizeMumeSubject(originalName), pluralizeMumeSubject(stripped)].filter(Boolean);

                patterns.forEach(p => {
                    candidates.push({
                        pattern: p,
                        replacer: (m) => `<span class="inline-btn auto-npc npc-highlighter" draggable="true" data-id="auto-npc-${originalName}" data-mid="${mid}" data-cmd="inlinenpc" data-context="${originalName}" data-action="menu" style="background-color: rgba(255, 100, 100, 0.25); border-bottom: 1px dotted rgba(255,255,255,0.4)">${m}</span>`,
                        length: p.length
                    });
                });
            });

            // 5. Items
            roomItems.forEach(name => {
                candidates.push({
                    pattern: name,
                    replacer: (m) => `<span class="inline-btn auto-item" draggable="true" data-id="auto-item-${name}" data-mid="${mid}" data-cmd="selection" data-context="${m}" data-action="menu" style="background-color: rgba(100, 255, 100, 0.15); border-bottom: 1px dotted rgba(255,255,255,0.3)">${m}</span>`,
                    length: name.length
                });
            });
        }

        // Apply candidates: sort by length descending to ensure "horse of the Rohirrim" matches before "horse"
        // and "Aragorn's horse" before "Aragorn"
        candidates
            .sort((a, b) => b.length - a.length)
            .forEach(c => {
                newHtml = safeHighlight(newHtml, c.pattern, c.replacer);
            });

        cacheRef.current.set(mid, { html: newHtml, deps: depsHash });
        if (cacheRef.current.size > 1000) {
            const firstKey = cacheRef.current.keys().next().value;
            if (firstKey !== undefined) cacheRef.current.delete(firstKey);
        }

        return newHtml;
    }, [target, buttonsRef, roomPlayers, roomNpcs, characterName, roomItems]);

    return { processMessageHtml };
}
