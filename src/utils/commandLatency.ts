/** @file commandLatency.ts — Isolated-command input, received-text, and log-commit timings. */
// --- Collection Section ---
class CommandLatency {
    private active = false;
    private lastInput: number | null = null;
    private outstanding = 0;
    private pending: {press: number | null; sent: number; text: number | null; message: string | null} | null = null;
    private samples: {pressToSendMs: number | null; sendToTextMs: number; textToCommitMs: number; pressToCommitMs: number | null}[] = [];
    private skipped = 0;
    private onPointer = (event: Event) => this.recordInput(event.timeStamp);
    private onKey = (event: KeyboardEvent) => { if (event.key === 'Enter') this.recordInput(event.timeStamp); };

    set enabled(value: boolean) {
        if (value === this.active) return;
        this.active = value;
        this.reset();
        if (typeof document === 'undefined') return;
        const method = value ? 'addEventListener' : 'removeEventListener';
        document[method]('pointerdown', this.onPointer, true);
        document[method]('keydown', this.onKey, true);
    }
    recordInput(at?: number): void {
        if (!this.active) return;
        const now = performance.now();
        this.lastInput = at !== undefined && at >= 0 && at <= now && now - at < 5000 ? at : now;
    }
    recordSend(measured: boolean): void {
        if (!this.active) return;
        const sent = performance.now();
        if (this.outstanding > 0) {
            if (this.pending) this.skipped++;
            this.pending = null;
        } else {
            this.pending = measured ? {sent, press: this.lastInput !== null && sent - this.lastInput < 5000 ? this.lastInput : null,
                text: null, message: null} : null;
        }
        this.outstanding++;
        this.lastInput = null;
    }
    recordText(): void {
        if (this.active && this.pending && this.pending.text === null) this.pending.text = performance.now();
    }
    recordPrompt(): void { if (this.active) this.outstanding = Math.max(0, this.outstanding - 1); }
    recordOutput(message: string): void {
        if (this.active && this.pending && this.pending.text !== null && !this.pending.message) this.pending.message = message;
    }
    recordCommit(message: string): void {
        const pending = this.pending;
        if (!this.active || !pending || pending.text === null || pending.message !== message) return;
        const committed = performance.now();
        this.samples.push({pressToSendMs: pending.press === null ? null : pending.sent - pending.press,
            sendToTextMs: pending.text - pending.sent, textToCommitMs: committed - pending.text,
            pressToCommitMs: pending.press === null ? null : committed - pending.press});
        if (this.samples.length > 120) this.samples.shift();
        this.pending = null;
    }
    reset(): void { this.pending = null; this.lastInput = null; this.outstanding = 0; this.samples = []; this.skipped = 0; }
    getSnapshot() { return {last: this.samples[this.samples.length - 1] ?? null, count: this.samples.length, skipped: this.skipped}; }
}
export const commandLatency = new CommandLatency();
