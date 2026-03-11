import { useCallback, RefObject, useRef } from 'react';
import { CustomButton, InlineCategoryConfig } from '../types';
import { pluralizeMumeSubject } from '../utils/gameUtils';
import { getCategoryForName, getGlowColorForCategory } from '../utils/categorizationUtils';

export const useMessageHighlighter = (
    target: string | null,
    buttonsRef: RefObject<CustomButton[]>,
    roomPlayers: string[],
    roomNpcs: string[],
    characterName: string | null,
    roomItems: string[],
    inlineCategories: InlineCategoryConfig[] = []
) => {
    const cacheRef = useRef<Map<string, { html: string, htmlRaw: string, deps: string }>>(new Map());

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
                    const matchObj = isRegex ? (regex.exec(nodeText) || null) : null;
                    if (isRegex) regex.lastIndex = 0;
                    return replacer(m, matchObj as any);
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
        // For inline categories, we only care if the configuration itself changed length/structure roughly
        const ic = inlineCategories.map(c => c.id).join('|');
        return `${target || ''}:${rp}:${rn}:${ri}:${ic}`;
    }, [target, roomPlayers, roomNpcs, roomItems, inlineCategories]);

    const processMessageHtml = useCallback((originalHtml: string, mid: string, isRoomName: boolean) => {
        // Use the fast hash instead of full JSON serialization
        const depsHash = generateDepsHash();

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

        if (!isRoomName) {
            // 1. Active Target
            if (target) {
                const category = getCategoryForName(target, inlineCategories) || 'inline-default';
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
                        replacer: (m, _match) => `<span class="inline-btn auto-occupant pc-highlighter" draggable="true" data-id="auto-${name}" data-mid="${mid}" data-cmd="inlineplayer" data-context="${name}" data-action="menu" data-menu-display="list" style="--glow-color: rgba(100, 100, 255, 0.9)">${m}</span>`,
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

            // 5. Items
            roomItems.forEach(name => {
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
    }, [target, buttonsRef, roomPlayers, roomNpcs, characterName, roomItems, inlineCategories, generateDepsHash]);

    return { processMessageHtml };
};
