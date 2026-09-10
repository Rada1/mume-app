/**
 * @file commandCompletionSounds.ts
 * @description Queues command-specific effects until MUME sends the next prompt.
 */

const COMPLETION_TIMEOUT_MS = 30_000;

interface PendingCompletionSound {
    effect: string;
    queuedAt: number;
}

const pendingCompletionSounds: PendingCompletionSound[] = [];

// --- Queue Logic ---

export const queueCommandCompletionSound = (effect: string): void => {
    pendingCompletionSounds.push({ effect, queuedAt: Date.now() });
};

export const consumeCommandCompletionSound = (): string | null => {
    const now = Date.now();
    while (pendingCompletionSounds.length > 0) {
        const pending = pendingCompletionSounds.shift();
        if (pending && now - pending.queuedAt <= COMPLETION_TIMEOUT_MS) {
            return pending.effect;
        }
    }
    return null;
};

export const clearCommandCompletionSounds = (): void => {
    pendingCompletionSounds.length = 0;
};
