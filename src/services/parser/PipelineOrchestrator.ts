import { Tokenizer, TokenizerContext } from './Tokenizer';
import { MessageType, Message } from '../../types';

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
        chunkLines: string[],
        contextBuilder: () => TokenizerContext,
        processLineCallback: (line: string, tokens: any) => void
    ) {
        // Here we first ensure any GMCP packets in the queue have been flushed
        // Because ingestGmcp is called synchronously during ProtocolHandler processing,
        // all GMCP updates for this chunk are already applied to Zustand stores.

        // Then we retrieve the freshest possible TokenizerContext from the stores
        const context = contextBuilder();

        // Finally we iterate over the text lines in this chunk and process them
        // using the single, synchronized context
        for (const textRaw of chunkLines) {
             const tokens = Tokenizer.tokenize(textRaw, context);
             processLineCallback(textRaw, tokens);
        }
    }

    // Simple pass-through structure to process individual text lines securely
    public static processTextLine(
        textRaw: string,
        ansiHtml: string,
        type: MessageType,
        context: TokenizerContext
    ): Message {
        // Build robust AST tokens from ANSI string matching rules
        const tokens = Tokenizer.tokenize(textRaw, context);

        return {
            id: Math.random().toString(36).substring(7),
            type,
            textRaw,
            textOnly: textRaw.replace(/\x1b\[[0-9;]*m/g, ''),
            html: ansiHtml,
            tokens,
            timestamp: Date.now()
        };
    }
}
