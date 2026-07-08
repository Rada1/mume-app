/**
 * @file captureBootstrap.test.ts
 * @description Regression tests for command-marked capture bootstrap behavior.
 */

import { describe, expect, it } from 'vitest';
import { canBootstrapExpectedCapture } from '../captureBootstrap';

// --- Tests Section ---

describe('captureBootstrap', () => {
    it('starts hover popover look and consider captures from plain response lines', () => {
        expect(canBootstrapExpectedCapture('examine')).toBe(true);
        expect(canBootstrapExpectedCapture('consider')).toBe(true);
    });

    it('does not bootstrap unknown capture stages', () => {
        expect(canBootstrapExpectedCapture('none')).toBe(false);
        expect(canBootstrapExpectedCapture('idle')).toBe(false);
    });
});
