import React, { useRef, useLayoutEffect } from 'react';

import { PopoverState, CustomButton, TeleportTarget, MessageType } from '../../types';
import { extractNoun } from '../../utils/gameUtils';
import { DialMenu } from './DialMenu';

interface PopoverManagerProps {
    popoverState: PopoverState | null;
    setPopoverState: React.Dispatch<React.SetStateAction<PopoverState | null>>;
    popoverRef: React.RefObject<HTMLDivElement>;
    buttons: CustomButton[];
    setButtons: React.Dispatch<React.SetStateAction<CustomButton[]>>;
    availableSets: string[];
    executeCommand: (cmd: string, silent?: boolean, isSystem?: boolean, isHistorical?: boolean) => void;
    addMessage: (type: MessageType, content: string) => void;
    setTarget: (target: string | null) => void;
    teleportTargets: TeleportTarget[];
    setTeleportTargets: React.Dispatch<React.SetStateAction<TeleportTarget[]>>;
    handleButtonClick: (button: CustomButton, e: React.MouseEvent, context?: string) => void;
    triggerHaptic: (ms: number) => void;
    roomPlayers: string[];
}

export const PopoverManager: React.FC<PopoverManagerProps> = ({
    popoverState,
    setPopoverState,
    popoverRef,
    buttons,
    setButtons,
    availableSets,
    executeCommand,
    addMessage,
    setTarget,
    teleportTargets,
    setTeleportTargets,
    handleButtonClick,
    triggerHaptic,
    roomPlayers
}) => {
    useLayoutEffect(() => {
        if (popoverState && popoverRef.current) {
            const el = popoverRef.current;
            const rect = el.getBoundingClientRect();
            const winH = window.innerHeight;
            const winW = window.innerWidth;

            let top = popoverState.y;
            let left = popoverState.x;


            // If we have sourceHeight, it means we can try to flip direction
            if (popoverState.sourceHeight && top > winH / 2) {
                // If in bottom half, align bottom of menu with bottom of button
                const potentialTop = top + popoverState.sourceHeight - rect.height;
                if (potentialTop >= 10) {
                    top = potentialTop;
                }
            }

            // Boundary enforcement
            if (top + rect.height > winH - 10) {
                top = Math.max(10, winH - rect.height - 10);
            }
            if (left + rect.width > winW - 10) {
                left = Math.max(10, winW - rect.width - 10);
            }

            el.style.top = `${top}px`;
            el.style.left = `${left}px`;
        }
    }, [popoverState, popoverRef]);

    if (!popoverState) return null;



    if (popoverState.menuDisplay === 'dial') {
        return (
            <DialMenu
                setId={popoverState.setId}
                initialX={popoverState.initialPointerX ?? popoverState.x}
                initialY={popoverState.initialPointerY ?? popoverState.y}
                buttons={buttons}
                onClose={() => setPopoverState(null)}
                onExecute={(btn, e) => handleButtonClick(btn, e as any)}
                triggerHaptic={triggerHaptic}
            />
        );
    }

    return (
        <div className="popover-menu" ref={popoverRef} style={{ position: 'fixed', left: popoverState.x, top: popoverState.y, zIndex: 9999 }}>
            {popoverState.type === 'teleport-save' && (() => {
                let labelInput: HTMLInputElement | null = null;
                const doSave = () => {
                    const label = labelInput?.value.trim();
                    if (label) {
                        const newTarget: TeleportTarget = {
                            id: popoverState.teleportId!,
                            label,
                            expiresAt: Date.now() + 24 * 60 * 60 * 1000
                        };
                        setTeleportTargets(prev => [...prev.filter(t => t.label !== label), newTarget]);
                        addMessage('system', `Stored room '${label}' (${popoverState.teleportId}) for 24 hours.`);
                        setPopoverState(null);
                    }
                };
                return (
                    <div style={{ padding: '12px', minWidth: '200px' }}>
                        <div style={{ fontSize: '0.8rem', color: 'var(--accent)', marginBottom: '10px', fontWeight: 'bold', letterSpacing: '1px' }}>📍 STORE TELEPORT ROOM</div>
                        <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', marginBottom: '8px', fontFamily: 'monospace' }}>{popoverState.teleportId}</div>
                        <input
                            type="text"
                            placeholder="Label (e.g. Bree)"
                            autoFocus
                            ref={el => { labelInput = el; }}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') { e.preventDefault(); doSave(); }
                                else if (e.key === 'Escape') setPopoverState(null);
                            }}
                            style={{ width: '100%', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', padding: '8px 10px', borderRadius: '6px', outline: 'none', fontSize: '0.9rem', boxSizing: 'border-box', marginBottom: '10px' }}
                        />
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                                onClick={doSave}
                                style={{ flex: 1, background: 'var(--accent)', border: 'none', color: '#000', padding: '8px', borderRadius: '6px', fontWeight: 'bold', fontSize: '0.85rem', cursor: 'pointer' }}
                            >Save</button>
                            <button
                                onClick={() => setPopoverState(null)}
                                style={{ flex: 1, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', padding: '8px', borderRadius: '6px', fontSize: '0.85rem', cursor: 'pointer' }}
                            >Cancel</button>
                        </div>
                    </div>
                );
            })()}

            {popoverState.type === 'teleport-select' && (
                <>
                    <div className="popover-header" style={{ padding: '8px 12px', fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', borderBottom: '1px solid rgba(255,255,255,0.1)', fontWeight: 'bold' }}>TARGET FOR {popoverState.spellCommand?.toUpperCase()}</div>
                    <div className="popover-scroll" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                        {teleportTargets.map(target => (
                            <div key={target.label} className="popover-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} onClick={() => {
                                executeCommand(`${popoverState.spellCommand} ${target.id}`);
                                setPopoverState(null);
                            }}>
                                <span>{target.label}</span>
                                <span style={{ fontSize: '0.6rem', opacity: 0.5, marginLeft: '10px' }}>{Math.round((target.expiresAt - Date.now()) / 3600000)}h</span>
                            </div>
                        ))}
                    </div>
                    <div style={{ display: 'flex', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                        <div className="popover-item" style={{ flex: 1, textAlign: 'center', opacity: 0.6, fontSize: '0.7rem' }} onClick={() => setPopoverState({ ...popoverState, x: window.innerWidth / 2 - 150, y: window.innerHeight / 2 - 150, type: 'teleport-manage', setId: 'teleport' })}>Manage Rooms</div>
                        <div className="popover-item" style={{ flex: 1, color: '#ff5555', textAlign: 'center' }} onClick={() => setPopoverState(null)}>Cancel</div>
                    </div>
                </>
            )}

            {popoverState.type === 'teleport-manage' && (
                <>
                    <div className="popover-header" style={{ padding: '10px 12px', fontSize: '0.8rem', color: 'var(--accent)', borderBottom: '1px solid rgba(255,255,255,0.1)', fontWeight: 'bold' }}>STORED ROOMS</div>
                    <div className="popover-scroll" style={{ maxHeight: '250px', overflowY: 'auto', minWidth: '220px' }}>
                        {teleportTargets.length === 0 && <div style={{ padding: '20px', fontSize: '0.8rem', opacity: 0.4, textAlign: 'center' }}>No rooms stored.</div>}
                        {teleportTargets.map(target => (
                            <div key={target.label} className="popover-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'default' }}>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: '0.9rem' }}>{target.label}</div>
                                    <div style={{ fontSize: '0.6rem', opacity: 0.4 }}>{target.id} • {Math.round((target.expiresAt - Date.now()) / 3600000)}h left</div>
                                </div>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setTeleportTargets(prev => prev.filter(t => t.label !== target.label));
                                    }}
                                    style={{ background: 'rgba(255,0,0,0.1)', border: 'none', color: '#ff5555', cursor: 'pointer', width: '28px', height: '28px', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem' }}
                                >✕</button>
                            </div>
                        ))}
                    </div>
                    <div className="popover-item" style={{ borderTop: '1px solid rgba(255,255,255,0.1)', textAlign: 'center', fontWeight: 'bold' }} onClick={() => setPopoverState(null)}>Close</div>
                </>
            )}

            {popoverState.type === 'give-recipient-select' && (
                <>
                    <div className="popover-header" style={{ padding: '8px 12px', fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', borderBottom: '1px solid rgba(255,255,255,0.1)', fontWeight: 'bold' }}>SELECT RECIPIENT</div>
                    <div className="popover-scroll" style={{ maxHeight: '200px', overflowY: 'auto', minWidth: '150px' }}>
                        {[...new Set(roomPlayers)].length === 0 && <div className="popover-empty">No one here.</div>}
                        {[...new Set(roomPlayers)].map(name => (
                            <div key={name} className="popover-item" onClick={() => {
                                executeCommand(`${popoverState.context} ${extractNoun(name)}`);
                                // Refresh inventory after giving
                                setTimeout(() => executeCommand('inv', false, false, true), 500);
                                setPopoverState(null);
                            }}>
                                {name}
                            </div>
                        ))}
                    </div>
                    <div className="popover-item" style={{ borderTop: '1px solid rgba(255,255,255,0.1)', color: '#ff5555', textAlign: 'center', fontWeight: 'bold' }} onClick={() => setPopoverState(null)}>Cancel</div>
                </>
            )}


            {!popoverState.type && (
                <>
                    <div className="popover-header"
                        style={{ cursor: popoverState.setId !== 'setmanager' ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.1)', marginBottom: '4px', paddingBottom: '4px' }}
                        onClick={() => {
                            if (popoverState.setId !== 'setmanager') {
                                setPopoverState({ ...popoverState, setId: 'setmanager' });
                            }
                        }}>
                        {popoverState.setId === 'player' || popoverState.setId === 'selection' || popoverState.setId === 'object' || popoverState.setId === 'inventorylist' || popoverState.setId === 'equipmentlist' || popoverState.setId === 'target' || popoverState.setId === 'inlineplayer' ? `Actions: ${popoverState.context} ▾` : (popoverState.setId === 'setmanager' ? 'Select Button Set' : `Set: ${popoverState.setId} ▾`)}
                    </div>

                    {(popoverState.setId === 'selection' || popoverState.setId === 'inventorylist' || popoverState.setId === 'equipmentlist') && (
                        <div className="popover-item" onClick={() => {
                            setTarget(popoverState.context || null);
                            setPopoverState(null);
                            addMessage('system', `Target set to: ${popoverState.context} `);
                        }}>
                            Set as Target
                        </div>
                    )}

                    <>
                        {popoverState.setId === 'setmanager' ? (
                            availableSets.map(setName => (
                                <div key={setName} className="popover-item" onClick={() => {
                                    setPopoverState({ ...popoverState, setId: setName });
                                }}>
                                    {setName}
                                </div>
                            ))
                        ) : (
                            <>
                                {popoverState.assignSourceId && (
                                    <div className="popover-item" style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', color: 'var(--accent)', fontWeight: 'bold' }} onClick={() => {
                                        const setName = popoverState.setId;
                                        if (popoverState.assignSwipeDir) {
                                            const dir = popoverState.assignSwipeDir;
                                            setButtons(prev => prev.map(b => {
                                                if (b.id !== popoverState.assignSourceId) return b;
                                                const swipeCommands = { ...b.swipeCommands, [dir]: setName };
                                                const swipeActionTypes = { ...b.swipeActionTypes, [dir]: 'nav' };
                                                const swipeSets = { ...b.swipeSets, [dir]: 'main' };
                                                return { ...b, swipeCommands, swipeActionTypes, swipeSets };
                                            }));
                                            setPopoverState(null);
                                            addMessage('system', `Assigned sub-menu '${setName}' to swipe ${dir}.`);
                                        } else {
                                            setButtons(prev => prev.map(b => b.id === popoverState.assignSourceId ? { ...b, command: setName, label: setName.toUpperCase(), actionType: 'nav' } : b));
                                            setPopoverState(null);
                                            addMessage('system', `Assigned sub-menu '${setName}' to button.`);
                                        }
                                    }}>
                                        Assign {popoverState.setId.toUpperCase()} as Menu
                                    </div>
                                )}
                                {buttons.filter(b => b.setId === popoverState!.setId).map(button => (
                                    <div key={button.id} className="popover-item" onClick={(e) => {
                                        if (popoverState?.assignSourceId) {
                                            if (popoverState.assignSwipeDir) {
                                                const dir = popoverState.assignSwipeDir;
                                                setButtons(prev => prev.map(b => {
                                                    if (b.id !== popoverState.assignSourceId) return b;
                                                    const swipeCommands = { ...b.swipeCommands, [dir]: button.command };
                                                    const swipeActionTypes = { ...b.swipeActionTypes, [dir]: button.actionType || 'command' };
                                                    const swipeSets = { ...b.swipeSets, [dir]: button.setId || 'main' };
                                                    return { ...b, swipeCommands, swipeActionTypes, swipeSets };
                                                }));
                                                setPopoverState(null);
                                                addMessage('system', `Assigned '${button.label}' to swipe ${dir}.`);
                                            } else {
                                                setButtons(prev => prev.map(b => b.id === popoverState.assignSourceId ? { ...b, command: button.command, label: button.label, actionType: button.actionType || 'command' } : b));
                                                setPopoverState(null);
                                                addMessage('system', `Assigned '${button.label}' to button.`);
                                            }
                                        } else {
                                            handleButtonClick(button, e, popoverState!.context);
                                        }
                                    }}>{button.label}</div>
                                ))}
                            </>
                        )}
                        {popoverState.setId !== 'setmanager' && buttons.filter(b => b.setId === popoverState!.setId).length === 0 && (
                            <div className="popover-empty">No buttons in set '{popoverState.setId}'</div>
                        )}
                    </>
                </>
            )}
        </div>
    );
};
