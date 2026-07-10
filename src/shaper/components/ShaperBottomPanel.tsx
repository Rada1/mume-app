/**
 * @file ShaperBottomPanel.tsx
 * @description Validation counts, deploy command preview, and the paced
 *              deploy queue with status list and audit log.
 */

import { useState } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import type { ShaperDeployAuditEntry, ShaperDeployCommand } from '../deployment/shaperDeployTypes';
import type { ShaperRoomDraft, ShaperRoomId, ShaperValidationIssue } from '../model/shaperTypes';
import { ShaperDeployCommandSelector } from './ShaperDeployCommandSelector';
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
    roomBlockingErrors: number;
    deployRoomCount: number;
    selectedRoomId?: string;
    rooms: Record<ShaperRoomId, ShaperRoomDraft>;
    onSelectRoom: (roomId: string) => void;
    onStartDeploy: (commands: string[]) => void;
    zoneDeployCommands: string[];
    onStartZoneDeploy: () => void;
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
    roomBlockingErrors,
    deployRoomCount,
    selectedRoomId,
    rooms,
    onSelectRoom,
    onStartDeploy,
    zoneDeployCommands,
    onStartZoneDeploy,
    onAbortDeploy,
    onClearDeploy,
    onMarkVerified,
    onMarkFailed
}) => {
    const errors = issues.filter(issue => issue.severity === 'error').length;
    const warnings = issues.filter(issue => issue.severity === 'warning').length;
    const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle');
    const [isMinimized, setIsMinimized] = useState<boolean>(() => {
        return localStorage.getItem('shaper-bottom-panel-minimized') === 'true';
    });

    const toggleMinimize = (e: React.MouseEvent) => {
        if ((e.target as HTMLElement).closest('button')) return;
        setIsMinimized(prev => {
            const next = !prev;
            localStorage.setItem('shaper-bottom-panel-minimized', String(next));
            return next;
        });
    };

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
        : roomBlockingErrors > 0
            ? `${roomBlockingErrors} error${roomBlockingErrors === 1 ? '' : 's'} in ${deployRoomCount > 1 ? 'the selected rooms' : 'this room'} must be resolved first.`
            : deployCommands.length === 0
                ? 'No commands to deploy.'
                : '';

    const zoneDeployBlockedReason = !isConnected
        ? 'Connect to MUME to deploy.'
        : blockingErrors > 0
            ? `${blockingErrors} blocking error${blockingErrors === 1 ? '' : 's'} must be resolved first.`
            : zoneDeployCommands.length === 0
                ? 'No deployable rooms in this zone.'
                : '';

    const handleStartZoneDeploy = () => {
        if (window.confirm(
            `Publish the whole zone to MUME? This sends ${zoneDeployCommands.length} commands across every deployable room ` +
            `(each room's reset tree is cleared with /com kill all before its previewed /com commands replay).`
        )) {
            onStartZoneDeploy();
        }
    };

    return (
        <section className={`shaper-bottom-panel ${isMinimized ? 'minimized' : ''}`}>
            <div className="shaper-bottom-panel-header" onClick={toggleMinimize}>
                <div className="shaper-bottom-panel-header-left">
                    <strong className="shaper-bottom-panel-title">Deploy &amp; Validation</strong>
                    {isMinimized ? (
                        <div className="shaper-bottom-panel-summary-row">
                            <span className={`shaper-summary-badge errors ${errors > 0 ? 'active' : ''}`}>
                                {errors} error{errors === 1 ? '' : 's'}
                            </span>
                            <span className={`shaper-summary-badge warnings ${warnings > 0 ? 'active' : ''}`}>
                                {warnings} warning{warnings === 1 ? '' : 's'}
                            </span>
                            <span className={`shaper-summary-badge commands ${deployCommands.length > 0 ? 'active' : ''}`}>
                                {deployCommands.length} command{deployCommands.length === 1 ? '' : 's'}
                            </span>
                        </div>
                    ) : (
                        <span className="shaper-bottom-panel-header-subtitle">
                            ({errors} errors, {warnings} warnings, {deployCommands.length} commands available)
                        </span>
                    )}
                </div>
                <button
                    type="button"
                    className="shaper-bottom-panel-toggle"
                    aria-label={isMinimized ? 'Expand panel' : 'Minimize panel'}
                    title={isMinimized ? 'Expand panel' : 'Minimize panel'}
                >
                    {isMinimized ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
            </div>

            {!isMinimized && (
                <div className="shaper-bottom-panel-content">
                    <div className="shaper-bottom-summary">
                        <strong>Validation</strong>
                        <span className={errors > 0 ? 'shaper-issue error' : ''}>{errors} errors</span>
                        <span className={warnings > 0 ? 'shaper-issue warning' : ''}>{warnings} warnings</span>
                    </div>

                    {issues.length > 0 && (
                        <ul className="shaper-issue-list">
                            {[...issues]
                                .sort((a, b) => (a.severity === b.severity ? 0 : a.severity === 'error' ? -1 : 1))
                                .map(issue => {
                                    const roomNumber = issue.roomId ? rooms[issue.roomId]?.roomNumber : undefined;
                                    const isSelectable = !!issue.roomId && !!rooms[issue.roomId];
                                    return (
                                        <li
                                            key={issue.id}
                                            className={`shaper-issue-row ${issue.severity}${issue.roomId === selectedRoomId ? ' selected-room' : ''}${isSelectable ? ' selectable' : ''}`}
                                            onClick={isSelectable ? () => onSelectRoom(issue.roomId!) : undefined}
                                            title={isSelectable ? 'Select this room' : undefined}
                                        >
                                            <span className={`shaper-issue-sev ${issue.severity}`}>{issue.severity}</span>
                                            {roomNumber && <span className="shaper-issue-room">{roomNumber}</span>}
                                            <span className="shaper-issue-message">{issue.message}</span>
                                        </li>
                                    );
                                })}
                        </ul>
                    )}

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
                            <>
                                <ShaperDeployCommandSelector
                                    commands={deployCommands}
                                    onPush={onStartDeploy}
                                    disabled={isDeploying || !!deployBlockedReason}
                                    disabledReason={isDeploying ? 'Deploy already running.' : deployBlockedReason}
                                />
                                <pre>{deployCommands.join('\n')}</pre>
                            </>
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
                                    <>
                                        <button
                                            type="button"
                                            className="shaper-deploy-send"
                                            onClick={() => onStartDeploy(deployCommands)}
                                            disabled={!!deployBlockedReason}
                                            title={deployBlockedReason}
                                        >
                                            {deployRoomCount > 1 ? `Send ${deployRoomCount} Rooms to MUME` : 'Send Room to MUME'}
                                        </button>
                                        <button
                                            type="button"
                                            className="shaper-deploy-send-zone"
                                            onClick={handleStartZoneDeploy}
                                            disabled={!!zoneDeployBlockedReason}
                                            title={zoneDeployBlockedReason || `Publish all rooms (${zoneDeployCommands.length} commands)`}
                                        >
                                            Send Zone to MUME
                                        </button>
                                    </>
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
                </div>
            )}
        </section>
    );
};
