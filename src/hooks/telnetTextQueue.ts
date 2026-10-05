/**
 * @file Processes received game text promptly while keeping large bursts incremental.
 */
// --- Logic Section ---

import { PipelineOrchestrator } from '../services/parser/PipelineOrchestrator';
import { parserWorkerClient } from '../services/parser/parserWorkerClient';
import type { TokenizerContext } from '../services/parser/Tokenizer';
import type { TokenizedLine, WorkerLineEntry } from '../services/parser/parserWorkerTypes';

const DIRECT_LINE_LIMIT = 8;
const WORKER_SLICE_SIZE = 16;

export async function processIncomingTextChunk(
    entries: WorkerLineEntry[],
    buildContext: () => TokenizerContext,
    processLine: (line: string, tokens?: unknown, chunkEffects?: Set<string>) => void,
    isAccountMode: boolean
): Promise<void> {
    const chunkEffects = new Set<string>();
    const dispatchLine = (line: string, tokens?: unknown) => processLine(line, tokens, chunkEffects);

    if (isAccountMode) {
        let sliceStartedAt = performance.now();
        for (let index = 0; index < entries.length; index++) {
            const entry = entries[index];
            dispatchLine(typeof entry === 'string' ? entry : entry.line);
            if (index % 8 === 7 && document.visibilityState !== 'hidden' && performance.now() - sliceStartedAt > 8) {
                await new Promise<void>(resolve => window.setTimeout(resolve, 0));
                sliceStartedAt = performance.now();
            }
        }
        return;
    }

    // Most command replies are only a line or two. Avoid a worker round trip
    // before those lines can reach the visible log.
    if (entries.length <= DIRECT_LINE_LIMIT) {
        PipelineOrchestrator.ingestChunk(entries, buildContext, dispatchLine);
        return;
    }

    // Release the start of a large socket burst before waiting on the worker.
    // Later slices remain ordered, so prompts and captures see the original stream.
    PipelineOrchestrator.ingestChunk(entries.slice(0, DIRECT_LINE_LIMIT), buildContext, dispatchLine);

    for (let offset = DIRECT_LINE_LIMIT; offset < entries.length; offset += WORKER_SLICE_SIZE) {
        const slice = entries.slice(offset, offset + WORKER_SLICE_SIZE);
        const context = buildContext();
        let tokenized: TokenizedLine[];
        try {
            tokenized = await parserWorkerClient.tokenize(slice, context);
        } catch {
            PipelineOrchestrator.ingestChunk(slice, () => context, dispatchLine);
            continue;
        }

        let sliceStartedAt = performance.now();
        for (let index = 0; index < tokenized.length; index++) {
            const entry = tokenized[index];
            if (entry.isPrompt) (entry.tokens as TokenizedLine['tokens'] & { isPrompt?: boolean }).isPrompt = true;
            if (entry.isRedrawPrompt) (entry.tokens as TokenizedLine['tokens'] & { isRedrawPrompt?: boolean }).isRedrawPrompt = true;
            dispatchLine(entry.line, entry.tokens);

            if (index % 8 === 7 && document.visibilityState !== 'hidden' && performance.now() - sliceStartedAt > 8) {
                await new Promise<void>(resolve => window.setTimeout(resolve, 0));
                sliceStartedAt = performance.now();
            }
        }
    }
}
