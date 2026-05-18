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
        <div style={{ padding: '12px', minWidth: '200px' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--accent)', marginBottom: '10px', fontWeight: 'bold' }}>STORE ROOM</div>
            <input type="text" placeholder="Label" autoFocus ref={inputRef} onKeyDown={(e) => { if (e.key === 'Enter') doSave(); else if (e.key === 'Escape') setPopoverState(null); }} style={{ width: '100%', background: 'var(--input-bg, rgba(255,255,255,0.1))', border: '1px solid var(--border-color, rgba(255,255,255,0.2))', color: 'var(--text-primary, #fff)', padding: '8px', borderRadius: '6px', marginBottom: '10px' }} />
            <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={doSave} style={{ flex: 1, background: 'var(--accent)', border: 'none', color: 'var(--ansi-black, #000)', padding: '8px', borderRadius: '6px', fontWeight: 'bold' }}>Save</button>
                <button onClick={() => setPopoverState(null)} style={{ flex: 1, background: 'var(--input-bg, rgba(255,255,255,0.1))', border: 'none', color: 'var(--text-primary, #fff)', padding: '8px', borderRadius: '6px' }}>Cancel</button>
            </div>
        </div>
    );
};

export const TeleportSelectPopover: React.FC<{ popoverState: PopoverState, setPopoverState: (val: PopoverState | null) => void, teleportTargets: TeleportTarget[], executeCommand: (cmd: string) => void }> = ({ popoverState, setPopoverState, teleportTargets, executeCommand }) => {
    const activeTargets = pruneExpiredMagicKeys(teleportTargets);
    return (
        <>
            <div className="popover-header" style={{ padding: '8px 12px', fontSize: '0.7rem', opacity: 0.5 }}>TARGET FOR {popoverState.spellCommand?.toUpperCase()}</div>
            <div className="popover-scroll" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                {activeTargets.map(t => (
                    <div key={t.id} className="popover-item" data-menu-item="true" onClick={() => { executeCommand(buildKeyedSpellCommand(popoverState.spellCommand || "cast 'teleport'", t)); setPopoverState(null); }}>
                        <span>{t.label || t.name}</span>
                        <span style={{ fontSize: '0.6rem', opacity: 0.5 }}>{t.expiresAt ? Math.ceil((t.expiresAt - Date.now()) / 3600000) : '?'}h</span>
                    </div>
                ))}
            </div>
            <div style={{ display: 'flex', borderTop: '1px solid var(--border-color, rgba(255,255,255,0.1))' }}>
                <div className="popover-item" style={{ flex: 1, textAlign: 'center', opacity: 0.6 }} onClick={() => setPopoverState({ ...popoverState, type: 'teleport-manage' })}>Manage</div>
                <div className="popover-item" style={{ flex: 1, color: 'var(--ansi-red, #ff5555)', textAlign: 'center' }} onClick={() => setPopoverState(null)}>Cancel</div>
            </div>
        </>
    );
};

export const TeleportManagePopover: React.FC<{ teleportTargets: TeleportTarget[], setTeleportTargets: React.Dispatch<React.SetStateAction<TeleportTarget[]>>, setPopoverState: (val: PopoverState | null) => void }> = ({ teleportTargets, setTeleportTargets, setPopoverState }) => (
    <>
        <div className="popover-header" style={{ color: 'var(--accent)' }}>MAGIC KEYS</div>
        <div className="popover-scroll" style={{ maxHeight: '250px', overflowY: 'auto', minWidth: '220px' }}>
            {pruneExpiredMagicKeys(teleportTargets).map(t => (
                <div key={t.id} className="popover-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                    <div style={{ minWidth: 0 }}>
                        <input value={t.label || t.name} onChange={(e) => setTeleportTargets(prev => renameMagicKeyTarget(prev, t.id, e.target.value))} style={{ width: '100%', background: 'transparent', border: 0, color: 'var(--text-primary, #fff)' }} />
                        <div style={{ fontSize: '0.6rem', opacity: 0.4 }}>{t.id}</div>
                    </div>
                    <button onClick={() => setTeleportTargets(prev => prev.filter(x => x.id !== t.id))} style={{ background: 'var(--ansi-red, rgba(255,0,0,0.1))', opacity: 0.2, border: 'none', color: 'var(--text-primary, #fff)', width: '24px', height: '24px', borderRadius: '12px' }}>x</button>
                </div>
            ))}
        </div>
        <div className="popover-item" style={{ borderTop: '1px solid var(--border-color, rgba(255,255,255,0.1))', textAlign: 'center' }} onClick={() => setPopoverState(null)}>Close</div>
    </>
);
