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
    const cacheRef = useRef<Map<string, { html: string, htmlRaw: string, deps: string }>>(new Map());

    const buttonsHash = JSON.stringify(buttonsRef.current?.map(b => ({ id: b.id, pattern: b.trigger?.pattern, enabled: b.trigger?.enabled })) || []);
    const depsHash = JSON.stringify([target, roomPlayers, roomNpcs, roomItems, characterName, buttonsHash]);

    const processMessageHtml = useCallback((html: string, mid?: string, isRoomName?: boolean) => {
        if (!mid) return html;

        const cached = cacheRef.current.get(mid);
        if (cached && cached.deps === depsHash && cached.htmlRaw === html) {
            return cached.html;
        }

        let newHtml = html;
        const originalHtml = html;

        // Use a more robust pattern matching strategy that avoids clobbering existing tags
        const safeHighlight = (currentHtml: string, patternStr: string, isRegex: boolean, replacer: (match: string, matchObj: RegExpExecArray | null) => string) => {
            try {
                let regexSource: string;
                if (isRegex) {
                    regexSource = `(<[^>]+>)|(${patternStr})`;
                } else {
                    // Escape regex specials
                    let escaped = patternStr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                    // Replace literal spaces with flexible whitespace match to handle MUD formatting
                    escaped = escaped.replace(/\s+/g, '\\s+');
                    regexSource = `(<[^>]+>)|(\\b${escaped}\\b)`;
                }

                const regex = new RegExp(regexSource, 'gi');

                return currentHtml.replace(regex, (wholeMatch, tag, ...args) => {
                    if (tag) return tag; // Skip tags
                    // With global regex and capture groups: wholeMatch, tag, patternMatch, [additional groups], offset, string
                    // But our regex is EITHER (tag) OR (pattern).
                    // So if it's not a tag, patternMatch is args[0].
                    // But if patternStr has its own groups, they will be in args[1], args[2]...
                    // Let's use a simpler approach: if it matched our pattern group, re-run exec to get captures
                    const matchResult = isRegex ? new RegExp(patternStr, 'i').exec(wholeMatch) : null;
                    return replacer(wholeMatch, matchResult);
                });
            } catch (e) { return currentHtml; }
        };

        // Gather all highlight candidates
        interface Candidate {
            pattern: string;
            isRegex?: boolean;
            replacer: (m: string, match: RegExpExecArray | null) => string;
            priority: number;
            length: number;
        }
        const candidates: Candidate[] = [];

        // 1. Current Target
        if (target) {
            candidates.push({
                pattern: target,
                priority: 10,
                replacer: (m, _match) => `<span class="inline-btn target-highlight" draggable="true" data-id="target-hl" data-mid="${mid}" data-cmd="target" data-context="${m}" data-action="menu" style="--glow-color: rgba(255, 215, 0, 0.6)">${m}</span>`,
                length: target.length
            });
        }

        if (!isRoomName) {
            // 2. Buttons
            buttonsRef.current?.filter(b => (b.display === 'inline' || b.trigger?.spit) && b.trigger?.enabled && b.trigger.pattern).forEach(b => {
                const pattern = b.trigger!.pattern!;
                const isRegex = b.trigger!.isRegex;
                
                candidates.push({
                    pattern: pattern,
                    isRegex: isRegex,
                    priority: 100,
                    replacer: (m, match) => {
                        let finalLabel = b.label;
                        let finalCommand = b.command;
                        if (match) {
                            for (let i = 1; i < match.length; i++) {
                                const val = match[i] || '';
                                finalLabel = finalLabel.replace(new RegExp(`\\$${i}`, 'g'), val);
                                finalCommand = finalCommand.replace(new RegExp(`\\$${i}`, 'g'), val);
                            }
                        }
                        return `<span class="inline-btn" draggable="true" data-id="${b.id}" data-mid="${mid}" data-cmd="${finalCommand}" data-context="${m}" data-icon="${b.icon || ''}" data-label="${finalLabel}" data-color="${b.style.backgroundColor}" data-action="${b.actionType || 'command'}" data-menu-display="${b.menuDisplay || 'list'}" data-spit="${b.trigger?.spit ? 'true' : 'false'}" data-swipes='${b.swipeCommands ? JSON.stringify(b.swipeCommands).replace(/'/g, "&apos;") : ""}' data-swipe-actions='${b.swipeActionTypes ? JSON.stringify(b.swipeActionTypes).replace(/'/g, "&apos;") : ""}' style="--glow-color: ${b.style.backgroundColor.replace('0.3', '0.6').replace('0.2', '0.5')}">${m}</span>`;
                    },
                    length: pattern.length
                });
            });

            // 3. PCs
            const pcNames = new Set([...roomPlayers].filter(name => name !== characterName));
            pcNames.forEach(name => {
                const patterns = [name, pluralizeMumeSubject(name)].filter(Boolean);
                patterns.forEach(p => {
                    candidates.push({
                        pattern: p,
                        priority: 5,
                        replacer: (m, _match) => `<span class="inline-btn auto-occupant pc-highlighter" draggable="true" data-id="auto-${name}" data-mid="${mid}" data-cmd="inlineplayer" data-context="${name}" data-action="menu" data-menu-display="list" style="--glow-color: rgba(100, 100, 255, 0.6)">${m}</span>`,
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
                        priority: 5,
                        replacer: (m, _match) => `<span class="inline-btn auto-npc npc-highlighter" draggable="true" data-id="auto-npc-${originalName}" data-mid="${mid}" data-cmd="inlinenpc" data-context="${originalName}" data-action="menu" data-menu-display="list" style="--glow-color: rgba(255, 100, 100, 0.6)">${m}</span>`,
                        length: p.length
                    });
                });
            });

            // 5. Items
            roomItems.forEach(name => {
                candidates.push({
                    pattern: name,
                    priority: 5,
                    replacer: (m, _match) => `<span class="inline-btn auto-item" draggable="true" data-id="auto-item-${name}" data-mid="${mid}" data-cmd="selection" data-context="${m}" data-action="menu" data-menu-display="list" style="--glow-color: rgba(100, 255, 100, 0.5)">${m}</span>`,
                    length: name.length
                });
            });
        }

        // Apply candidates: sort by priority DESC, then length DESC
        candidates
            .sort((a, b) => {
                if (b.priority !== a.priority) return b.priority - a.priority;
                return b.length - a.length;
            })
            .forEach(c => {
                newHtml = safeHighlight(newHtml, c.pattern, !!c.isRegex, c.replacer);
            });

        cacheRef.current.set(mid, { html: newHtml, htmlRaw: originalHtml, deps: depsHash });
        if (cacheRef.current.size > 1000) {
            const firstKey = cacheRef.current.keys().next().value;
            if (firstKey !== undefined) cacheRef.current.delete(firstKey);
        }

        return newHtml;
    }, [target, buttonsRef, roomPlayers, roomNpcs, characterName, roomItems, depsHash]);

    return { processMessageHtml };
}
