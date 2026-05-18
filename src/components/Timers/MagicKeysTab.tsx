/**
 * @file MagicKeysTab.tsx
 * @description Status drawer tab for saved MUME magic room keys.
 */

import React from 'react';
import { Trash2 } from 'lucide-react';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { pruneExpiredMagicKeys, renameMagicKeyTarget } from '../../utils/magicKeyUtils';
import { TeleportTarget } from '../../types';
import './MagicKeysTab.css';

const formatRemaining = (expiresAt?: number, now = Date.now()) => {
    if (!expiresAt) return 'unknown';
    const total = Math.max(0, Math.ceil((expiresAt - now) / 1000));
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes.toString().padStart(2, '0')}m`;
    return `${minutes}m`;
};

const getGroupName = (target: TeleportTarget) => target.gatheredZone?.trim() || 'Uncategorized';

const groupMagicKeys = (targets: TeleportTarget[]) => {
    const groups = new Map<string, TeleportTarget[]>();
    targets.forEach(target => {
        const groupName = getGroupName(target);
        groups.set(groupName, [...(groups.get(groupName) || []), target]);
    });
    return Array.from(groups.entries()).sort(([left], [right]) => {
        if (left === 'Uncategorized') return 1;
        if (right === 'Uncategorized') return -1;
        return left.localeCompare(right);
    });
};

export const MagicKeysTab: React.FC = () => {
    const teleportTargets = useSettingsStore(s => s.teleportTargets);
    const setTeleportTargets = useSettingsStore(s => s.setTeleportTargets);
    const [now, setNow] = React.useState(Date.now());
    const activeTargets = React.useMemo(
        () => pruneExpiredMagicKeys(teleportTargets, now).sort((a, b) => (a.expiresAt || Infinity) - (b.expiresAt || Infinity)),
        [now, teleportTargets]
    );
    const groupedTargets = React.useMemo(() => groupMagicKeys(activeTargets), [activeTargets]);

    React.useEffect(() => {
        const interval = window.setInterval(() => setNow(Date.now()), 30_000);
        return () => window.clearInterval(interval);
    }, []);

    React.useEffect(() => {
        if (activeTargets.length !== teleportTargets.length) setTeleportTargets(activeTargets);
    }, [activeTargets, setTeleportTargets, teleportTargets.length]);

    return (
        <div className="magic-keys-tab">
            {activeTargets.length === 0 && (
                <div className="magic-keys-empty">No saved magic keys yet.</div>
            )}
            {groupedTargets.map(([groupName, targets]) => (
                <section key={groupName} className="magic-key-group">
                    <div className="magic-key-group-header">
                        <span>{groupName}</span>
                        <span>{targets.length}</span>
                    </div>
                    <div className="magic-key-group-list">
                        {targets.map(target => (
                            <div key={target.id} className="magic-key-card">
                                <div className="magic-key-top">
                                    <input
                                        className="magic-key-name"
                                        value={target.label || target.name}
                                        onChange={(event) => setTeleportTargets(renameMagicKeyTarget(teleportTargets, target.id, event.target.value))}
                                        aria-label={`Rename magic key ${target.id}`}
                                    />
                                    <button
                                        type="button"
                                        className="magic-key-delete"
                                        title="Remove magic key"
                                        onClick={() => setTeleportTargets(teleportTargets.filter(item => item.id !== target.id))}
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                                <div className="magic-key-meta">
                                    <span>{target.id}</span>
                                    <span>{formatRemaining(target.expiresAt, now)}</span>
                                </div>
                                {target.sourceLine && <div className="magic-key-source">{target.sourceLine}</div>}
                            </div>
                        ))}
                    </div>
                </section>
            ))}
        </div>
    );
};
