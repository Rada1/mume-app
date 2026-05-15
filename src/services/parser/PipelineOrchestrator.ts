import { Tokenizer, TokenizerContext } from './Tokenizer';
import { MessageType, Message, Token, EntityToken, AnsiToken, TextToken } from '../../types';
import { gmcpBus } from '../../events/gmcpBus';
import { renderInlineSpan } from '../../utils/inlineSpanRenderer';

// The Orchestrator handles processing the raw Telnet buffer chunks
// resolving network racing conditions
export class PipelineOrchestrator {
    private static gmcpQueue: Array<any> = [];
    private static textQueue: Array<string> = [];
    private static gmcpHandler: ((pkg: string, data: any) => void) | null = null;

    // Registers the GMCP decoder so we can dispatch packets
    public static registerGmcpHandler(handler: (pkg: string, data: any) => void) {
        this.gmcpHandler = handler;
    }

    public static ingestGmcp(pkg: string, data: any) {
        if (this.gmcpHandler) {
            // Process GMCP instantly and synchronously so stores update before text is tokenized
            this.gmcpHandler(pkg, data);
        }
    }

    public static ingestChunk(
        chunkLines: (string | { line: string, isPrompt: boolean })[],
        contextBuilder: () => TokenizerContext,
        processLineCallback: (line: string, tokens: any) => void
    ) {
        // Retrieve the freshest possible TokenizerContext from the stores
        const context = contextBuilder();
        const tokenizer = Tokenizer.getInstance();
        tokenizer.resetOccupantMatches();

        // Iterate over the text lines in this chunk and process them
        // using the single, synchronized context
        for (const entry of chunkLines) {
             const textRaw = typeof entry === 'string' ? entry : entry.line;
             const isPrompt = typeof entry === 'string' ? false : entry.isPrompt;
             
             tokenizer.reset('room');
             const tokens = tokenizer.tokenize(textRaw, context, undefined, true);
             if (isPrompt) {
                 (tokens as any).isPrompt = true;
             }
             
             processLineCallback(textRaw, tokens);
        }
    }

    // Simple pass-through structure to process individual text lines securely
    public static processTextLine(
        textRaw: string,
        ansiHtml: string,
        type: MessageType,
        context: TokenizerContext,
        providedTokens?: Token[]
    ): Message {
        const tokens = providedTokens || (() => {
            const tokenizer = Tokenizer.getInstance();
            tokenizer.reset('room');
            return tokenizer.tokenize(textRaw, context);
        })();
        const textOnly = tokens.map(t => t.content).join('');
        
        // Generate actual interactive HTML from the tokens
        const tokenHtml = this.tokensToHtml(tokens);

        return {
            id: Math.random().toString(36).substring(7),
            type,
            textRaw,
            textOnly,
            html: tokenHtml,
            tokens,
            timestamp: Date.now()
        };
    }

    private static escapeHtml(text: string): string {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }

    private static tokensToHtml(tokens: Token[]): string {
        return tokens.map(token => {
            if (token.type === 'text') {
                return this.escapeHtml((token as TextToken).content);
            } else if (token.type === 'ansi') {
                const ansi = token as AnsiToken;
                const escaped = this.escapeHtml(ansi.content);
                if (!ansi.style || Object.keys(ansi.style).length === 0) return escaped;
                const styleStr = Object.entries(ansi.style)
                    .map(([k, v]) => `${k.replace(/[A-Z]/g, m => '-' + m.toLowerCase())}:${v}`)
                    .join(';');
                return `<span style="${styleStr}">${escaped}</span>`;
            } else if (token.type === 'entity') {
                const entity = token as EntityToken;
                const metadata = entity.metadata || {};
                
                // Construct props for renderInlineSpan
                return renderInlineSpan({
                    id: entity.entityId,
                    mid: '', // Will be filled by useMessageLog
                    cmd: metadata.category || 'none',
                    context: metadata.context || entity.content,
                    category: metadata.category,
                    action: metadata.action || 'menu',
                    glowColor: metadata.glowColor,
                    textColor: (metadata.style as any)?.color,
                    innerHtml: entity.content
                });
            }
            return token.content;
        }).join('');
    }
}
