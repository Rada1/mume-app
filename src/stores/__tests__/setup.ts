import { vi } from 'vitest';

// Mock window.dispatchEvent for mapper events
if (typeof window !== 'undefined') {
  window.dispatchEvent = vi.fn();
}

// Mock other browser globals if necessary
global.window = global.window || {};
global.CustomEvent = class CustomEvent {
  constructor(type, detail) {
    this.type = type;
    this.detail = detail;
  }
};
