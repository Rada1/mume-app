/**
 * @file shaperDeployPlan.ts
 * @description Turns the flat deploy-preview command list into ordered deploy
 *              steps, folding editor blocks (indented continuation lines) into
 *              a single manual step so they are never auto-sent verbatim.
 */

import type { ShaperDeployCommand } from './shaperDeployTypes';

const isContinuation = (line: string): boolean => line.startsWith('  ');

// --- Planner Section ---
export const planShaperDeploy = (commands: string[]): ShaperDeployCommand[] => {
    const steps: ShaperDeployCommand[] = [];
    let index = 0;
    let counter = 0;

    while (index < commands.length) {
        const line = commands[index];
        // Defensive: a continuation with no opener is treated as its own step.
        if (isContinuation(line)) {
            steps.push({ id: `step-${counter += 1}`, text: line.trim(), lines: [line], requiresEditor: true, status: 'queued' });
            index += 1;
            continue;
        }

        const block = [line];
        let next = index + 1;
        while (next < commands.length && isContinuation(commands[next])) {
            block.push(commands[next]);
            next += 1;
        }

        steps.push({
            id: `step-${counter += 1}`,
            text: line,
            lines: block,
            requiresEditor: block.length > 1,
            status: 'queued'
        });
        index = next;
    }

    return steps;
};

// Body text for an editor-block step: the indented content lines with their
// two-space indent stripped, excluding the opener and the [save editor] marker.
export const extractEditorBody = (lines: string[]): string =>
    lines
        .slice(1)
        .filter(line => line.trim() !== '[save editor]')
        .map(line => line.replace(/^ {2}/, ''))
        .join('\n');
