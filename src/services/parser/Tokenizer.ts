import { Token, EntityToken, TextToken, AnsiToken } from '../../types';
import { getCategoryForName } from '../../utils/categorizationUtils';

export interface TokenizerContext {
    target?: string | null;
    currentOccupants: any[];
    roomPlayers?: any[];
    roomNpcs: any[];
    activeGroupMembers: any[];
    roomItems: any[];
    inventoryItems?: any[];
    equipmentItems?: any[];
    discoveredItems: any[];
    inlineCategories: any[];
    buttons: any[];
    selectedObjectIds: Set<string>;
    onlinePlayers?: string[];
}

export class Tokenizer {
    public static tokenize(textRaw: string, context: TokenizerContext): Token[] {
        // This receives the raw text, possibly containing ANSI codes.
        // First we parse ANSI into a basic AST.
        let tokens = Tokenizer.parseAnsi(textRaw);

        // Then we run the highlighter rules on the text content to extract entities.
        const candidates = Tokenizer.buildCandidates(context);
        candidates.sort((a, b) => b.priority - a.priority);

        for (const c of candidates) {
            tokens = Tokenizer.applyCandidate(tokens, c);
        }

        // 3. Post-process to "latch onto" MUME color hints (Cyan = Objects, Magenta = Players)
        tokens = tokens.map(token => {
            if (token.type !== 'ansi' || !token.style?.color) return token;
            
            const color = token.style.color;
            const content = token.content.trim();
            const lowerContent = content.toLowerCase();
            
            // Ignore very short strings that might be part of prompts or symbols
            if (content.length < 3) return token;

            // Cyan promotion (Items)
            if (color === 'var(--ansi-cyan)' || color === 'var(--ansi-bright-cyan)' || color === 'mume-obj') {
                // Try to find the location from context if possible
                let location = 'room';
                let category = 'obj-room';
                
                const inEq = context.equipmentItems?.some(i => (typeof i === 'string' ? i : i.name).toLowerCase().includes(lowerContent));
                const inInv = context.inventoryItems?.some(i => (typeof i === 'string' ? i : i.name).toLowerCase().includes(lowerContent));
                
                if (inEq) {
                    location = 'worn';
                    category = 'obj-worn';
                } else if (inInv) {
                    location = 'carried';
                    category = 'obj-char';
                }

                return {
                    type: 'entity',
                    content: token.content,
                    entityId: `auto-color-obj-${lowerContent.replace(/\s+/g, '-')}`,
                    metadata: {
                        kind: 'object',
                        location,
                        context: content,
                        category,
                        action: 'menu',
                        extraClasses: ['color-latched', 'auto-item']
                    }
                } as EntityToken;
            }

            // Magenta promotion (Players)
            if (color === 'var(--ansi-magenta)' || color === 'var(--ansi-bright-magenta)' || color === 'mume-pc') {
                return {
                    type: 'entity',
                    content: token.content,
                    entityId: `auto-color-pc-${lowerContent.replace(/\s+/g, '-')}`,
                    metadata: {
                        kind: 'player',
                        location: 'room',
                        context: content,
                        category: 'inline-player',
                        action: 'menu',
                        extraClasses: ['color-latched', 'pc-highlighter']
                    }
                } as EntityToken;
            }

            // Yellow promotion (NPCs)
            if (color === 'var(--ansi-yellow)' || color === 'var(--ansi-bright-yellow)' || color === 'mume-npc') {
                return {
                    type: 'entity',
                    content: token.content,
                    entityId: `auto-color-npc-${lowerContent.replace(/\s+/g, '-')}`,
                    metadata: {
                        kind: 'npc',
                        location: 'room',
                        context: content,
                        category: 'inline-npc',
                        action: 'menu',
                        extraClasses: ['color-latched', 'npc-highlighter']
                    }
                } as EntityToken;
            }

            return token;
        });

        return tokens;
    }

    private static parseAnsi(textRaw: string): Token[] {
        // Here we build a robust AST directly from ANSI.
        // MUME ANSI often sets multiple attributes at once.
        const tokens: Token[] = [];

        const ansiRegex = /\x1b\[([0-9;]*?)m/g;

        let lastIndex = 0;
        let match;

        // Simple state tracker
        let currentColor: string | undefined = undefined;
        let isBold = false;

        while ((match = ansiRegex.exec(textRaw)) !== null) {
            // 1. Extract text before this ANSI code
            if (match.index > lastIndex) {
                const text = textRaw.substring(lastIndex, match.index);
                if (currentColor || isBold) {
                     tokens.push({
                         type: 'ansi',
                         content: text,
                         style: {
                             color: currentColor,
                             fontWeight: isBold ? 'bold' : 'normal'
                         }
                     } as AnsiToken);
                } else {
                     tokens.push({ type: 'text', content: text });
                }
            }

            // 2. Parse the ANSI code to update state
            const codes = match[1] === '' ? ['0'] : match[1].split(';');

            for (let i = 0; i < codes.length; i++) {
                const code = parseInt(codes[i], 10);

                if (code === 0) {
                    currentColor = undefined;
                    isBold = false;
                } else if (code === 1) {
                    isBold = true;
                } else if (code === 22) {
                    isBold = false;
                } else if (code >= 30 && code <= 37) {
                    const colors = ['black', 'red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white'];
                    currentColor = `var(--ansi-${colors[code - 30]})`;
                } else if (code === 38 && codes[i+1] === '5' && codes[i+2]) {
                    const colorIndex = parseInt(codes[i+2], 10);
                    // Use standard 16 mappings for low indices
                    if (colorIndex >= 0 && colorIndex <= 7) {
                        const colors = ['black', 'red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white'];
                        currentColor = `var(--ansi-${colors[colorIndex]})`;
                    } else if (colorIndex >= 8 && colorIndex <= 15) {
                        const colors = ['black', 'red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white'];
                        currentColor = `var(--ansi-bright-${colors[colorIndex-8]})`;
                    } else if (colorIndex === 159) {
                        // Special MUME Object Color (&355)
                        currentColor = 'mume-obj';
                    } else if (colorIndex === 201 || colorIndex === 207) {
                        // Special MUME Player Colors (&505, etc)
                        currentColor = 'mume-pc';
                    } else {
                        currentColor = `rgb-idx-${colorIndex}`;
                    }
                    i += 2;
                } else if (code >= 90 && code <= 97) {
                    const colors = ['black', 'red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white'];
                    currentColor = `var(--ansi-bright-${colors[code - 90]})`;
                }
            }

            lastIndex = ansiRegex.lastIndex;
        }

        // Add remaining text
        if (lastIndex < textRaw.length) {
            const text = textRaw.substring(lastIndex);
             if (currentColor || isBold) {
                 tokens.push({
                     type: 'ansi',
                     content: text,
                     style: {
                         color: currentColor,
                         fontWeight: isBold ? 'bold' : 'normal'
                     }
                 } as AnsiToken);
            } else {
                 tokens.push({ type: 'text', content: text });
            }
        }

        if (tokens.length === 0) {
            tokens.push({ type: 'text', content: textRaw });
        }

        return tokens;
    }

    private static buildCandidates(context: TokenizerContext) {
        const candidates: Array<{ pattern: string; priority: number; createToken: (match: string) => Token, isRegex: boolean }> = [];

        // Static Custom
        (context.buttons || []).forEach((kh: any) => {
            if (!kh.pattern || !kh.enabled) return;
            candidates.push({
                pattern: kh.pattern,
                isRegex: !!kh.isRegex,
                priority: 100,
                createToken: (match) => ({
                    type: 'ansi',
                    content: match,
                    style: {
                        color: kh.color,
                        fontWeight: kh.bold ? 'bold' : 'normal'
                    }
                })
            });
        });

        // Target
        if (context.target) {
            candidates.push({
                pattern: context.target,
                isRegex: false,
                priority: 50,
                createToken: (match) => ({
                    type: 'entity',
                    content: match,
                    entityId: `target-${context.target!.toLowerCase().replace(/\s+/g, '-')}`,
                    metadata: {
                        kind: 'none',
                        location: 'none',
                        context: context.target!,
                        category: 'target',
                        color: 'var(--accent)',
                        extraClasses: ['target-highlighter']
                    }
                } as EntityToken)
            });
        }

        // PCs / NPCs / Online Players
        const playerNameSet = new Set(
            (Array.isArray(context.roomPlayers) ? context.roomPlayers : [])
                .map(o => String(o.name || '').toLowerCase())
                .filter(Boolean)
        );
        const allOccupants = [...(Array.isArray(context.currentOccupants) ? context.currentOccupants : [])];
        if (Array.isArray(context.roomNpcs)) {
            context.roomNpcs.forEach(npc => {
                if (!allOccupants.find(o => o.name === npc.name)) allOccupants.push(npc);
            });
        }
        if (Array.isArray(context.roomPlayers)) {
            context.roomPlayers.forEach(pc => {
                if (!allOccupants.find(o => o.name === pc.name)) allOccupants.push(pc);
            });
        }

        // Add Online Players (from who list) if not already in occupants
        if (Array.isArray(context.onlinePlayers)) {
            context.onlinePlayers.forEach(name => {
                const nameStr = String(name || '');
                if (!allOccupants.find(o => o.name && nameStr && String(o.name).toLowerCase() === nameStr.toLowerCase())) {
                    allOccupants.push({ name: nameStr, location: 'online', isNpc: false });
                    playerNameSet.add(nameStr.toLowerCase());
                }
            });
        }

        allOccupants.forEach(occ => {
            const occNameStr = String(occ.name || '');
            const isNpc = occ.isNpc !== false && !playerNameSet.has(occNameStr.toLowerCase());
            const patterns = new Set<string>();
            if (occ.name) patterns.add(String(occ.name));
            if (occ.short) patterns.add(String(occ.short));
            if (occ.keyword) String(occ.keyword).split(/\s+/).forEach((k: string) => { if (k.length > 2) patterns.add(k); });
            if (occ.id && !String(occ.id).includes('-')) patterns.add(String(occ.id)); // Simple IDs only

            patterns.forEach(pattern => {
                const patStr = String(pattern);
                if (!patStr || patStr.length < 3) return;

                // Only search for dynamic categories if it's NOT a player, 
                // or if the player category itself is customized.
                let dynamicCat = getCategoryForName(patStr, Array.isArray(context.inlineCategories) ? context.inlineCategories : []);
                
                if (!isNpc && dynamicCat && dynamicCat === 'inline-npc') {
                    dynamicCat = null;
                }

                candidates.push({
                    pattern: patStr,
                    isRegex: false,
                    priority: (occNameStr === patStr) ? (occ.id ? 15 : 20) : (occ.id ? 5 : 10),
                    createToken: (match) => {
                        const cat = dynamicCat || (isNpc ? 'inline-npc' : 'inline-player');
                        return {
                            type: 'entity',
                            content: match,
                            entityId: occ.id ? String(occ.id) : `auto-${occNameStr || patStr}`,
                            metadata: {
                                kind: isNpc ? 'npc' : 'player',
                                location: 'room',
                                context: occNameStr || patStr,
                                category: cat,
                                action: 'menu',
                                extraClasses: ['auto-occupant', isNpc ? 'npc-highlighter' : 'pc-highlighter']
                            }
                        } as EntityToken;
                    }
                });
            });
        });

        // Add Inventory/Equipment Items
        const allItems = [
            ...(Array.isArray(context.roomItems) ? context.roomItems : []),
            ...(Array.isArray(context.inventoryItems) ? context.inventoryItems : []),
            ...(Array.isArray(context.equipmentItems) ? context.equipmentItems : [])
        ];

        allItems.forEach(item => {
            const name = typeof item === 'string' ? item : item.name;
            if (!name) return;
            const nameStr = String(name);

            const patterns = new Set<string>();
            patterns.add(nameStr);
            if (item.short) patterns.add(String(item.short));
            if (item.keyword) String(item.keyword).split(/\s+/).forEach((k: string) => { if (k.length > 2) patterns.add(k); });

            const location = item.location || 'room';

            patterns.forEach(pattern => {
                const patStr = String(pattern);
                if (!patStr || patStr.length < 3) return;

                const dynamicCat = getCategoryForName(patStr, Array.isArray(context.inlineCategories) ? context.inlineCategories : []);

                candidates.push({
                    pattern: patStr,
                    isRegex: false,
                    priority: (nameStr === patStr) ? 5 : 2,
                    createToken: (match) => {
                        let cat = dynamicCat;
                        if (!cat) {
                            if (location === 'worn') cat = 'obj-worn';
                            else if (location === 'carried') cat = 'obj-char';
                            else cat = 'obj-room';
                        }

                        return {
                            type: 'entity',
                            content: match,
                            entityId: item.id ? String(item.id) : `item-${nameStr || patStr}`,
                            metadata: {
                                kind: 'object',
                                location: location,
                                context: nameStr || patStr,
                                category: cat,
                                action: 'menu',
                                extraClasses: ['auto-item']
                            }
                        } as EntityToken;
                    }
                });
            });
        });

        return candidates;
    }

    private static applyCandidate(tokens: Token[], candidate: { pattern: string; isRegex: boolean; createToken: (match: string) => Token }): Token[] {
        const newTokens: Token[] = [];

        for (const token of tokens) {
            if (token.type !== 'text' && token.type !== 'ansi') {
                newTokens.push(token);
                continue;
            }

            // Split logic
            // Need to correctly handle boundaries
            // Use a custom boundary check because \b doesn't support accented characters in JS
            const candPatternStr = String(candidate.pattern);
            const pattern = candidate.isRegex
                ? candPatternStr
                : `(?:^|[^a-zA-Z\\u00C0-\\u00FF])${candPatternStr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![a-zA-Z\\u00C0-\\u00FF])`;

            const regex = new RegExp(pattern, 'gi');

            let lastIndex = 0;
            let match;
            while ((match = regex.exec(token.content)) !== null) {
                let matchContent = match[0];
                let matchIndex = match.index;

                // If we used a custom boundary (the first char), strip it from the token
                if (!candidate.isRegex && matchContent.length > candidate.pattern.length) {
                    const firstChar = matchContent[0];
                    if (/[^a-zA-Z\u00C0-\u00FF]/.test(firstChar)) {
                        matchContent = matchContent.substring(1);
                        matchIndex += 1;
                    }
                }

                if (matchIndex > lastIndex) {
                    newTokens.push({ type: token.type, content: token.content.substring(lastIndex, matchIndex), ...((token as any).style ? { style: (token as any).style } : {}) } as any);
                }
                newTokens.push(candidate.createToken(matchContent));
                lastIndex = matchIndex + matchContent.length;
                // Avoid infinite loops if match is empty
                if (regex.lastIndex === match.index) regex.lastIndex++;
            }

            if (lastIndex < token.content.length) {
                newTokens.push({ type: token.type, content: token.content.substring(lastIndex), ...((token as any).style ? { style: (token as any).style } : {}) } as any);
            }
        }

        return newTokens;
    }
}
