/** @file RoomLootQueue.tsx — Persistent room loot entry point. */
import React from 'react';
import { createPortal } from 'react-dom';
import { BedDouble, Coins, Compass, GraduationCap, Store, X } from 'lucide-react';
import { useKillPromptStore } from '../../stores/useKillPromptStore';
import { useRoomStore } from '../../stores/useRoomStore';
import { useUIStore } from '../../stores/useUIStore';
import { useCommandPanelStore } from '../../stores/useCommandPanelStore';
import { useMapper } from '../../context/MapperContext';
import { getShopRoomLabel } from '../../utils/shopRoomUtils';
import { getGuildClassFromFlags } from '../../utils/practiceClassCatalog';
import { getRoomCorpseTargetSuggestions } from '../../objects/roomTargetSuggestions';
import { getCorpseCommandKeyword } from '../../objects/objectTargetModel';
import { getMountTargetSuggestions } from '../../utils/commandSuggestionUtils';
import { RoomLootCorpseContents } from './RoomLootCorpseContents';
import { useCorpseContentsStore } from '../../stores/useCorpseContentsStore';
import { useMountCargoActions } from '../../hooks/useMountCargoActions';
import { useRoomLootCandidates } from '../../hooks/useRoomLootCandidates';
import { useAutoLootValuables } from '../../hooks/useAutoLootValuables';
import { useUI } from '../../context/GameContext';
import { useCombatStore } from '../../stores/useCombatStore';
import { useSettingsStore } from '../../stores/useSettingsStore';
import type { CommandTargetSuggestion } from '../../objects/targetSuggestionTypes';
import type { GmcpOccupant } from '../../types';
import { RoomLootGroundItems } from './RoomLootGroundItems';
import './RoomLootQueue.css';

interface RoomLootQueueProps {
    isMobile: boolean;
    executeCommand: (command: string, silent?: boolean, isSystem?: boolean, isHistorical?: boolean, fromDrawer?: boolean) => void;
    roomNpcs: GmcpOccupant[];
    triggerHaptic?: (duration: number) => void;
    parser: {
        setPendingFlags: (silent: boolean, fromDrawer: boolean, command?: string) => void;
    };
}

interface LootTarget {
    id: string;
    label: string;
    commandTarget: string;
    containerId: string;
    queuedCorpseId?: string;
}

const SEEK_RIVENDELL_ROOM_IDS = new Set(['7492', '7491', '7136', '7488', '6978', '6977', '6972', '7711490', '10085070', '5590844', '11348499', '7571803']);

// --- Logic Section ---
export const RoomLootQueue: React.FC<RoomLootQueueProps> = ({
    isMobile, executeCommand, roomNpcs, parser, triggerHaptic
}) => {
    const mapper = useMapper();
    const setIsShopOpen = useUIStore(state => state.setIsShopOpen);
    const setShopkeeperName = useUIStore(state => state.setShopkeeperName);
    const requestCommandTab = useCommandPanelStore(state => state.requestTab);
    const setSkillsOpen = useCommandPanelStore(state => state.setIsSkillsOpen);
    const setMobileCommandsOpen = useCommandPanelStore(state => state.setIsMobileOpen);
    const roomNum = useRoomStore(state => state.roomNum);
    const roomMapId = useRoomStore(state => state.mapId);
    const roomItems = useRoomStore(state => state.items);
    const corpses = useKillPromptStore(state => state.corpses);
    const removeCorpse = useKillPromptStore(state => state.removeCorpse);
    const retainRoom = useKillPromptStore(state => state.retainRoom);
    const corpseContents = useCorpseContentsStore(state => state.contents);
    const autoLootValuables = useSettingsStore(state => state.autoLootValuables);
    const engagedOpponents = useCombatStore(state => state.engagedOpponents);
    const opponentId = useCombatStore(state => state.opponentId);
    const opponentName = useCombatStore(state => state.opponentName);
    const requestContents = useCorpseContentsStore(state => state.requestContents);
    const clearContents = useCorpseContentsStore(state => state.clearContents);
    const { displayInventoryLines } = useUI();
    const { isBusy: cargoBusy, status: cargoStatus, lootValuables, sellMountLoot } = useMountCargoActions({ executeCommand, inventoryLines: displayInventoryLines });
    const shopLabel = React.useMemo(() => {
        const rawId = String(mapper.currentRoomId || '').replace(/^m_/, '');
        return getShopRoomLabel(mapper.currentRoomId, mapper.rooms, mapper.preloadedCoordsRef.current?.[rawId]);
    }, [mapper.currentRoomId, mapper.rooms, mapper.preloadedCoordsRef, mapper.renderVersion]);
    const seekRoomId = String(mapper.currentRoomId || '').trim().replace(/^(m_|r_)/, '');
    const seekRoom = mapper.rooms[mapper.currentRoomId || ''] || mapper.rooms[`m_${seekRoomId}`] || mapper.rooms[seekRoomId];
    const seekRoomData = mapper.preloadedCoordsRef.current?.[seekRoomId] as readonly unknown[] | undefined;
    const seekRoomIdentifiers = [
        seekRoomId,
        String(roomNum ?? '').trim(),
        String(roomMapId ?? '').trim(),
        String(seekRoom?.gmcpId ?? '').trim(),
        String(seekRoomData?.[6] ?? '').trim()
    ];
    const shouldShowSeekRivendell = seekRoomIdentifiers.some(id => SEEK_RIVENDELL_ROOM_IDS.has(id));
    const roomFlags = React.useMemo(() => {
        const rawId = String(mapper.currentRoomId || '').replace(/^m_/, '');
        const room = mapper.rooms[mapper.currentRoomId || ''] || mapper.rooms[`m_${rawId}`] || mapper.rooms[rawId];
        const preloaded = mapper.preloadedCoordsRef.current?.[rawId] as readonly unknown[] | undefined;
        return [
            ...(Array.isArray(preloaded?.[7]) ? preloaded[7] as string[] : []),
            ...(Array.isArray(preloaded?.[8]) ? preloaded[8] as string[] : []),
            ...(room?.mobFlags || []),
            ...(room?.loadFlags || [])
        ].map(flag => String(flag).toUpperCase());
    }, [mapper.currentRoomId, mapper.preloadedCoordsRef, mapper.renderVersion, mapper.rooms]);
    const hasRentService = roomFlags.includes('RENT');
    const hasGuildService = roomFlags.includes('GUILD') || Boolean(getGuildClassFromFlags(roomFlags));
    const [isOpen, setIsOpen] = React.useState(false);
    const lootTriggerRef = React.useRef<HTMLButtonElement | null>(null);
    const [mobilePanelPosition, setMobilePanelPosition] = React.useState({ top: 0, right: 8 });
    const [handledRoomItems, setHandledRoomItems] = React.useState<Set<string>>(() => new Set());
    const [dismissedGroundLootIds, setDismissedGroundLootIds] = React.useState<Set<string>>(() => new Set());
    const [recipientTarget, setRecipientTarget] = React.useState('mount');
    const detectedMountSuggestions = React.useMemo(
        () => getMountTargetSuggestions(roomNpcs).filter(suggestion => suggestion.value !== 'mount'),
        [roomNpcs]
    );
    const mountSuggestions = detectedMountSuggestions.length ? detectedMountSuggestions : [
        { key: 'fallback-mount', label: 'My mount', value: 'mount', meta: 'mount' }
    ];
    const selectedRecipientTarget = mountSuggestions.some(suggestion => suggestion.value === recipientTarget)
        ? recipientTarget
        : mountSuggestions[0]?.value || recipientTarget;
    const recipientLabel = mountSuggestions.find(suggestion => suggestion.value === selectedRecipientTarget)?.label || 'my mount';

    const detectedRoomCorpses = React.useMemo(() => getRoomCorpseTargetSuggestions(roomItems)
        .filter(corpse => !handledRoomItems.has(corpse.objectId || corpse.key))
        .map((corpse: CommandTargetSuggestion): LootTarget => ({
            id: `room:${corpse.objectId || corpse.key}`,
            label: corpse.label,
            commandTarget: corpse.value,
            containerId: corpse.objectId || corpse.key
        })), [handledRoomItems, roomItems]);

    const roomCorpses = React.useMemo(() => {
        const unmatchedRoomCorpses = [...detectedRoomCorpses];
        const matchedQueueIds = new Set<string>();
        const queued = corpses.filter(corpse => corpse.roomNum === roomNum);
        const combined = detectedRoomCorpses.map(roomCorpse => {
            const normalizedLabel = normalizeCorpseLabel(roomCorpse.label);
            const matched = queued.find(corpse => !matchedQueueIds.has(corpse.id) &&
                (normalizedLabel.includes(normalizeCorpseLabel(corpse.name)) ||
                    normalizeCorpseLabel(corpse.name).includes(normalizedLabel)));
            if (matched) matchedQueueIds.add(matched.id);
            return matched ? { ...roomCorpse, queuedCorpseId: matched.id } : roomCorpse;
        });
        const targetCounts = new Map<string, number>();
        combined.forEach(corpse => {
            const baseTarget = corpse.commandTarget.replace(/^\d+\./, '');
            targetCounts.set(baseTarget, (targetCounts.get(baseTarget) || 0) + 1);
        });
        queued.forEach(corpse => {
            if (!matchedQueueIds.has(corpse.id)) {
                const baseTarget = getCorpseCommandKeyword(corpse.name);
                const ordinal = (targetCounts.get(baseTarget) || 0) + 1;
                targetCounts.set(baseTarget, ordinal);
                combined.push({
                    id: `queued:${corpse.id}`,
                    label: corpse.name,
                    commandTarget: ordinal > 1 ? `${ordinal}.${baseTarget}` : baseTarget,
                    containerId: corpse.id,
                    queuedCorpseId: corpse.id
                });
            }
        });
        return combined.length ? combined : unmatchedRoomCorpses;
    }, [corpses, detectedRoomCorpses, roomNum]);
    const groundLootItems = useRoomLootCandidates(roomItems, dismissedGroundLootIds);
    const lootSourceCount = roomCorpses.length + groundLootItems.length;
    const lootSummary = [
        roomCorpses.length > 0 ? `${roomCorpses.length} ${roomCorpses.length === 1 ? 'corpse' : 'corpses'}` : '',
        groundLootItems.length > 0 ? `${groundLootItems.length} ${groundLootItems.length === 1 ? 'ground item' : 'ground items'}` : ''
    ].filter(Boolean).join(' · ');

    React.useEffect(() => {
        retainRoom(roomNum);
        setIsOpen(false);
        setHandledRoomItems(new Set());
        setDismissedGroundLootIds(new Set());
        clearContents();
    }, [clearContents, roomNum, retainRoom]);

    const updateMobilePanelPosition = () => {
        const rect = lootTriggerRef.current?.getBoundingClientRect();
        if (!rect) return;
        setMobilePanelPosition({
            top: rect.bottom + 8,
            right: Math.max(8, window.innerWidth - rect.right)
        });
    };

    const openQueue = () => {
        updateMobilePanelPosition();
        setIsOpen(true);
    };

    React.useEffect(() => {
        if (!isMobile || !isOpen) return;
        window.addEventListener('resize', updateMobilePanelPosition);
        return () => window.removeEventListener('resize', updateMobilePanelPosition);
    }, [isMobile, isOpen]);

    const lootCorpse = (corpse: LootTarget) => {
        const target = corpse.commandTarget.trim();
        if (!target) return;
        executeCommand(`get all ${target}`);
        if (corpse.queuedCorpseId) removeCorpse(corpse.queuedCorpseId);
        if (corpse.id.startsWith('room:')) {
            const itemId = corpse.id.slice('room:'.length);
            setHandledRoomItems(current => new Set(current).add(itemId));
        }
    };

    const examineCorpse = (corpse: LootTarget) => {
        const command = `examine ${corpse.commandTarget}`;
        requestContents(corpse.containerId, corpse.commandTarget);
        parser.setPendingFlags(true, true, command);
        executeCommand(command, true, true, false, true);
    };

    useAutoLootValuables({ enabled: autoLootValuables, roomId: roomNum,
        combatIsActive: engagedOpponents.length > 0 || opponentId !== null || opponentName !== null,
        isBusy: cargoBusy, hasMount: mountSuggestions.length > 0, corpses: roomCorpses,
        mountTarget: selectedRecipientTarget, lootValuables });

    if (!lootSourceCount && !shopLabel && !hasRentService && !hasGuildService && !shouldShowSeekRivendell) return null;

    const openShop = () => {
        setShopkeeperName(null);
        setIsShopOpen(true);
        executeCommand('list');
        triggerHaptic?.(10);
    };
    const openSkillsPanel = () => {
        requestCommandTab('skills');
        if (isMobile) setMobileCommandsOpen(true);
        else setSkillsOpen(true);
        triggerHaptic?.(10);
    };
    const lootPanel = <section className="room-loot-panel" role="dialog" aria-modal={isMobile || undefined} aria-label="Loot in this room">
        <header className="room-loot-panel-header">
            <div>
                <strong>Loot in this room</strong>
                <span>{lootSummary}</span>
            </div>
            <button type="button" onClick={() => setIsOpen(false)} aria-label="Close loot list"><X size={17} /></button>
        </header>
        <label className="room-loot-recipient">
            <span>Give selected to</span>
            <select value={selectedRecipientTarget} onChange={event => setRecipientTarget(event.target.value)}>
                {!detectedMountSuggestions.length && <option value="mount">My mount</option>}
                {detectedMountSuggestions.map(mount => <option key={mount.key} value={mount.value}>{mount.label}</option>)}
            </select>
        </label>
        <div className="room-loot-list">
            {roomCorpses.map(corpse => (
                <div className="room-loot-row" key={corpse.id}>
                    <div className="room-loot-row-heading">
                        <span>{corpse.label}</span>
                        <div className="room-loot-row-actions">
                            <button type="button" onClick={() => lootCorpse(corpse)}>Get all</button>
                            {mountSuggestions.length > 0 && <button type="button" disabled={cargoBusy}
                                onClick={() => lootValuables(corpse.containerId, corpse.commandTarget, selectedRecipientTarget)}>
                                <Coins size={12} /> Valuables → {recipientLabel}
                            </button>}
                        </div>
                    </div>
                    <RoomLootCorpseContents
                        corpseId={corpse.containerId}
                        corpseLabel={corpse.label}
                        corpseTarget={corpse.commandTarget}
                        contents={corpseContents[corpse.containerId]}
                        recipientTarget={selectedRecipientTarget}
                        recipientLabel={recipientLabel}
                        onLookInside={() => examineCorpse(corpse)}
                        executeCommand={command => executeCommand(command)}
                    />
                </div>
            ))}
            <RoomLootGroundItems
                items={groundLootItems}
                recipientTarget={selectedRecipientTarget}
                recipientLabel={recipientLabel}
                executeCommand={command => executeCommand(command)}
                onDismiss={id => setDismissedGroundLootIds(current => new Set(current).add(id))}
            />
        </div>
        <p className="room-loot-help">Actions use creature-specific corpse keywords; duplicate bodies use ordinals.</p>
    </section>;

    return (
        <div className={`room-loot-root${isMobile ? ' is-mobile' : ''}`}>
            {shopLabel && <button className="room-shop-trigger" type="button" onClick={event => {
                event.stopPropagation();
                openShop();
            }}
                aria-label={`Open ${shopLabel.toLowerCase()}`}>
                <Store size={14} /><span>{shopLabel}</span>
            </button>}
            {shopLabel && <button className="room-shop-trigger" type="button" disabled={cargoBusy}
                onClick={() => sellMountLoot(mountSuggestions)} aria-label="Sell mount loot">
                <Store size={14} /><span>{cargoBusy ? 'Selling…' : 'Sell mount loot'}</span>
            </button>}
            {cargoStatus && <span className="room-loot-status" role="status">{cargoStatus}</span>}
            {shouldShowSeekRivendell && <button className="room-context-trigger is-seek" type="button" onClick={() => {
                executeCommand('seek rivendell');
                triggerHaptic?.(10);
            }} aria-label="Seek Rivendell">
                <Compass size={14} /><span>Seek</span>
            </button>}
            {hasRentService && <button className="room-context-trigger is-rent" type="button"
                onClick={() => { executeCommand('rent'); triggerHaptic?.(10); }}
                aria-label="Rent a room here">
                <BedDouble size={14} /><span>Rent</span>
            </button>}
            {hasGuildService && <button className="room-context-trigger is-guild" type="button"
                onClick={openSkillsPanel}
                aria-label="Open skills panel at this guild">
                <GraduationCap size={14} /><span>Skills</span>
            </button>}
            {lootSourceCount > 0 && <div className="room-loot-trigger-wrap">
                <button ref={lootTriggerRef} className="room-loot-trigger" type="button" onClick={openQueue}
                    aria-expanded={isOpen} aria-haspopup="dialog"
                    aria-label={`Open loot list, ${lootSourceCount} available loot sources`}>
                    <span>Loot</span><span className="room-loot-count">{lootSourceCount}</span>
                </button>
                {!isMobile && isOpen && <div className="room-loot-desktop-popover">{lootPanel}</div>}
            </div>}

            {isMobile && isOpen && createPortal(
                <div className="room-loot-overlay is-mobile" style={{
                    '--room-loot-panel-top': `${mobilePanelPosition.top}px`,
                    '--room-loot-panel-right': `${mobilePanelPosition.right}px`
                } as React.CSSProperties}>
                    {lootPanel}
                </div>,
                document.body
            )}
        </div>
    );
};

const normalizeCorpseLabel = (label: string): string => label
    .toLowerCase()
    .replace(/^(?:the\s+)?(?:corpse|body)(?:\s+of)?\s+/, '')
    .replace(/^(?:a|an|the)\s+/, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
