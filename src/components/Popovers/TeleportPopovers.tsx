/**
 * @file TeleportPopovers.tsx
 * @description Popovers for saving, selecting, and managing MUME magic room keys.
 */

import React, { useRef } from 'react';
import { TeleportTarget, MessageType, PopoverState } from '../../types';
import { buildKeyedSpellCommand, pruneExpiredMagicKeys, renameMagicKeyTarget } from '../../utils/magicKeyUtils';

interface TeleportSaveProps {
    popoverState: PopoverState;
    setPopoverState: (val: PopoverState | null) => void;
    setTeleportTargets: React.Dispatch<React.SetStateAction<TeleportTarget[]>>;
    addMessage: (type: MessageType, content: string) => void;
}

export const TeleportSavePopover: React.FC<TeleportSaveProps> = ({ popoverState, setPopoverState, setTeleportTargets, addMessage }) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const doSave = () => {
        const label = inputRef.current?.value.trim();
        if (!label) return;
        const newTarget: TeleportTarget = {
            id: popoverState.teleportId!,
            name: label,
            label,
            command: `teleport ${label}`,
            expiresAt: Date.now() + 86400000,
            createdAt: Date.now(),
            sourceSpell: 'manual'
        };
        setTeleportTargets(prev => [newTarget, ...prev.filter(t => t.id !== newTarget.id && t.label !== label)]);
        addMessage('system', `Stored room '${label}' for 24h.`);
        setPopoverState(null);
    };
    return (
        <div className="terminal-teleport-popover">
            <div className="terminal-teleport-header">
                <span className="terminal-teleport-prompt">&gt;</span>
                <span className="terminal-teleport-title">store magic key</span>
                <span className="terminal-teleport-key-badge">{popoverState.teleportId}</span>
            </div>
            <div className="terminal-teleport-body">
                <input
                    type="text"
                    placeholder="Enter room label..."
                    autoFocus
                    ref={inputRef}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') doSave();
                        else if (e.key === 'Escape') setPopoverState(null);
                    }}
                    className="terminal-teleport-input"
                />
                <div className="terminal-teleport-actions">
                    <button type="button" onClick={doSave} className="terminal-teleport-btn terminal-teleport-btn-primary">
                        save [enter]
                    </button>
                    <button type="button" onClick={() => setPopoverState(null)} className="terminal-teleport-btn">
                        cancel
                    </button>
                </div>
            </div>
        </div>
    );
};

export const TeleportSelectPopover: React.FC<{
    popoverState: PopoverState;
    setPopoverState: (val: PopoverState | null) => void;
    teleportTargets: TeleportTarget[];
    executeCommand: (cmd: string) => void;
}> = ({ popoverState, setPopoverState, teleportTargets, executeCommand }) => {
    const activeTargets = pruneExpiredMagicKeys(teleportTargets);
    const spellLabel = (popoverState.spellCommand || "cast 'teleport'").toLowerCase();

    return (
        <div className="terminal-teleport-popover">
            <div className="terminal-teleport-header">
                <span className="terminal-teleport-prompt">&gt;</span>
                <span className="terminal-teleport-title">{spellLabel}</span>
                <span className="terminal-teleport-count">{activeTargets.length} key{activeTargets.length !== 1 ? 's' : ''}</span>
            </div>

            <div className="terminal-teleport-scroll">
                {activeTargets.length === 0 ? (
                    <div className="terminal-teleport-empty">No active magic keys stored.</div>
                ) : (
                    activeTargets.map(t => {
                        const hoursLeft = t.expiresAt ? Math.max(0, Math.ceil((t.expiresAt - Date.now()) / 3600000)) : null;
                        return (
                            <button
                                key={t.id}
                                type="button"
                                className="terminal-teleport-row"
                                data-menu-item="true"
                                onClick={() => {
                                    executeCommand(buildKeyedSpellCommand(popoverState.spellCommand || "cast 'teleport'", t));
                                    setPopoverState(null);
                                }}
                            >
                                <span className="terminal-teleport-row-name">{t.label || t.name}</span>
                                <span className="terminal-teleport-row-cmd">{t.id}</span>
                                {hoursLeft !== null && (
                                    <span className="terminal-teleport-row-expiry">{hoursLeft}h</span>
                                )}
                            </button>
                        );
                    })
                )}
            </div>

            <div className="terminal-teleport-footer">
                <button
                    type="button"
                    className="terminal-teleport-footer-btn"
                    onClick={() => setPopoverState({ ...popoverState, type: 'teleport-manage' })}
                >
                    manage keys
                </button>
                <button
                    type="button"
                    className="terminal-teleport-footer-btn terminal-teleport-footer-cancel"
                    onClick={() => setPopoverState(null)}
                >
                    cancel
                </button>
            </div>
        </div>
    );
};

export const TeleportManagePopover: React.FC<{
    teleportTargets: TeleportTarget[];
    setTeleportTargets: React.Dispatch<React.SetStateAction<TeleportTarget[]>>;
    setPopoverState: (val: PopoverState | null) => void;
}> = ({ teleportTargets, setTeleportTargets, setPopoverState }) => {
    const activeTargets = pruneExpiredMagicKeys(teleportTargets);

    return (
        <div className="terminal-teleport-popover terminal-teleport-manage">
            <div className="terminal-teleport-header">
                <span className="terminal-teleport-prompt">&gt;</span>
                <span className="terminal-teleport-title">manage magic keys</span>
                <span className="terminal-teleport-count">{activeTargets.length} key{activeTargets.length !== 1 ? 's' : ''}</span>
            </div>

            <div className="terminal-teleport-scroll">
                {activeTargets.length === 0 ? (
                    <div className="terminal-teleport-empty">No active keys.</div>
                ) : (
                    activeTargets.map(t => (
                        <div key={t.id} className="terminal-teleport-manage-row">
                            <div className="terminal-teleport-manage-info">
                                <input
                                    value={t.label || t.name}
                                    onChange={(e) => setTeleportTargets(prev => renameMagicKeyTarget(prev, t.id, e.target.value))}
                                    className="terminal-teleport-manage-input"
                                    placeholder="Room label..."
                                />
                                <span className="terminal-teleport-manage-id">{t.id}</span>
                            </div>
                            <button
                                type="button"
                                className="terminal-teleport-delete-btn"
                                onClick={() => setTeleportTargets(prev => prev.filter(x => x.id !== t.id))}
                                title={`Delete ${t.label || t.name}`}
                            >
                                &times;
                            </button>
                        </div>
                    ))
                )}
            </div>

            <div className="terminal-teleport-footer">
                <button
                    type="button"
                    className="terminal-teleport-footer-btn"
                    onClick={() => setPopoverState(null)}
                    style={{ width: '100%', textAlign: 'center' }}
                >
                    close
                </button>
            </div>
        </div>
    );
};
