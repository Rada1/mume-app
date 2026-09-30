/**
 * @file Coalesces high-frequency pointer and camera changes before worker messages.
 */
// --- Logic Section ---

export type FrameRequest = (callback: () => void) => number;
export type FrameCancel = (handle: number) => void;

export class UpdateCoalescer<T> {
  private latest: T | null = null;
  private handle: number | null = null;

  constructor(
    private readonly send: (value: T) => void,
    private readonly request: FrameRequest = callback => requestAnimationFrame(callback),
    private readonly cancel: FrameCancel = handle => cancelAnimationFrame(handle),
  ) {}

  push(value: T): void {
    this.latest = value;
    if (this.handle !== null) return;
    this.handle = this.request(() => {
      this.handle = null;
      const latest = this.latest;
      this.latest = null;
      if (latest !== null) this.send(latest);
    });
  }

  dispose(): void {
    if (this.handle !== null) this.cancel(this.handle);
    this.handle = null;
    this.latest = null;
  }
}
