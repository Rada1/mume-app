/**
 * @file parserWorkerClient.ts
 * @description Main-thread adapter for workerized parser tokenization.
 */

import { Tokenizer } from './Tokenizer';
import {
    ParserWorkerMessage,
    ParserWorkerRequest,
    TokenizedLine,
    WorkerLineEntry,
} from './parserWorkerTypes';
import type { TokenizerContext } from './Tokenizer';
import { perfMonitor } from '../../utils/perfMonitor';

interface PendingRequest {
    resolve: (lines: TokenizedLine[]) => void;
    reject: (error: Error) => void;
    timeout: ReturnType<typeof setTimeout>;
}

const WORKER_TIMEOUT_MS = 1000;

const tokenizeChunkSync = (
    chunkLines: WorkerLineEntry[],
    context: TokenizerContext
): TokenizedLine[] => {
    const tokenizer = Tokenizer.getInstance();
    tokenizer.resetOccupantMatches();

    return chunkLines.map(entry => {
        const line = typeof entry === 'string' ? entry : entry.line;
        const isPrompt = typeof entry === 'string' ? false : entry.isPrompt;
        const isRedrawPrompt = typeof entry === 'string' ? false : !!entry.isRedrawPrompt;
        tokenizer.reset('room');
        return {
            line,
            isPrompt,
            isRedrawPrompt,
            tokens: tokenizer.tokenize(line, context, undefined, true),
        };
    });
};

class ParserWorkerClient {
    private worker: Worker | null = null;
    private nextId = 1;
    private pending = new Map<number, PendingRequest>();
    private isDisabled = typeof Worker === 'undefined' || import.meta.env.MODE === 'test';
    private isReady = false;

    constructor() {
        if (!this.isDisabled && typeof window !== 'undefined') {
            const warm = () => { this.getWorker(); };
            if ('requestIdleCallback' in window) {
                window.requestIdleCallback(warm, { timeout: 1500 });
            } else {
                setTimeout(warm, 200);
            }
        }
    }

    tokenize(
        chunkLines: WorkerLineEntry[],
        context: TokenizerContext
    ): Promise<TokenizedLine[]> {
        if (this.isDisabled || typeof Worker === 'undefined') {
            return Promise.resolve(this.tokenizeOnMainThread(chunkLines, context));
        }

        const worker = this.getWorker();
        if (!worker || !this.isReady) {
            return Promise.resolve(this.tokenizeOnMainThread(chunkLines, context));
        }

        const id = this.nextId++;
        const request: ParserWorkerRequest = { id, chunkLines, context };

        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                this.pending.delete(id);
                this.disableWorker(new Error('Parser worker timed out'));
                resolve(this.tokenizeOnMainThread(chunkLines, context));
            }, WORKER_TIMEOUT_MS);
            this.pending.set(id, { resolve, reject, timeout });
            try {
                worker.postMessage(request);
            } catch (error) {
                clearTimeout(timeout);
                this.pending.delete(id);
                this.disableWorker(error);
                resolve(this.tokenizeOnMainThread(chunkLines, context));
            }
        });
    }

    private tokenizeOnMainThread(
        chunkLines: WorkerLineEntry[],
        context: TokenizerContext
    ): TokenizedLine[] {
        const startedAt = performance.now();
        const lines = tokenizeChunkSync(chunkLines, context);
        perfMonitor.recordParserTokenize('sync', performance.now() - startedAt);
        return lines;
    }

    private getWorker(): Worker | null {
        if (this.worker) return this.worker;

        try {
            this.worker = new Worker(new URL('./parser.worker.ts', import.meta.url), {
                type: 'module',
            });
            this.worker.onmessage = (event: MessageEvent<ParserWorkerMessage>) => {
                this.isReady = true;
                if (event.data.id === 0) return;
                const pending = this.pending.get(event.data.id);
                if (!pending) return;
                this.pending.delete(event.data.id);
                clearTimeout(pending.timeout);

                if ('error' in event.data) {
                    pending.reject(new Error(event.data.error));
                    return;
                }

                perfMonitor.recordParserTokenize('worker', event.data.durationMs);
                pending.resolve(event.data.lines);
            };
            this.worker.onerror = event => {
                this.disableWorker(event.message);
            };
            this.worker.postMessage({ id: 0, chunkLines: [], context: {} as TokenizerContext });
            return this.worker;
        } catch (error) {
            this.disableWorker(error);
            return null;
        }
    }

    private disableWorker(reason: unknown) {
        this.isDisabled = true;
        this.isReady = false;
        this.restartWorker(reason);
    }

    private restartWorker(reason: unknown) {
        if (this.worker) {
            this.worker.terminate();
            this.worker = null;
        }
        this.isReady = false;
        this.pending.forEach(pending => {
            clearTimeout(pending.timeout);
            pending.reject(new Error(reason instanceof Error ? reason.message : String(reason)));
        });
        this.pending.clear();
    }
}

export const parserWorkerClient = new ParserWorkerClient();

