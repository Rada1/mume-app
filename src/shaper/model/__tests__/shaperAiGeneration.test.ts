/**
 * @file shaperAiGeneration.test.ts
 * @description Regression tests for Shaper AI prompt guidance and response parsing.
 */

import { describe, expect, it } from 'vitest';
import { buildShaperAiPromptSpec, selectShaperOllamaModel, textFromGeneratedPayload } from '../shaperAiGeneration';

// --- Test Section ---
describe('buildShaperAiPromptSpec', () => {
    it('includes builder-guide rules for room descriptions', () => {
        const spec = buildShaperAiPromptSpec('room-description', {
            roomNumber: '31:80',
            name: 'field',
            sector: 'field'
        });

        expect(spec.prompt).toContain('MUME builder guide rules');
        expect(spec.prompt).toContain('at least three full lines');
        expect(spec.prompt).toContain('under 80 characters');
        expect(spec.prompt).toContain('description body');
        expect(spec.prompt).toContain('Do not force player emotions');
        expect(spec.prompt).toContain('creative canon');
        expect(spec.prompt).toContain('fresh');
        expect(spec.samplePayload.description).toContain('\n');
    });

    it('includes room-name capitalization and preposition guidance', () => {
        const spec = buildShaperAiPromptSpec('room-name', {
            roomNumber: '31:80',
            sector: 'field'
        });

        expect(spec.prompt).toContain('three or four words');
        expect(spec.prompt).toContain('Use title case for room names');
        expect(spec.prompt).toContain('You are <preposition> <name>');
        expect(spec.prompt).toContain('currentNameToReplace');
        expect(spec.samplePayload).toEqual({ name: 'a Mossy Hollow', preposition: 'in' });
    });

    it('compacts long existing prose before prompting local models', () => {
        const spec = buildShaperAiPromptSpec('room-description', {
            description: 'old text '.repeat(200),
            lore: 'ancient lore '.repeat(200)
        });

        expect(spec.prompt.length).toBeLessThan(4000);
        expect(spec.prompt).toContain('old text');
        expect(spec.prompt).toContain('ancient lore');
    });
});

describe('textFromGeneratedPayload', () => {
    it('unwraps Ollama schema-shaped properties payloads', () => {
        const text = textFromGeneratedPayload(
            { properties: { description: 'A clean room description.' } },
            ['description']
        );

        expect(text).toBe('A clean room description.');
    });
});

describe('selectShaperOllamaModel', () => {
    it('prefers a non-thinking completion model over the first listed model', () => {
        const selected = selectShaperOllamaModel({
            models: [
                { name: 'gemma4:e2b', capabilities: ['completion', 'thinking'] },
                { name: 'nomic-embed-text:latest', capabilities: ['embedding'] },
                { name: 'gemma3:4b', capabilities: ['completion'] }
            ]
        });

        expect(selected).toBe('gemma3:4b');
    });

    it('honors an explicit Ollama model preference', () => {
        const selected = selectShaperOllamaModel(
            { models: [{ name: 'gemma3:4b', capabilities: ['completion'] }] },
            'gemma4:e2b'
        );

        expect(selected).toBe('gemma4:e2b');
    });
});
