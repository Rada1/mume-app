// @vitest-environment jsdom
/**
 * @file gameUtils.test.ts
 * @description Unit tests for game utilities, specifically room description element detection.
 */

import { describe, it, expect } from 'vitest';
import { isInsideRoomDescription } from './gameUtils';

describe('isInsideRoomDescription', () => {
    it('returns false for null elements', () => {
        expect(isInsideRoomDescription(null)).toBe(false);
    });

    it('returns false for standard message elements', () => {
        const div = document.createElement('div');
        div.className = 'message combat';
        const span = document.createElement('span');
        span.className = 'inline-btn';
        div.appendChild(span);
        expect(isInsideRoomDescription(span)).toBe(false);
    });

    it('identifies elements inside .room-desc-line', () => {
        const container = document.createElement('div');
        container.className = 'room-desc-line';
        const span = document.createElement('span');
        span.className = 'inline-btn';
        container.appendChild(span);
        expect(isInsideRoomDescription(span)).toBe(true);
    });

    it('identifies elements inside .room-description-merged', () => {
        const container = document.createElement('div');
        container.className = 'room-description-merged';
        const span = document.createElement('span');
        span.className = 'inline-btn';
        container.appendChild(span);
        expect(isInsideRoomDescription(span)).toBe(true);
    });

    it('identifies elements inside .room-description message', () => {
        const container = document.createElement('div');
        container.className = 'message room-description';
        const span = document.createElement('span');
        span.className = 'inline-btn';
        container.appendChild(span);
        expect(isInsideRoomDescription(span)).toBe(true);
    });

    it('identifies elements with data-type="room-description"', () => {
        const container = document.createElement('div');
        container.setAttribute('data-type', 'room-description');
        const span = document.createElement('span');
        span.className = 'inline-btn';
        container.appendChild(span);
        expect(isInsideRoomDescription(span)).toBe(true);
    });

    it('identifies elements inside .room-desc (StickyRoomHeader)', () => {
        const container = document.createElement('div');
        container.className = 'message-content room-desc';
        const span = document.createElement('span');
        span.className = 'inline-btn';
        container.appendChild(span);
        expect(isInsideRoomDescription(span)).toBe(true);
    });

    it('identifies elements with data-category="cat-room" or "room"', () => {
        const span = document.createElement('span');
        span.className = 'inline-btn';
        span.setAttribute('data-category', 'cat-room');
        expect(isInsideRoomDescription(span)).toBe(true);

        const span2 = document.createElement('span');
        span2.className = 'inline-btn';
        span2.setAttribute('data-category', 'room');
        expect(isInsideRoomDescription(span2)).toBe(true);
    });

    it('identifies elements with data-room-context="true"', () => {
        const span = document.createElement('span');
        span.className = 'inline-btn';
        span.setAttribute('data-room-context', 'true');
        expect(isInsideRoomDescription(span)).toBe(true);
    });
});
