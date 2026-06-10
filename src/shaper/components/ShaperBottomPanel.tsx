/**
 * @file ShaperBottomPanel.tsx
 * @description Validation counts, deploy command preview, and the paced
 *              deploy queue with status list and audit log.
 */

import { useState } from 'react';
import type { ShaperDeployAuditEntry, ShaperDeployCommand } from '../deployment/shaperDeployTypes';
import type { ShaperValidationIssue } from '../model/shaperTypes';
import './ShaperBottomPanel.css';

interface ShaperBottomPanelProps {
    issues: ShaperValidationIssue[];
    deployCommands: string[];
    deployWarnings: string[];
    deploySteps: ShaperDeployCommand[];
    deployAudit: ShaperDeployAuditEntry[];
    isDeploying: boolean;
    isConnected: boolean;
    blockingErrors: number;
    onStartDeploy: () => void;
    onAbortDeploy: () => void;
    onClearDeploy: () => void;
    onMarkVerified: (id: string) => void;
    onMarkFailed: (id: string) => void;
}

// --- Component Section ---
export const ShaperBottomPanel: React.FC<ShaperBottomPanelProps> = ({
    issues,
    deployCommands,
    deployWarnings,
    deploySteps,
    deployAudit,
    isDeploying,
    isConnected,
    blockingErrors,
    onStartDeploy,
    onAbortDeploy,
    onClearDeploy,
    onMarkVerified,
    onMarkFailed
}) => {
    const errors = issues.filter(issue => issue.severity === 'error').length;
    const warnings = issues.filter(issue => issue.severity === 'warning').length;
    const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle');

    const copyCommands = async () => {
        if (deployCommands.length === 0) return;
        try {
            await navigator.clipboard.writeText(deployCommands.join('\n'));
            setCopyState('copied');
        } catch {
            setCopyState('failed');
        }
    };

    const deployBlockedReason = !isConnected
        ? 'Connect to MUME to deploy.'
        : blockingErrors > 0
            ? `${blockingErrors} blocking error${blockingErrors === 1 ? '' : 's'} must be resolved first.`
            : deployCommands.length === 0
                ? 'No commands to deploy.'
                : '';

    return (
        <section className="shaper-bottom-panel">
            <div className="shaper-bottom-summary">
                <strong>Validation</strong>
                <span>{errors} errors</span>
                <span>{warnings} warnings</span>
            </div>

            <div className="shaper-command-preview">
                <div className="shaper-command-preview-header">
                    <strong>Deploy Preview</strong>
                    <span>{deployCommands.length} commands</span>
                    <button type="button" onClick={copyCommands} disabled={deployCommands.length === 0}>
                        {copyState === 'copied' ? 'Copied' : 'Copy'}
                    </button>
                </div>
                {deployWarnings.length > 0 && (
                    <div className="shaper-deploy-warnings">
                        {deployWarnings.map(warning => (
                            <span key={warning}>{warning}</span>
                        ))}
                    </div>
                )}
                {copyState === 'failed' && <span className="shaper-copy-failed">Clipboard access failed.</span>}
                {deployCommands.length > 0 ? (
                    <pre>{deployCommands.join('\n')}</pre>
                ) : (
                    <span>No selected-room deploy commands yet.</span>
                )}
            </div>

            <div className="shaper-deploy-queue">
                <div className="shaper-deploy-queue-header">
                    <strong>Deploy Queue</strong>
                    {isDeploying
                        ? <button type="button" className="shaper-deploy-abort" onClick={onAbortDeploy}>Abort</button>
                        : (
                            <button
                                type="button"
                                className="shaper-deploy-send"
                                onClick={onStartDeploy}
                                disabled={!!deployBlockedReason}
                                title={deployBlockedReason}
                            >
                                Send to MUME
                            </button>
                        )}
                    {deploySteps.length > 0 && !isDeploying && (
                        <button type="button" onClick={onClearDeploy}>Clear</button>
                    )}
                </div>

                {deployBlockedReason && !isDeploying && (
                    <span className="shaper-deploy-blocked">{deployBlockedReason}</span>
                )}

                {deploySteps.length > 0 && (
                    <ul className="shaper-deploy-steps">
                        {deploySteps.map(step => (
                            <li key={step.id} className={`shaper-deploy-step ${step.status}`}>
                                <span className="shaper-deploy-step-status">{step.status}</span>
                                <code>{step.requiresEditor ? `${step.text}  (editor block)` : step.text}</code>
                                {step.error && <em>{step.error}</em>}
                                {step.status === 'sent' && (
                                    <span className="shaper-deploy-step-actions">
                                        <button type="button" onClick={() => onMarkVerified(step.id)}>Verify</button>
                                        <button type="button" onClick={() => onMarkFailed(step.id)}>Fail</button>
                                    </span>
                                )}
                            </li>
                        ))}
                    </ul>
                )}

                {deployAudit.length > 0 && (
                    <details className="shaper-deploy-audit">
                        <summary>Audit log ({deployAudit.length})</summary>
                        <ul>
                            {deployAudit.map((entry, index) => (
                                <li key={`${entry.timestamp}-${index}`}>
                                    <time>{new Date(entry.timestamp).toLocaleTimeString()}</time>
                                    <span>{entry.status}</span>
                                    <code>{entry.text}</code>
                                </li>
                            ))}
                        </ul>
                    </details>
                )}
            </div>
        </section>
    );
};
