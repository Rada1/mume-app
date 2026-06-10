/**
 * @file shaperDeployTypes.ts
 * @description Types for the Shaper deploy queue: paced command sending,
 *              per-command status, and the audit trail.
 */

// --- Status Section ---
export type ShaperDeployStatus =
    | 'queued'
    | 'sending'
    | 'sent'
    | 'failed'
    | 'verified'
    | 'skipped';

// --- Command Section ---
export interface ShaperDeployCommand {
    id: string;
    // The opener line shown in the queue (first line of the step).
    text: string;
    // Full raw lines for the step. One line for normal commands; an opener plus
    // indented content for editor-block steps.
    lines: string[];
    // Editor-block steps are not auto-sent: they need an in-client editor save.
    requiresEditor: boolean;
    status: ShaperDeployStatus;
    error?: string;
}

// --- Audit Section ---
export interface ShaperDeployAuditEntry {
    timestamp: number;
    text: string;
    status: ShaperDeployStatus;
}
