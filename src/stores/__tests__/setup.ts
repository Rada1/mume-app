import { vi } from 'vitest';

// Mock window.dispatchEvent for mapper events
if (typeof window !== 'undefined') {
  window.dispatchEvent = vi.fn();
}

// Mock other browser globals if necessary
global.window = (global.window || {}) as any;
global.CustomEvent = class CustomEvent {
    type: string;
    detail: any;
    constructor(type: string, detail?: any) {
        this.type = type;
        this.detail = detail;
    }
} as any;