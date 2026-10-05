/**
 * @file DecodedAudioCache.ts
 * @description Keeps recently used decoded sounds within a fixed memory budget.
 */

// --- Logic Section ---

interface CachedBuffer {
    buffer: AudioBuffer;
    bytes: number;
}

export class DecodedAudioCache {
    private readonly buffers = new Map<string, CachedBuffer>();
    private usedBytes = 0;

    constructor(private readonly maxBytes: number) { }

    get(url: string): AudioBuffer | undefined {
        const cached = this.buffers.get(url);
        if (!cached) return undefined;
        this.buffers.delete(url);
        this.buffers.set(url, cached);
        return cached.buffer;
    }

    set(url: string, buffer: AudioBuffer): void {
        const bytes = buffer.length * buffer.numberOfChannels * Float32Array.BYTES_PER_ELEMENT;
        const previous = this.buffers.get(url);
        if (previous) {
            this.buffers.delete(url);
            this.usedBytes -= previous.bytes;
        }
        if (bytes > this.maxBytes) return;

        while (this.usedBytes + bytes > this.maxBytes) {
            const oldestUrl = this.buffers.keys().next().value;
            if (oldestUrl === undefined) break;
            this.usedBytes -= this.buffers.get(oldestUrl)!.bytes;
            this.buffers.delete(oldestUrl);
        }
        this.buffers.set(url, { buffer, bytes });
        this.usedBytes += bytes;
    }
}
