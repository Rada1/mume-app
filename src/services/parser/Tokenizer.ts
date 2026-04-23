import { Token, EntityToken, TextToken, AnsiToken } from '../../types';

export interface TokenizerContext {
    target?: string | null;
    currentOccupants: any[];
    roomNpcs: any[];
    activeGroupMembers: any[];
    roomItems: any[];
    discoveredItems: any[];
    inlineCategories: any[];
    buttons: any[];
    selectedObjectIds: Set<string>;
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
                } else if (code >= 30 && code <= 37) {
                    const colors = ['black', 'red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white'];
                    currentColor = `var(--ansi-${colors[code - 30]})`;
                } else if (code === 38 && codes[i+1] === '5' && codes[i+2]) {
                    // 256 colors
                    const colorIndex = parseInt(codes[i+2], 10);
                    // Extremely simplified map just to show structure;
                    // a real implementation should import ANSI_PALETTE from utils/ansi.ts
                    // Assuming we have access to it or we can hardcode some mappings for now.
                    if (colorIndex >= 0 && colorIndex <= 7) {
                        const colors = ['black', 'red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white'];
                        currentColor = `var(--ansi-${colors[colorIndex]})`;
                    } else if (colorIndex >= 8 && colorIndex <= 15) {
                        const colors = ['black', 'red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white'];
                        currentColor = `var(--ansi-bright-${colors[colorIndex-8]})`;
                    } else {
                        // Very rough fallback
                         currentColor = '#ccc';
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

        // PCs / NPCs
        const allOccupants = [...context.currentOccupants];
        context.roomNpcs.forEach(npc => {
            if (!allOccupants.find(o => o.name === npc.name)) allOccupants.push(npc);
        });

        allOccupants.forEach(occ => {
            if (!occ.name) return;
            candidates.push({
                pattern: occ.name,
                isRegex: false,
                priority: occ.id ? 5 : 10,
                createToken: (match) => {
                    const isNpc = !!occ.id;
                    const cat = isNpc ? 'npc' : 'player';
                    return {
                        type: 'entity',
                        content: match,
                        entityId: `auto-${occ.name}`,
                        metadata: {
                            kind: isNpc ? 'npc' : 'player',
                            location: 'room',
                            context: occ.name!,
                            category: cat,
                            action: 'menu',
                            extraClasses: ['auto-occupant', isNpc ? 'npc-highlighter' : 'pc-highlighter']
                        }
                    } as EntityToken;
                }
            });
        });

        // Items
        const allItems = [...context.roomItems, ...context.discoveredItems];
        allItems.forEach(item => {
            const itemName = typeof item === 'string' ? item : item.name;
            if (!itemName) return;
            candidates.push({
                pattern: itemName,
                isRegex: false,
                priority: 2,
                createToken: (match) => ({
                    type: 'entity',
                    content: match,
                    entityId: `auto-item-${itemName.toLowerCase().replace(/\s+/g, '-')}`,
                    metadata: {
                        kind: 'object',
                        location: 'room',
                        context: itemName,
                        category: 'object',
                        action: 'menu',
                        extraClasses: ['auto-obj']
                    }
                } as EntityToken)
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
            const regex = candidate.isRegex
                ? new RegExp(candidate.pattern, 'gi')
                : new RegExp(`\\b${candidate.pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');

            let lastIndex = 0;
            let match;
            while ((match = regex.exec(token.content)) !== null) {
                if (match.index > lastIndex) {
                    newTokens.push({ type: token.type, content: token.content.substring(lastIndex, match.index), ...((token as any).style ? { style: (token as any).style } : {}) } as any);
                }
                newTokens.push(candidate.createToken(match[0]));
                lastIndex = regex.lastIndex;
            }

            if (lastIndex < token.content.length) {
                newTokens.push({ type: token.type, content: token.content.substring(lastIndex), ...((token as any).style ? { style: (token as any).style } : {}) } as any);
            }
        }

        return newTokens;
    }
}
