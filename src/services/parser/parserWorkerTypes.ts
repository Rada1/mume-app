/**
 * @file parserWorkerTypes.ts
 * @description Shared message contracts for off-main-thread text tokenization.
 */

import { Token } from '../../types';
import { TokenizerContext } from './Tokenizer';

export type WorkerLineEntry = string | { line: string; isPrompt: boolean };

export interface TokenizedLine {
    line: string;
    isPrompt: boolean;
    tokens: Token[];
}

export interface ParserWorkerRequest {
    id: number;
    chunkLines: WorkerLineEntry[];
    context: TokenizerContext;
}

export interface ParserWorkerResponse {
    id: number;
    ok: true;
    lines: TokenizedLine[];
    durationMs: number;
}

export interface ParserWorkerErrorResponse {
    id: number;
    ok: false;
    error: string;
}

export type ParserWorkerMessage = ParserWorkerResponse | ParserWorkerErrorResponse;
