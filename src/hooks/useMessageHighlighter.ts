import { useCallback, RefObject, useRef } from 'react';
import { CustomButton, InlineCategoryConfig, MessageType } from '../types';
import { pluralizeMumeSubject } from '../utils/gameUtils';
import { getCategoryForName, getGlowColorForCategory } from '../utils/categorizationUtils';

export const useMessageHighlighter = (
    target: string | null,
    buttonsRef: RefObject<CustomButton[]>,
    roomPlayers: string[],
    roomNpcs: string[],
    characterName: string | null,
    roomItems: string[],
    inlineCategories: InlineCategoryConfig[] = [],
    highlightVersion: number = 0,
    discoveredItems: string[] = []
) => {
    const cacheRef = useRef<Map<string, { html: string, htmlRaw: string, deps: string }>>(new Map());

    // Clear cache when highlight version changes to force re-processing
    const lastVersionRef = useRef(highlightVersion);
    if (highlightVersion !== lastVersionRef.current) {
        cacheRef.current.clear();
        lastVersionRef.current = highlightVersion;
    }

    const safeHighlight = (currentHtml: string, patternStr: string, isRegex: boolean, replacer: (match: string, matchObj: RegExpExecArray | null) => string) => {
        if (!patternStr) return currentHtml;

        const escaped = isRegex ? patternStr : patternStr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const parts = currentHtml.split(/(<[^>]+>)/g);
        let changed = false;

        const regex = new RegExp(escaped, 'gi');

        for (let i = 0; i < parts.length; i++) {
            if (!parts[i].startsWith('<')) {
                const nodeText = parts[i];
                const replaced = nodeText.replace(regex, (m, ...args) => {
                    // Extract capture groups based on the regex structure
                    // The args array is [match, p1, p2, ..., offset, string]
                    const groups = args.slice(0, -2);
                    // For the replacer, we fake a match object if possible or just use the groups
                    return replacer(m, groups as any);
                });

                if (replaced !== nodeText) {
                    parts[i] = replaced;
                    changed = true;
                }
            }
        }

        return changed ? parts.join('') : currentHtml;
    };

    // Create a fast hash string instead of using expensive JSON.stringify
    const generateDepsHash = useCallback(() => {
        const rp = roomPlayers.join('|');
        const rn = roomNpcs.join('|');
        const ri = roomItems.join('|');
        const di = discoveredItems.join('|');
        // For inline categories, we only care if the configuration itself changed length/structure roughly
        const ic = inlineCategories.map(c => c.id).join('|');
        return `${target || ''}:${rp}:${rn}:${ri}:${di}:${ic}:${highlightVersion}`;
    }, [target, roomPlayers, roomNpcs, roomItems, discoveredItems, inlineCategories, highlightVersion]);

    const processMessageHtml = useCallback((originalHtml: string, mid: string, isRoomName: boolean, type?: MessageType) => {
        // Use the fast hash instead of full JSON serialization
        const depsHash = `${generateDepsHash()}:${type || ''}`;

        const cached = cacheRef.current.get(mid);
        if (cached && cached.htmlRaw === originalHtml && cached.deps === depsHash) {
            return cached.html;
        }

        let newHtml = originalHtml;

        interface Candidate {
            pattern: string;
            isRegex?: boolean;
            replacer: (m: string, match: RegExpExecArray | null) => string;
            priority: number;
            length: number;
        }
        const candidates: Candidate[] = [];

        // 0. Specialized List Highlighting (WHO/WHERE)
        if (type === 'who-list' || type === 'where-list') {
            const textOnly = originalHtml.replace(/<[^>]+>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').normalize('NFC');
            
            // Strip away MUME prefixes like [ 50 Ran], <AFK>, (PK), or *Wanted*
            let cleanText = textOnly.trim();
            let lastLength = 0;
            while (cleanText.length !== lastLength) {
                lastLength = cleanText.length;
                cleanText = cleanText.replace(/^\[.*?\]\s*/, '');
                cleanText = cleanText.replace(/^<.*?>\s*/, '');
                cleanText = cleanText.replace(/^\(.*?\)\s*/, '');
                cleanText = cleanText.replace(/^\*+/, '');
            }

            // Extract the first word as the player name
            const nameCandidate = cleanText.split(/\s+/)[0].replace(/[.,:;!]+$/, '');

            if (nameCandidate && nameCandidate.length > 2 && /^[A-Z\u00C0-\u00DE]/.test(nameCandidate)) {
                const name = nameCandidate;
                let highlighted = false;
                newHtml = safeHighlight(newHtml, name, false, (m) => {
                    if (highlighted) return m;
                    highlighted = true;
                    return `<span class="inline-btn auto-occupant pc-highlighter" draggable="true" data-id="auto-${name}" data-mid="${mid}" data-cmd="inlineplayer" data-context="${name}" data-action="menu" data-menu-display="list" style="--glow-color: rgba(100, 100, 255, 0.9)">${m}</span>`;
                });
            }
        }

        const pcNamesSet = new Set([...roomPlayers].filter(name => name !== characterName));
        const npcNamesSet = new Set(roomNpcs);

        if (!isRoomName) {
            // 1. Active Target
            if (target && type !== 'who-list' && type !== 'where-list') {
                let category = getCategoryForName(target, inlineCategories) || 'inline-default';
                if (pcNamesSet.has(target)) category = 'inlineplayer';
                else if (npcNamesSet.has(target)) category = 'inlinenpc';

                const glowColor = getGlowColorForCategory(category, inlineCategories);
                const command = category;

                candidates.push({
                    pattern: target,
                    priority: 90,
                    replacer: (m, _match) => `<span class="inline-btn auto-target active-target" draggable="true" data-id="auto-target-${target}" data-mid="${mid}" data-cmd="${command}" data-context="${m}" data-action="menu" data-menu-display="list" style="--glow-color: ${glowColor}">${m}</span>`,
                    length: target.length
                });
            }

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
                        return `<span class="inline-btn" draggable="true" data-id="${b.id}" data-mid="${mid}" data-cmd="${finalCommand}" data-context="${m}" data-icon="${b.icon || ''}" data-label="${finalLabel}" data-color="${b.style.backgroundColor}" data-action="${b.actionType || 'command'}" data-menu-display="${b.menuDisplay || 'list'}" data-spit="${b.trigger?.spit ? 'true' : 'false'}" data-duration="${b.trigger?.duration || ''}" data-swipes='${b.swipeCommands ? JSON.stringify(b.swipeCommands).replace(/'/g, "&apos;") : ""}' data-swipe-actions='${b.swipeActionTypes ? JSON.stringify(b.swipeActionTypes).replace(/'/g, "&apos;") : ""}' style="--glow-color: ${b.style.backgroundColor.replace('0.3', '0.6').replace('0.2', '0.5')}">${m}</span>`;
                    },
                    length: pattern.length
                });
            });

            // 3. PCs
            pcNamesSet.forEach(name => {
                const patterns = [name, pluralizeMumeSubject(name)].filter(Boolean);
                patterns.forEach(p => {
                    candidates.push({
                        pattern: p,
                        priority: 5,
                        replacer: (m, _match) => `<span class="inline-btn auto-occupant pc-highlighter" draggable="true" data-id="auto-${name}" data-mid="${mid}" data-cmd="inlineplayer" data-context="${name}" data-action="menu" data-menu-display="list" style="--glow-color: rgba(100, 100, 255, 0.9)">${m}</span>`,
                        length: p.length
                    });
                });
            });

            // 4. NPCs
            const npcNames = new Set(roomNpcs);
            const pSet = new Set(Array.from(pcNamesSet).map(p => (p as string).toLowerCase()));
            if (characterName) pSet.add(characterName.toLowerCase());

            npcNames.forEach(originalName => {
                const lowerName = originalName.toLowerCase();
                if (pSet.has(lowerName)) return;

                const stripped = originalName.replace(/^(A|An|The)\s+/i, '');
                const patterns = [originalName, stripped, pluralizeMumeSubject(originalName), pluralizeMumeSubject(stripped)].filter(Boolean);

                patterns.forEach(p => {
                    const category = getCategoryForName(originalName, inlineCategories);
                    const glowColor = category ? getGlowColorForCategory(category, inlineCategories) : 'rgba(255, 100, 100, 0.9)';
                    const command = category || 'inlinenpc';

                    candidates.push({
                        pattern: p,
                        priority: 5,
                        replacer: (m, _match) => `<span class="inline-btn auto-npc npc-highlighter" draggable="true" data-id="auto-npc-${originalName}" data-mid="${mid}" data-cmd="${command}" data-context="${originalName}" data-action="menu" data-menu-display="list" style="--glow-color: ${glowColor}">${m}</span>`,
                        length: p.length
                    });
                });
            });

            // 5. Items (Room + Discovered)
            const allItems = Array.from(new Set([...roomItems, ...discoveredItems]));
            allItems.forEach(name => {
                const category = getCategoryForName(name, inlineCategories) || 'inline-default';
                const glowColor = getGlowColorForCategory(category, inlineCategories);
                const command = category;

                candidates.push({
                    pattern: name,
                    priority: 5,
                    replacer: (m, _match) => `<span class="inline-btn auto-item" draggable="true" data-id="auto-item-${name}" data-mid="${mid}" data-cmd="${command}" data-context="${m}" data-action="menu" data-menu-display="list" style="--glow-color: ${glowColor}">${m}</span>`,
                    length: name.length
                });
            });
        }

        // 6. Room Exits (Contextual)
        const textOnly = originalHtml.replace(/<[^>]+>/g, '').trim();
        if (textOnly.startsWith('Exits: ')) {
            const directions = ['north', 'south', 'east', 'west', 'up', 'down', 'northeast', 'northwest', 'southeast', 'southwest', 'n', 's', 'e', 'w', 'u', 'd', 'ne', 'nw', 'se', 'sw'];
            directions.forEach(dir => {
                newHtml = safeHighlight(newHtml, `\\b${dir}\\b`, true, (m) => {
                    const fullDir = dir.length <= 2 ? (
                        dir === 'n' ? 'north' : dir === 's' ? 'south' : dir === 'e' ? 'east' : dir === 'w' ? 'west' :
                        dir === 'ne' ? 'northeast' : dir === 'nw' ? 'northwest' : dir === 'se' ? 'southeast' : dir === 'sw' ? 'southwest' :
                        dir === 'u' ? 'up' : dir === 'd' ? 'down' : dir
                    ) : dir;
                    return `<span class="inline-btn exit-btn" draggable="true" data-id="exit-${fullDir}" data-mid="${mid}" data-cmd="${fullDir}" data-context="${fullDir}" data-action="command" style="--glow-color: rgba(0, 255, 100, 0.8)">${m}</span>`;
                });
            });
        }

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
    }, [target, buttonsRef, roomPlayers, roomNpcs, characterName, roomItems, inlineCategories, generateDepsHash, highlightVersion]);

    return { processMessageHtml };
};
