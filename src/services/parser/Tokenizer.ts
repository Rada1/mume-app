/**
 * @file Tokenizer.ts
 * @description AI-Native, Tag-Aware Tokenizer for MUME XML mode.
 * Replaces complex regex-matching with reliable server-side tagging.
 * Supports ANSI colors and nested XML entities (NPC, Player, Object, Room).
 */

import React from 'react';
import { Token, EntityToken, AnsiToken, TextToken, InlineCategoryConfig, GmcpOccupant } from '../../types';
import { getOccupantCommandKeyword } from '../../utils/occupantKeywordUtils';
import { toCategoryId } from '../../utils/inlineActionModel';

export interface TokenizerContext {
    target?: string | null;
    buttons?: any[]; // Custom user highlights
    registeredPlayers?: string[]; // Names of players to highlight in text
    currentOccupants?: GmcpOccupant[];
    roomNpcs?: GmcpOccupant[];
    activeGroupMembers?: unknown[];
    roomItems?: GmcpOccupant[];
    discoveredItems?: GmcpOccupant[];
    selectedObjectIds?: Set<string>;
    inlineCategories?: InlineCategoryConfig[];
    npcColor?: string;
    playerColor?: string;
    objectColor?: string;
    roomColor?: string;
}

export class Tokenizer {
    private static readonly KNOWN_XML_TAGS = new Set([
        'room', 'name', 'description', 'character', 'player', 'object', 'header', 'enemy',
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
    private occupantMatchCounts: Record<string, number> = {};

    private static instance: Tokenizer | null = null;

    public static getInstance(): Tokenizer {
        if (!this.instance) {
            this.instance = new Tokenizer();
        }
        return this.instance;
    }

    public static tokenize(textRaw: string, context: TokenizerContext, initialLoc?: string): Token[] {
        return this.getInstance().tokenize(textRaw, context, initialLoc);
    }

    public reset(loc: string = 'room') {
        this.currentLocation = loc;
        this.currentParent = null;
        this.currentStyle = {};
    }

    public resetOccupantMatches() {
        this.occupantMatchCounts = {};
    }

    /**
     * Main entry point for tokenizing game output.
     * Parses mixed ANSI and XML tags into a unified AST.
     */
    public tokenize(textRaw: string, context: TokenizerContext, initialLoc?: string, preserveOccupantMatches: boolean = false): Token[] {
        if (initialLoc) {
            this.currentLocation = initialLoc;
        }
        if (!preserveOccupantMatches) {
            this.resetOccupantMatches();
        }
        const tokens: Token[] = [];
        const textToScan = this.normalizeEscapedXmlDelimiters(textRaw);
        
        // Entity Tracking
        let activeEntity: {
            tag: string;
            kind: 'npc' | 'player' | 'object' | 'room' | 'exit' | 'none';
            metadata: any;
            content: string;
            style: React.CSSProperties;
            stack?: string[];
        } | null = null;
        
        // Active tag stack for nested classification
        const tagStack: string[] = [];

        // Scanner for XML tags and ANSI codes
        const scanner = /<(\/?[a-zA-Z0-9\-_]+)([^>]*?)\/?>|\x1b\[[0-9;]*m/g;
        let match;
        let lastIndex = 0;

        while ((match = scanner.exec(textToScan)) !== null) {
            const [fullMatch, tagName, attributes] = match;

            if (match.index > lastIndex) {
                const content = textToScan.substring(lastIndex, match.index);
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
                    if (!this.isPresentationOnlyTag(fullMatch)) {
                        this.handleText(fullMatch, tokens, this.currentStyle, activeEntity, context);
                    }
                }
            }
        }

        if (lastIndex < textToScan.length) {
            this.handleText(textToScan.substring(lastIndex), tokens, this.currentStyle, activeEntity, context);
        }
        
        if (activeEntity) this.emitEntity(activeEntity, tokens, context);

        return tokens;
    }

    private normalizeEscapedXmlDelimiters(text: string): string {
        if (!text || !/&(?:lt|gt);/i.test(text)) return text;
        return text
            .replace(/&lt;/gi, '<')
            .replace(/&gt;/gi, '>');
    }

    private isPresentationOnlyTag(tag: string): boolean {
        return /^<\/?(?:wielded|worn\b[^>]*)>$/i.test(tag);
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
        if (lower.includes('you stop using')) this.currentLocation = 'carried';
        else if (lower.includes('you wear') || lower.includes('you wield') || lower.includes('you start using')) this.currentLocation = 'worn';
        else if (lower.includes('carrying')) this.currentLocation = 'carried';
        else if (lower.includes('using') || lower.includes('equipped')) this.currentLocation = 'worn';
        else if (lower.includes('in the') || lower.includes('contents')) this.currentLocation = 'container';
        else if (lower.includes('obvious exits')) this.currentLocation = 'room';

        if (activeEntity) {
            activeEntity.content += decoded;
            return;
        }

        const occupantTokens = this.tokenizeKnownOccupants(decoded, context, style);
        if (occupantTokens) {
            tokens.push(...occupantTokens);
            return;
        }

        const players = context?.registeredPlayers || [];
        if (players.length > 0) {
            const validNames = players.filter(n => n.length > 2);
            if (validNames.length > 0) {
                const namePattern = `(${validNames.map(n => this.escapeRegExp(n)).join('|')})`;
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
                        category: 'cat-ally',
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

    private tokenizeKnownOccupants(
        decoded: string,
        context: TokenizerContext | undefined,
        style: React.CSSProperties
    ): Token[] | null {
        const occupants = context?.currentOccupants || [];
        const validTypes = new Set(['ally', 'enemy', 'neutral', 'npc']);
        const candidates = occupants
            .filter(o => o.type && validTypes.has(o.type.toLowerCase()))
            .flatMap(o => this.getOccupantPatterns(o).map(pattern => ({ occupant: o, pattern })))
            .sort((a, b) => b.pattern.length - a.pattern.length);

        if (candidates.length === 0) return null;

        const escaped = candidates.map(c => this.escapeRegExp(c.pattern));
        const pattern = new RegExp(`(^|[^a-zA-Z0-9\\u00C0-\\u00FF])(${escaped.join('|')})(?=$|[^a-zA-Z0-9\\u00C0-\\u00FF])`, 'gi');
        const out: Token[] = [];
        let lastIdx = 0;
        let matched = false;
        let match;

        while ((match = pattern.exec(decoded)) !== null) {
            const boundary = match[1] || '';
            const content = match[2];
            const startIdx = match.index + boundary.length;
            const candidate = this.resolveOccupantCandidate(candidates, content, occupants);
            if (!candidate) continue;

            if (startIdx > lastIdx) {
                this.pushText(decoded.substring(lastIdx, startIdx), out, style);
            }

            const gmcpType = candidate.occupant.type!.toLowerCase();
            const commandTarget = this.getOccupantCommandTarget(candidate.occupant, content, occupants);
            out.push({
                type: 'entity',
                content,
                entityId: String(candidate.occupant.id ?? `auto-${content.toLowerCase().replace(/[^a-z0-9]/g, '-')}`),
                metadata: {
                    kind: gmcpType === 'npc' ? 'npc' : gmcpType === 'enemy' ? 'enemy' : gmcpType === 'neutral' ? 'neutral' : gmcpType === 'ally' ? 'ally' : 'player',
                    category: toCategoryId(gmcpType) || 'cat-npc',
                    context: commandTarget,
                    location: 'room',
                    action: 'menu',
                    style,
                    occupantId: candidate.occupant.id
                }
            } as EntityToken);

            lastIdx = pattern.lastIndex;
            matched = true;
        }

        if (!matched) return null;
        if (lastIdx < decoded.length) {
            this.pushText(decoded.substring(lastIdx), out, style);
        }
        return out;
    }

    private getOccupantPatterns(occupant: GmcpOccupant): string[] {
        return [occupant.name, occupant.short, occupant.keyword]
            .filter((value): value is string => !!value && value.trim().length > 1)
            .map(value => value.trim());
    }

    private getBaseCommandKeyword(occupant: GmcpOccupant, fallback: string): string {
        return getOccupantCommandKeyword(occupant, fallback);
    }

    private getMatchingOccupants(occupants: GmcpOccupant[], target: GmcpOccupant, fallback: string): GmcpOccupant[] {
        const base = this.getBaseCommandKeyword(target, fallback);
        return occupants.filter(occupant => this.getBaseCommandKeyword(occupant, fallback) === base);
    }

    private getOccupantCommandTarget(occupant: GmcpOccupant, fallback: string, occupants: GmcpOccupant[]): string {
        const base = this.getBaseCommandKeyword(occupant, fallback);
        const matching = this.getMatchingOccupants(occupants, occupant, fallback);
        const index = matching.findIndex(entry => String(entry.id) === String(occupant.id));
        return matching.length > 1 && index >= 0 ? `${index + 1}.${base}` : base;
    }

    private resolveOccupantCandidate(
        candidates: Array<{ occupant: GmcpOccupant; pattern: string }>,
        content: string,
        occupants: GmcpOccupant[]
    ): { occupant: GmcpOccupant; pattern: string } | undefined {
        const exact = candidates.filter(c => c.pattern.toLowerCase() === content.toLowerCase());
        if (exact.length === 0) return undefined;

        const base = this.getBaseCommandKeyword(exact[0].occupant, content);
        const sameTarget = occupants.filter(occupant => this.getBaseCommandKeyword(occupant, content) === base);
        const used = this.occupantMatchCounts[base] || 0;
        const occupant = sameTarget[used] || sameTarget[sameTarget.length - 1] || exact[0].occupant;
        this.occupantMatchCounts[base] = used + 1;
        return exact.find(c => String(c.occupant.id) === String(occupant.id)) || { occupant, pattern: content };
    }

    private stripOccupantMarkers(value: string): string {
        return value.trim().replace(/^[\*\-]+|[\*\-]+$/g, '').trim().toLowerCase();
    }

    private resolveXmlOccupant(xmlId: string | null, content: string, occupants: GmcpOccupant[]): GmcpOccupant | undefined {
        if (xmlId) return occupants.find(o => String(o.id) === xmlId);

        const lowerContent = this.stripOccupantMarkers(content);
        const matches = occupants.filter(occupant => {
            const names = [occupant.name, occupant.short, occupant.keyword]
                .filter((value): value is string => !!value)
                .map(value => this.stripOccupantMarkers(value).replace(/-/g, ' '));
            return names.some(name => lowerContent.includes(name) || name.includes(lowerContent));
        });
        if (matches.length === 0) return undefined;

        const base = this.getBaseCommandKeyword(matches[0], content);
        const sameTarget = occupants.filter(occupant => this.getBaseCommandKeyword(occupant, content) === base);
        const used = this.occupantMatchCounts[base] || 0;
        const occupant = sameTarget[used] || sameTarget[sameTarget.length - 1] || matches[0];
        this.occupantMatchCounts[base] = used + 1;
        return occupant;
    }

    private escapeRegExp(value: string): string {
        return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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
        let { kind, metadata, content } = activeEntity;
        if (!content.trim()) return;

        let category = 'none';
        if (kind === 'player') category = 'cat-ally';
        else if (kind === 'enemy') category = 'cat-enemy';
        else if (kind === 'npc') category = 'cat-npc';
        else if (kind === 'object') {
            if (this.currentLocation === 'carried') category = 'cat-inventory-object';
            else if (this.currentLocation === 'worn') category = 'cat-worn-object';
            else category = 'cat-room-object';
        }
        else if (kind === 'room') category = 'cat-room';
        else if (kind === 'exit') category = 'cat-exit';

        if (metadata.type) {
            const t = metadata.type.toLowerCase();
            if (t === 'enemy' || t === 'ally' || t === 'neutral' || t === 'npc') {
                kind = t;
            }
            // Resolve via alias map; NPC subtypes (shopkeeper, innkeeper, etc.) fall back to cat-npc
            category = toCategoryId(t) || toCategoryId(`inline-${t}`) || 'cat-npc';
        }

        // Text-marker fallback when no explicit type attribute is present:
        // *name* → enemy, -name- → neutral. MUME often wraps the desc this way.
        if (!metadata.type && (kind === 'npc' || kind === 'player' || kind === 'ally')) {
            const trimmed = content.trim();
            if (/^\*.+\*$/.test(trimmed)) {
                kind = 'enemy';
                category = 'cat-enemy';
            } else if (/^-.+-$/.test(trimmed)) {
                kind = 'neutral';
                category = 'cat-neutral';
            }
        }

        // --- Room Context Override ---
        // If we are explicitly within a <room> tag (check stack or current context), 
        // the user wants these to be room buttons.
        if (activeEntity.tag === 'name' && activeEntity.stack?.includes('room')) {
            category = 'cat-room';
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

        // For character entities, resolve the command keyword from GMCP occupant data.
        // MUME's XML may tag a race/title word (e.g. "Noldo") rather than the actual
        // character name ("Elletestmage"). The GMCP name is the canonical keyword.
        let resolvedContext = content;
        let resolvedEntityId = metadata.id || `auto-${content.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
        const isCharacterKind = kind === 'player' || kind === 'npc' || kind === 'ally' || kind === 'enemy' || kind === 'neutral';
        if (isCharacterKind && context.currentOccupants?.length) {
            // Resolve GMCP occupant using ID first (unambiguous), then GMCP name.
            // MUME XML tags may carry an id attribute that maps directly to Room.Chars id.
            // If not, match by name: GMCP name is a substring of (or equal to) the XML content.
            const xmlId = metadata.id != null ? String(metadata.id) : null;
            const matched = this.resolveXmlOccupant(xmlId, content, context.currentOccupants);
            if (matched) {
                resolvedContext = this.getOccupantCommandTarget(matched, content, context.currentOccupants);
                resolvedEntityId = String(matched.id ?? resolvedEntityId);
            }
        }

        tokens.push({
            type: 'entity',
            content,
            entityId: resolvedEntityId,
            metadata: {
                kind,
                category,
                context: resolvedContext,
                location: this.currentLocation,
                parent: this.currentParent,
                action: 'menu',
                style: activeEntity.style,
                glowColor,
                occupantId: resolvedEntityId,
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

        if (fullStack.includes('enemy')) return 'enemy';
        if (fullStack.includes('character')) {
            return fullStack.includes('player') ? 'player' : 'npc';
        }
        if (fullStack.includes('player')) return 'player';
        if (fullStack.includes('object')) return 'object';
        if (lowerTag === 'name' && fullStack.includes('room')) return 'none';
        if (fullStack.includes('exit')) return 'none';

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
