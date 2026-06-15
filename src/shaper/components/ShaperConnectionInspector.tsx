/**
 * @file ShaperConnectionInspector.tsx
 * @description Edits detail properties of exit connections including door keywords, key vnums, and flags.
 */

import React from 'react';
import { hasShaperExitClimb, hasShaperExitDoor } from '../model/shaperExitFlags';
import type { ShaperDirection, ShaperDoorFlag, ShaperExitDraft, ShaperRoomDraft, ShaperRoomId, ShaperWorkspaceDoc } from '../model/shaperTypes';
import { AIGenerateButton } from './AIGenerateButton';

interface ShaperConnectionInspectorProps {
    doc: ShaperWorkspaceDoc;
    connection: {
        aId: ShaperRoomId;
        bId: ShaperRoomId;
        dirAB: ShaperDirection;
        dirBA: ShaperDirection;
    };
    rooms: Record<ShaperRoomId, ShaperRoomDraft>;
    exits: Record<string, ShaperExitDraft>;
    selectionCount: number;
    onUpdateExit: (exitId: string, patch: Partial<ShaperExitDraft>) => void;
    onDeleteConnection: () => void;
    onClose: () => void;
}

const EXIT_FLAGS: ShaperDoorFlag[] = [
    'broken', 'build', 'climb_down', 'climb_up', 'closed', 'door',
    'hidden', 'locked', 'nobash', 'noblock', 'nobreak', 'noflee',
    'not_shown', 'no_mob', 'pickproof', 'plural', 'stream', 'transient'
];

export const ShaperConnectionInspector: React.FC<ShaperConnectionInspectorProps> = ({
    doc,
    connection,
    rooms,
    exits,
    selectionCount,
    onUpdateExit,
    onDeleteConnection,
    onClose
}) => {
    const { aId, bId, dirAB } = connection;
    const roomA = rooms[aId];
    const roomB = rooms[bId];
    
    if (!roomA || !roomB) return null;

    const exit1Id = `${aId}:${dirAB}`;
    const exit1 = exits[exit1Id];

    const toggleFlag = (exitId: string, exit: ShaperExitDraft, flag: ShaperDoorFlag) => {
        const flags = exit.doorFlags || [];
        const nextFlags = flags.includes(flag)
            ? flags.filter(f => f !== flag)
            : [...flags, flag];
        const patch: Partial<ShaperExitDraft> = { doorFlags: nextFlags };
        if (flag === 'door') patch.hasDoor = nextFlags.includes('door');
        if (flag === 'climb_up' || flag === 'climb_down') {
            patch.isClimb = nextFlags.includes('climb_up') || nextFlags.includes('climb_down');
            patch.climbDirection = nextFlags.includes('climb_up')
                ? 'up'
                : nextFlags.includes('climb_down')
                    ? 'down'
                    : undefined;
        }
        onUpdateExit(exitId, patch);
    };

    const renderExitFields = (exitId: string, exit: ShaperExitDraft | undefined, fromRoom: ShaperRoomDraft, toRoom: ShaperRoomDraft, dir: ShaperDirection) => {
        if (!exit) {
            return (
                <div className="shaper-exit-details-empty" style={{ marginTop: 12 }}>
                    <p style={{ fontSize: 13, color: '#aab7c4', margin: 0 }}>
                        No exit configured from {fromRoom.roomNumber} ({dir.toUpperCase()}) to {toRoom.roomNumber}.
                    </p>
                </div>
            );
        }

        return (
            <div className="shaper-exit-details-block" style={{ borderTop: '1px solid rgba(255,255,255,0.08)', marginTop: 12, paddingTop: 12 }}>
                <h4 style={{ margin: '0 0 10px', fontSize: 14, color: '#f0b45b' }}>
                    Exit: {fromRoom.roomNumber} → {toRoom.roomNumber} ({dir.toUpperCase()})
                </h4>
                
                <label className="shaper-field" style={{ marginBottom: 12 }}>
                    <span>Exit Type</span>
                    <input
                        value={exit.exitType || ''}
                        onChange={e => onUpdateExit(exitId, { exitType: e.target.value })}
                        placeholder="e.g. climb, random, trail, swim"
                    />
                </label>

                <div className="shaper-field" style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span>Exit Description</span>
                        <AIGenerateButton
                            target="door-description"
                            doc={doc}
                            roomId={fromRoom.id}
                            customContext={{
                                direction: dir,
                                fromRoomNum: fromRoom.roomNumber,
                                toRoomNum: toRoom.roomNumber,
                                doorName: exit.doorName
                            }}
                            onSuccess={(res: { exitDescription: string }) => {
                                onUpdateExit(exitId, { exitDescription: res.exitDescription });
                            }}
                            title="Generate exit/door description with AI"
                        />
                    </div>
                    <textarea
                        value={exit.exitDescription || ''}
                        onChange={e => onUpdateExit(exitId, { exitDescription: e.target.value })}
                        placeholder="e.g. A steep path leads downwards..."
                        rows={2}
                        style={{ width: '100%', resize: 'vertical', background: '#0f172a', border: '1px solid #334155', borderRadius: 4, padding: 6, color: '#f8fafc', fontSize: 13 }}
                    />
                </div>

                <div className="shaper-field" style={{ marginBottom: 12 }}>
                    <span>Exit Flags (/room dset)</span>
                    <div className="shaper-flag-grid">
                        {EXIT_FLAGS.map(flag => {
                            const flags = exit.doorFlags || [];
                            return (
                                <label key={flag} className="shaper-flag">
                                    <input
                                        type="checkbox"
                                        checked={flags.includes(flag)}
                                        onChange={() => toggleFlag(exitId, exit, flag)}
                                    />
                                    <span>{flag}</span>
                                </label>
                            );
                        })}
                    </div>
                </div>

                {hasShaperExitClimb(exit) && (
                    <div style={{ margin: '12px 0', padding: '8px', background: 'rgba(255,255,255,0.02)', borderRadius: 6, border: '1px solid rgba(255,255,255,0.05)' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                            <label className="shaper-field">
                                <span>Climb Difficulty</span>
                                <input
                                    type="number"
                                    value={exit.climbDifficulty ?? ''}
                                    onChange={e => onUpdateExit(exitId, { climbDifficulty: e.target.value ? parseInt(e.target.value, 10) : undefined })}
                                    placeholder="e.g. 10"
                                />
                            </label>
                            <label className="shaper-field">
                                <span>Climb Damage</span>
                                <input
                                    type="number"
                                    value={exit.climbDamage ?? ''}
                                    onChange={e => onUpdateExit(exitId, { climbDamage: e.target.value ? parseInt(e.target.value, 10) : undefined })}
                                    placeholder="e.g. 5"
                                />
                            </label>
                        </div>
                    </div>
                )}
                
                {hasShaperExitDoor(exit) && (
                    <div style={{ margin: '12px 0', padding: '8px', background: 'rgba(255,255,255,0.02)', borderRadius: 6, border: '1px solid rgba(255,255,255,0.05)' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <label className="shaper-field">
                                <span>Door Keywords</span>
                                <input
                                    value={exit.doorName || ''}
                                    onChange={e => onUpdateExit(exitId, { doorName: e.target.value })}
                                    placeholder="e.g. gate, oak-door"
                                />
                            </label>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                <label className="shaper-field">
                                    <span>Key VNUM</span>
                                    <input
                                        value={exit.keyVnum || ''}
                                        onChange={e => onUpdateExit(exitId, { keyVnum: e.target.value })}
                                        placeholder="e.g. 3012"
                                    />
                                </label>

                                <label className="shaper-field">
                                    <span>Weight</span>
                                    <input
                                        type="number"
                                        value={exit.doorWeight ?? ''}
                                        onChange={e => onUpdateExit(exitId, { doorWeight: e.target.value ? parseFloat(e.target.value) : undefined })}
                                        placeholder="e.g. 100"
                                    />
                                </label>
                            </div>

                            <p style={{ margin: 0, color: '#aab7c4', fontSize: 12 }}>
                                Door behavior flags are edited in Exit Flags above.
                            </p>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    const multi = selectionCount > 1;

    return (
        <aside className="shaper-inspector">
            <div className="shaper-panel-heading" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <span>One-Way Exit Inspector</span>
                    <strong>{roomA.roomNumber} {dirAB.toUpperCase()} to {roomB.roomNumber}</strong>
                </div>
                <button
                    type="button"
                    onClick={onClose}
                    style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#aab7c4',
                        cursor: 'pointer',
                        padding: 4,
                        fontSize: 14
                    }}
                >
                    X
                </button>
            </div>

            {multi && (
                <div className="shaper-multi-banner" style={{ marginBottom: 12 }}>
                    Editing {selectionCount} selected exits. Exit type, description, door flags, and other fields apply to all.
                </div>
            )}

            <button
                type="button"
                onClick={onDeleteConnection}
                style={{
                    width: '100%',
                    padding: '8px 12px',
                    backgroundColor: 'rgba(239, 68, 68, 0.15)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: 6,
                    color: '#ff8f8f',
                    cursor: 'pointer',
                    fontWeight: 600,
                    marginBottom: 16
                }}
            >
                {multi ? `Delete ${selectionCount} Selected Exits` : 'Delete This Exit'}
            </button>

            {renderExitFields(exit1Id, exit1, roomA, roomB, dirAB)}
        </aside>
    );
};
