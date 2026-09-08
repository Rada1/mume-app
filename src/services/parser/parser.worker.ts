/**
 * @file parser.worker.ts
 * @description Web worker for asynchronous parser tokenization.
 */

import { Tokenizer } from './Tokenizer';
import {
    ParserWorkerRequest,
    ParserWorkerResponse,
} from './parserWorkerTypes';

self.onmessage = (event: MessageEvent<ParserWorkerRequest>) => {
    const { id, chunkLines, context } = event.data;
    const startedAt = performance.now();

    try {
        const tokenizer = Tokenizer.getInstance();
        tokenizer.resetOccupantMatches();

        const lines = chunkLines.map(entry => {
            const line = typeof entry === 'string' ? entry : entry.line;
            const isPrompt = typeof entry === 'string' ? false : entry.isPrompt;
            tokenizer.reset('room');
            return {
                line,
                isPrompt,
                tokens: tokenizer.tokenize(line, context, undefined, true),
            };
        });

        const durationMs = performance.now() - startedAt;
        const response: ParserWorkerResponse = {
            id,
            ok: true,
            lines,
            durationMs,
        };
        self.postMessage(response);
    } catch (error) {
        self.postMessage({
            id,
            ok: false,
            error: error instanceof Error ? error.message : String(error),
        });
    }
};
