/**
 * @file parser.worker.ts
 * @description Web Worker entrypoint for CPU-heavy telnet text tokenization.
 */

import { Tokenizer } from './Tokenizer';
import { ParserWorkerRequest, ParserWorkerMessage, TokenizedLine } from './parserWorkerTypes';

const tokenizeChunk = (request: ParserWorkerRequest): TokenizedLine[] => {
    const tokenizer = Tokenizer.getInstance();
    tokenizer.resetOccupantMatches();

    return request.chunkLines.map(entry => {
        const line = typeof entry === 'string' ? entry : entry.line;
        const isPrompt = typeof entry === 'string' ? false : entry.isPrompt;

        tokenizer.reset('room');
        return {
            line,
            isPrompt,
            tokens: tokenizer.tokenize(line, request.context, undefined, true),
        };
    });
};

self.onmessage = (event: MessageEvent<ParserWorkerRequest>) => {
    const startedAt = performance.now();
    try {
        const lines = tokenizeChunk(event.data);
        const message: ParserWorkerMessage = {
            id: event.data.id,
            ok: true,
            lines,
            durationMs: performance.now() - startedAt,
        };
        self.postMessage(message);
    } catch (error) {
        const message: ParserWorkerMessage = {
            id: event.data.id,
            ok: false,
            error: error instanceof Error ? error.message : String(error),
        };
        self.postMessage(message);
    }
};
