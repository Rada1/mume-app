/** @file RoomLootPanel.tsx — Command-style loot source and action surface. */
import React from 'react';
import { ChevronDown, X } from 'lucide-react';
import type { DrawerLine } from '../../types';
import type { CommandTargetSuggestion } from '../../objects/targetSuggestionTypes';
import type { GroundLootCandidate } from '../../hooks/useRoomLootCandidates';
import { RoomLootCorpseContents } from './RoomLootCorpseContents';
import { RoomLootGroundItems } from './RoomLootGroundItems';
import { GearSelectionCheckbox } from '../GearSelectionCheckbox';

// --- Props Section ---
interface LootSource { id: string; label: string; commandTarget: string; containerId: string; queuedCorpseId?: string; }
interface RoomLootPanelProps {
    isMobile: boolean; lootSourceCount: number; lootSummary: string;
    selectedRecipientTarget: string; setRecipientTarget: (value: string) => void;
    giveLootToMount: boolean; setGiveLootToMount: (enabled: boolean) => void;
    detectedMountSuggestions: CommandTargetSuggestion[]; roomCorpses: LootSource[];
    executeCorpseCommand: (corpse: LootSource, command: string) => void;
    cargoBusy: boolean; lootCorpse: (corpse: LootSource) => void;
    lootValuables: (id: string, target: string, recipient: string | null) => void;
    corpseContents: Record<string, DrawerLine[]>;
    examineCorpse: (corpse: LootSource) => void; executeCommand: (command: string) => void;
    groundLootItems: GroundLootCandidate[]; onClose: () => void;
}
// --- Render Section ---
export const RoomLootPanel: React.FC<RoomLootPanelProps> = ({ isMobile, lootSourceCount, lootSummary, selectedRecipientTarget, setRecipientTarget, giveLootToMount, setGiveLootToMount, detectedMountSuggestions, roomCorpses, cargoBusy, lootCorpse, lootValuables, corpseContents, examineCorpse, executeCommand, groundLootItems, executeCorpseCommand, onClose }) => {
    const recipientLabel = detectedMountSuggestions.find(mount => mount.value === selectedRecipientTarget)?.label || 'My mount';
    return <section className="room-loot-panel" role="dialog" aria-modal={isMobile || undefined} aria-label="Loot in this room">
        <header className="room-loot-panel-header">
            <div>
                <strong title="Actions use creature-specific corpse keywords; duplicate bodies use ordinals.">Loot <small className="room-loot-count">{lootSourceCount}</small></strong>
                {lootSummary && <span>{lootSummary}</span>}
            </div>
            <button type="button" onClick={() => onClose()} aria-label="Close loot list"><X size={17} /></button>
        </header>
        <div className="room-loot-transfer-mode">
            <button type="button" role="switch" aria-checked={giveLootToMount}
                className={`room-loot-mount-toggle${giveLootToMount ? ' is-enabled' : ''}`}
                onClick={() => setGiveLootToMount(!giveLootToMount)}>
                <span className="room-loot-toggle-track" aria-hidden="true"><span /></span>
                <span>Give loot to mount</span>
            </button>
            {giveLootToMount && detectedMountSuggestions.length > 0 && <select aria-label="Mount recipient"
                value={selectedRecipientTarget} onChange={event => setRecipientTarget(event.target.value)}>
                <option value="mount">My mount</option>
                {detectedMountSuggestions.map(mount => <option key={mount.key} value={mount.value}>{mount.label}</option>)}
            </select>}
        </div>
        <div className="room-loot-list">
            <RoomLootGroundItems
                items={groundLootItems}
                corpses={roomCorpses.map(corpse => ({
                    id: corpse.id,
                    label: corpse.label,
                    commandTarget: corpse.commandTarget,
                    kind: 'corpse'
                }))}
                recipientTarget={selectedRecipientTarget}
                giveToMount={giveLootToMount}
                recipientLabel={recipientLabel}
                executeCommand={command => executeCommand(command)}
            >{({ selectedIds, toggleSelected }) => roomCorpses.map(corpse => (
                <div className="room-loot-ground-row room-loot-corpse-row" key={corpse.id}
                    data-selected={selectedIds.has(corpse.id) || undefined}>
                    <details className="room-loot-row" onToggle={event => { if (event.currentTarget.open) examineCorpse(corpse); }}>
                        <summary className="room-loot-corpse-object"><span title={corpse.label}>{corpse.label}</span><small>&lt;{corpse.commandTarget}&gt;</small><ChevronDown size={12} /></summary>
                        <div className="room-loot-corpse-loot">
                            <div className="room-loot-section-heading"><span>Loot</span></div>
                            <div className="room-loot-actions">
                                <button type="button" className="room-loot-command" disabled={cargoBusy} onClick={() => lootCorpse(corpse)}><span>get all</span><small>&lt;get all {corpse.commandTarget}&gt;</small></button>
                                <button type="button" className="room-loot-command" disabled={cargoBusy}
                                    onClick={() => lootValuables(corpse.containerId, corpse.commandTarget, giveLootToMount ? selectedRecipientTarget : null)}>
                                    <span>get valuables</span><small>{giveLootToMount ? `→ ${recipientLabel}` : 'to inventory'}</small>
                                </button>
                            </div>
                            <RoomLootCorpseContents
                                isBusy={cargoBusy}
                                corpseId={corpse.containerId}
                                corpseLabel={corpse.label}
                                corpseTarget={corpse.commandTarget}
                                contents={corpseContents[corpse.containerId]}
                                recipientTarget={selectedRecipientTarget}
                                giveToMount={giveLootToMount}
                                recipientLabel={recipientLabel}
                                executeCommand={command => executeCorpseCommand(corpse, command)}
                            />
                        </div>
                    </details>
                    <GearSelectionCheckbox checked={selectedIds.has(corpse.id)} label={`Select ${corpse.label}`} onChange={() => toggleSelected(corpse.id)} />
                </div>
            ))}
            </RoomLootGroundItems>
        </div>
    </section>;

};
