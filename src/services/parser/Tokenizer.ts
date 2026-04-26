/**
 * @file Tokenizer.ts
 * @description AI-Native, Tag-Aware Tokenizer for MUME XML mode.
 * Replaces complex regex-matching with reliable server-side tagging.
 * Supports ANSI colors and nested XML entities (NPC, Player, Object, Room).
 */

import React from 'react';
import { Token, EntityToken, AnsiToken, TextToken, InlineCategoryConfig } from '../../types';

export interface TokenizerContext {
    target?: string | null;
    buttons?: any[]; // Custom user highlights
    registeredPlayers?: string[]; // Names of players to highlight in text
    inlineCategories?: InlineCategoryConfig[];
    npcColor?: string;
    playerColor?: string;
    objectColor?: string;
    roomColor?: string;
}

export class Tokenizer {
    private static readonly KNOWN_XML_TAGS = new Set([
        'room', 'name', 'description', 'character', 'player', 'object', 'header', 
        'exit', 'prompt', 'movement', 'magic', 'para', 'item', 'terrain', 'exits',
        'weather', 'achievement', 'gratuitous', 'move_in', 'move_out', 'social',
        'emote', 'narrate', 'pray', 'say', 'shout', 'song', 'tell', 'yell',
        'hit', 'damage', 'avoid_damage', 'miss', 'code', 'em', 'status', 
        'highlight', 'familiar', 'snoop', 'xml', 'prompt'
    ]);

    // Stateful Context for cross-line persistence
    private currentLocation: string = 'room';
    private currentParent: string | null = null;
    private currentStyle: React.CSSProperties = {};

    private static instance: Tokenizer | null = null;

    public static getInstance(): Tokenizer {
        if (!this.instance) {
            this.instance = new Tokenizer();
        }
        return this.instance;
    }

    public reset(loc: string = 'room') {
        this.currentLocation = loc;
        this.currentParent = null;
        this.currentStyle = {};
    }

    /**
     * Main entry point for tokenizing game output.
     * Parses mixed ANSI and XML tags into a unified AST.
     */
    public tokenize(textRaw: string, context: TokenizerContext, initialLoc?: string): Token[] {
        if (initialLoc) {
            this.currentLocation = initialLoc;
        }
        const tokens: Token[] = [];
        
        // Entity Tracking
        let activeEntity: {
            tag: string;
            kind: 'npc' | 'player' | 'object' | 'room' | 'exit' | 'none';
            metadata: any;
            content: string;
            style: React.CSSProperties;
        } | null = null;
        
        // Active tag stack for nested classification
        const tagStack: string[] = [];

        // Scanner for XML tags and ANSI codes
        const scanner = /<(\/?[a-zA-Z0-9\-_]+)([^>]*?)\/?>|\x1b\[[0-9;]*m/g;
        let match;
        let lastIndex = 0;

        while ((match = scanner.exec(textRaw)) !== null) {
            const [fullMatch, tagName, attributes] = match;

            if (match.index > lastIndex) {
                const content = textRaw.substring(lastIndex, match.index);
                this.handleText(content, tokens, this.currentStyle, activeEntity, context);
            }
            lastIndex = scanner.lastIndex;

            if (fullMatch.startsWith('\x1b')) {
                this.currentStyle = this.applyAnsi(fullMatch, this.currentStyle);
            } else if (tagName) {
                const isClosing = tagName.startsWith('/');
                const baseName = (isClosing ? tagName.substring(1) : tagName).toLowerCase();
                
                if (Tokenizer.KNOWN_XML_TAGS.has(baseName)) {
                    if (isClosing) {
                        if (activeEntity && activeEntity.tag.toLowerCase() === baseName) {
                            this.emitEntity(activeEntity, tokens, context);
                            activeEntity = null;
                        }
                        const idx = tagStack.lastIndexOf(baseName);
                        if (idx !== -1) tagStack.splice(idx, 1);
                    } else {
                        const metadata = this.parseAttributes(attributes);
                        const kind = this.determineKind(baseName, tagStack);

                        // --- STATE MACHINE: Update Context ---
                        if (baseName === 'prompt' || baseName === 'room') {
                            this.currentLocation = 'room';
                            this.currentParent = null;
                        }

                        if (kind !== 'none') {
                            if (!activeEntity) {
                                activeEntity = { 
                                    tag: baseName, 
                                    kind, 
                                    metadata, 
                                    content: '', 
                                    style: { ...this.currentStyle },
                                    stack: [...tagStack]
                                };
                            } else if (kind === 'player' && activeEntity.kind === 'npc') {
                                activeEntity.kind = 'player';
                                if (metadata) {
                                    activeEntity.metadata = { ...(activeEntity.metadata || {}), ...metadata };
                                }
                            }
                        }
                        
                        if (!fullMatch.endsWith('/>')) {
                            tagStack.push(baseName);
                        }
                    }
                } else {
                    this.handleText(fullMatch, tokens, this.currentStyle, activeEntity, context);
                }
            }
        }

        if (lastIndex < textRaw.length) {
            this.handleText(textRaw.substring(lastIndex), tokens, this.currentStyle, activeEntity, context);
        }
        
        if (activeEntity) this.emitEntity(activeEntity, tokens, context);

        return tokens;
    }

    private decodeEntities(text: string): string {
        if (!text) return "";
        return text
            .replace(/&gt;/gi, '>')
            .replace(/&lt;/gi, '<')
            .replace(/&amp;/gi, '&')
            .replace(/&quot;/gi, '"')
            .replace(/&apos;/gi, "'");
    }

    private handleText(
        content: string, 
        tokens: Token[], 
        style: React.CSSProperties, 
        activeEntity: any,
        context?: TokenizerContext
    ) {
        const decoded = this.decodeEntities(content);
        const lower = decoded.toLowerCase();

        // --- STATE MACHINE: Context Inference (Handles both tagged and plain text headers) ---
        if (lower.includes('carrying') && !lower.includes('stop using')) this.currentLocation = 'carried';
        else if (lower.includes('using') || lower.includes('equipped')) this.currentLocation = 'worn';
        else if (lower.includes('in the') || lower.includes('contents')) this.currentLocation = 'container';
        else if (lower.includes('obvious exits')) this.currentLocation = 'room';

        if (activeEntity) {
            activeEntity.content += decoded;
            return;
        }

        const players = context?.registeredPlayers || [];
        if (players.length > 0) {
            const validNames = players.filter(n => n.length > 2);
            if (validNames.length > 0) {
                const namePattern = `(${validNames.join('|')})`;
                const nameRegex = new RegExp(namePattern, 'g');
                
                let lastIdx = 0;
                let m;
                while ((m = nameRegex.exec(decoded)) !== null) {
                    const playerName = m[1];
                    const startIdx = m.index;
                    const endIdx = nameRegex.lastIndex;

                    const prevChar = startIdx > 0 ? decoded[startIdx - 1] : '';
                    const nextChar = endIdx < decoded.length ? decoded[endIdx] : '';
                    const isLetter = (c: string) => /[a-zA-Z\xC0-\u024F]/.test(c);
                    
                    if (isLetter(prevChar) || isLetter(nextChar)) continue;

                    if (startIdx > lastIdx) {
                        this.pushText(decoded.substring(lastIdx, startIdx), tokens, style);
                    }
                    
                    const metadata: any = {
                        kind: 'player',
                        category: 'inline-player',
                        context: playerName,
                        location: 'none',
                        action: 'menu'
                    };

                    if (context.playerColor) {
                        metadata.glowColor = context.playerColor;
                    }

                    tokens.push({
                        type: 'entity',
                        content: playerName,
                        entityId: playerName.toLowerCase(),
                        metadata
                    } as EntityToken);
                    
                    lastIdx = endIdx;
                }
                
                if (lastIdx < decoded.length) {
                    this.pushText(decoded.substring(lastIdx), tokens, style);
                }
                return;
            }
        }

        this.pushText(decoded, tokens, style);
    }

    private pushText(content: string, tokens: Token[], style: React.CSSProperties) {
        if (!content) return;
        if (Object.keys(style).length > 0) {
            tokens.push({
                type: 'ansi',
                content,
                style: { ...style }
            } as AnsiToken);
        } else {
            tokens.push({ type: 'text', content } as TextToken);
        }
    }

    private emitEntity(activeEntity: any, tokens: Token[], context: TokenizerContext) {
        const { kind, metadata, content } = activeEntity;
        if (!content.trim()) return;

        let category = 'none';
        if (kind === 'player') category = 'inline-player';
        else if (kind === 'npc') category = 'inline-npc';
        else if (kind === 'object') {
            if (this.currentLocation === 'carried') category = 'inline-obj-char';
            else if (this.currentLocation === 'worn') category = 'inline-obj-worn';
            else category = 'inline-obj-room';
        }
        else if (kind === 'room') category = 'room';
        else if (kind === 'exit') category = 'exit';

        if (metadata.type) {
            category = `inline-${metadata.type.toLowerCase()}`;
        }

        // --- Room Context Override ---
        // If we are explicitly within a <room> tag (check stack or current context), 
        // the user wants these to be "room buttons" (categorized as 'room').
        if (activeEntity.stack?.includes('room')) {
            category = 'room';
        }

        // --- COLOR LOOKUP: Prioritize user settings ---
        let glowColor = undefined;
        
        // 1. Check kind-based overrides (User settings from "Button Settings" -> npcColor, playerColor, etc) - PRIORITY
        if (kind === 'player' && context.playerColor) glowColor = context.playerColor;
        else if (kind === 'npc' && context.npcColor) glowColor = context.npcColor;
        else if (kind === 'object' && context.objectColor) glowColor = context.objectColor;
        else if (kind === 'room' && context.roomColor) glowColor = context.roomColor;
        
        // 2. Check if there's a SPECIFIC custom category color (Only if Kind color is not set)
        if (!glowColor && context.inlineCategories) {
            const config = context.inlineCategories.find(c => c.id === category);
            if (config?.color) {
                glowColor = config.color;
            }
        }

        tokens.push({
            type: 'entity',
            content,
            entityId: metadata.id || `auto-${content.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
            metadata: {
                kind,
                category,
                context: content,
                location: this.currentLocation,
                parent: this.currentParent,
                action: 'menu',
                style: activeEntity.style,
                glowColor,
                ...metadata
            }
        } as EntityToken);

        if (activeEntity.tag === 'header' && activeEntity.kind === 'object') {
            this.currentParent = content;
        }
    }

    private parseAttributes(attrStr: string): any {
        const attrs: any = {};
        const attrRegex = /([a-zA-Z0-9\-]+)=["']?([^"'\s>]+)["']?/g;
        let match;
        while ((match = attrRegex.exec(attrStr)) !== null) {
            attrs[match[1]] = this.decodeEntities(match[2]);
        }
        return attrs;
    }

    private determineKind(tag: string, stack: string[]): any {
        const lowerTag = tag.toLowerCase();
        const fullStack = [...stack.map(s => s.toLowerCase()), lowerTag];
        
        if (fullStack.includes('character')) {
            return fullStack.includes('player') ? 'player' : 'npc';
        }
        if (fullStack.includes('player')) return 'player';
        if (fullStack.includes('object') || fullStack.includes('item')) return 'object';
        if (fullStack.includes('room') || fullStack.includes('name')) return 'room';
        if (fullStack.includes('exit')) return 'exit';
        
        return 'none';
    }

    private applyAnsi(ansiMatch: string, style: React.CSSProperties): React.CSSProperties {
        const codesStr = ansiMatch.substring(2, ansiMatch.length - 1);
        const codes = codesStr === '' ? ['0'] : codesStr.split(';');
        const newStyle = { ...style };

        for (let i = 0; i < codes.length; i++) {
            const code = parseInt(codes[i], 10);
            if (code === 0) {
                Object.keys(newStyle).forEach(key => delete (newStyle as any)[key]);
            } else if (code === 1) {
                newStyle.fontWeight = 'bold';
            } else if (code === 22) {
                newStyle.fontWeight = 'normal';
            } else if (code >= 30 && code <= 37) {
                const colors = ['black', 'red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white'];
                newStyle.color = `var(--ansi-${colors[code - 30]})`;
            } else if (code === 38 && codes[i+1] === '5' && codes[i+2]) {
                i += 2;
            } else if (code >= 90 && code <= 97) {
                const colors = ['black', 'red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white'];
                newStyle.color = `var(--ansi-bright-${colors[code - 90]})`;
            }
        }
        return newStyle;
    }
}
