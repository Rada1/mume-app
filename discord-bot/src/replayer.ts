/**
 * @file replayer.ts
 * @description Core playback logic for MUME session logs in Discord.
 */

export interface LogEntry {
  t: number; // timestamp offset from start in ms
  typ: 'rx' | 'tx' | 'gmcp' | 'ui' | 'sys';
  d: any; // data
}

export interface SessionLog {
  version: number;
  startTime: string;
  entries: LogEntry[];
  metadata: any;
}

export class Replayer {
  private log: SessionLog;
  private onMessage: (content: string) => Promise<void>;
  private isPlaying: boolean = false;
  private currentIndex: number = 0;
  private startTime: number = 0;
  private buffer: string = '';
  private bufferTimeout: NodeJS.Timeout | null = null;
  private readonly BATCH_WINDOW = 500; // ms to buffer before sending
  private readonly MAX_MESSAGE_LENGTH = 1900; // room for code block wrappers

  constructor(log: SessionLog, onMessage: (content: string) => Promise<void>) {
    this.log = log;
    this.onMessage = onMessage;
  }

  public async start() {
    if (this.isPlaying) return;
    this.isPlaying = true;
    this.currentIndex = 0;
    this.startTime = Date.now();
    this.scheduleNext();
  }

  public stop() {
    this.isPlaying = false;
    if (this.bufferTimeout) clearTimeout(this.bufferTimeout);
  }

  private scheduleNext() {
    if (!this.isPlaying || this.currentIndex >= this.log.entries.length) {
      this.flushBuffer();
      this.isPlaying = false;
      return;
    }

    const entry = this.log.entries[this.currentIndex];
    const delay = entry.t - (this.currentIndex > 0 ? this.log.entries[this.currentIndex - 1].t : 0);

    setTimeout(() => {
      this.processEntry(entry);
      this.currentIndex++;
      this.scheduleNext();
    }, delay);
  }

  private processEntry(entry: LogEntry) {
    if (entry.typ === 'rx' || entry.typ === 'tx') {
      let data = typeof entry.d === 'string' ? entry.d : JSON.stringify(entry.d);

      // Remove leading indentation from each line, preserving ANSI codes at the start
      data = data.replace(/^((?:\x1b\[[0-9;]*m)*)[ \t]+/gm, '$1');

      this.appendToBuffer(data);
    }
  }

  private appendToBuffer(text: string) {
    // If adding this text would exceed discord limit, flush first
    if (this.buffer.length + text.length > this.MAX_MESSAGE_LENGTH) {
      this.flushBuffer();
    }

    this.buffer += text + '\n';

    // Reset the batch window timer
    if (this.bufferTimeout) clearTimeout(this.bufferTimeout);
    this.bufferTimeout = setTimeout(() => this.flushBuffer(), this.BATCH_WINDOW);
  }

  private async flushBuffer() {
    if (!this.buffer.trim()) return;

    const content = this.buffer.trim();
    this.buffer = '';
    if (this.bufferTimeout) clearTimeout(this.bufferTimeout);
    this.bufferTimeout = null;

    try {
      await this.onMessage(`\`\`\`ansi\n${content}\n\`\`\``);
    } catch (err) {
      console.error('[Replayer] Error sending message:', err);
    }
  }
}
