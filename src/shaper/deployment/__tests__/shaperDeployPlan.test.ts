/**
 * @file shaperDeployPlan.test.ts
 * @description Tests for folding flat preview lines into deploy steps.
 */

import { describe, expect, it } from 'vitest';
import { extractEditorBody, planShaperDeploy } from '../shaperDeployPlan';

// --- Test Section ---
describe('planShaperDeploy', () => {
    it('keeps standalone commands as auto-sendable single-line steps', () => {
        const steps = planShaperDeploy([
            '/at 300:00 /room sector field',
            '/at 300:00 /room flag @dark'
        ]);
        expect(steps).toHaveLength(2);
        expect(steps.every(step => !step.requiresEditor)).toBe(true);
        expect(steps[0].lines).toEqual(['/at 300:00 /room sector field']);
    });

    it('folds an opener plus indented lines into one manual editor step', () => {
        const steps = planShaperDeploy([
            '/at 300:00 /room description',
            '  A quiet glade.',
            '  [save editor]',
            '/at 300:00 /room owner builder'
        ]);
        expect(steps).toHaveLength(2);
        expect(steps[0].requiresEditor).toBe(true);
        expect(steps[0].lines).toHaveLength(3);
        expect(steps[1].requiresEditor).toBe(false);
        expect(steps[1].text).toBe('/at 300:00 /room owner builder');
    });

    it('extracts editor body without opener, marker, or indent', () => {
        const body = extractEditorBody([
            '/at 300:00 /room description',
            '  A quiet glade.',
            '  Sun filters through the leaves.',
            '  [save editor]'
        ]);
        expect(body).toBe('A quiet glade.\nSun filters through the leaves.');
    });
});
