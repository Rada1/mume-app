/** @file RoomLootQueue.tsx — Persistent room loot entry point. */
import React from 'react';
import { createPortal } from 'react-dom';
import { BedDouble, Compass, GraduationCap, Store } from 'lucide-react';
import { useKillPromptStore } from '../../stores/useKillPromptStore';
import { useActiveRoom } from '../../stores/useActiveGameState';
import { useModeStore } from '../../stores/useModeStore';
import { useUIStore } from '../../stores/useUIStore';
import { useCommandPanelStore } from '../../stores/useCommandPanelStore';
import { useGearPanelStore } from '../../stores/useGearPanelStore';
import { useMapper } from '../../context/MapperContext';
import { getShopRoomLabel } from '../../utils/shopRoomUtils';
import { getGuildClassFromFlags } from '../../utils/practiceClassCatalog';
import { getRoomCorpseTargetSuggestions } from '../../objects/roomTargetSuggestions';
import { getCorpseCommandKeyword } from '../../objects/objectTargetModel';
import { getMountTargetSuggestions } from '../../utils/commandSuggestionUtils';
import { RoomLootPanel } from './RoomLootPanel';
import { useCorpseLootActions } from '../../hooks/useCorpseLootActions';
import { useCorpseContentsStore } from '../../stores/useCorpseContentsStore';
import { useMountCargoActions } from '../../hooks/useMountCargoActions';
import { useRoomLootCandidates } from '../../hooks/useRoomLootCandidates';
import { useAutoLootValuables } from '../../hooks/useAutoLootValuables';
import { useUI } from '../../context/GameContext';
import { useCombatStore } from '../../stores/useCombatStore';
import { useSettingsStore } from '../../stores/useSettingsStore';
import type { CommandTargetSuggestion } from '../../objects/targetSuggestionTypes';
import type { GmcpOccupant } from '../../types';
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
    const activeRoom = useActiveRoom();
    const roomNum = activeRoom.roomNum;
    const roomMapId = activeRoom.mapId;
    const roomItems = activeRoom.items;
    const isTargetSpectateView = useModeStore(state => state.isSpectating && state.activeView === 'target');
    const corpses = useKillPromptStore(state => state.corpses);
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
    const dismissedGroundLootIds = React.useMemo<ReadonlySet<string>>(() => new Set(), []);
    const [recipientTarget, setRecipientTarget] = React.useState('mount');
    const [giveLootToMount, setGiveLootToMount] = React.useState(false);
    const detectedMountSuggestions = React.useMemo(
        () => getMountTargetSuggestions(roomNpcs).filter(suggestion => suggestion.value !== 'mount'),
        [roomNpcs]
    );
    const mountSuggestions = [
        { key: 'fallback-mount', label: 'My mount', value: 'mount', meta: 'mount' },
        ...detectedMountSuggestions
    ];
    const selectedRecipientTarget = mountSuggestions.some(suggestion => suggestion.value === recipientTarget)
        ? recipientTarget
        : mountSuggestions[0]?.value || recipientTarget;
    const detectedRoomCorpses = React.useMemo(() => getRoomCorpseTargetSuggestions(roomItems)
        .map((corpse: CommandTargetSuggestion): LootTarget => ({
            id: `room:${corpse.objectId || corpse.key}`,
            label: corpse.label,
            commandTarget: corpse.value,
            containerId: corpse.objectId || corpse.key
        })), [roomItems]);
    const roomCorpses = React.useMemo(() => {
        const unmatchedRoomCorpses = [...detectedRoomCorpses];
        const matchedQueueIds = new Set<string>();
        const queued = isTargetSpectateView ? [] : corpses.filter(corpse => corpse.roomNum === roomNum);
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
    }, [corpses, detectedRoomCorpses, isTargetSpectateView, roomNum]);
    const groundLootItems = useRoomLootCandidates(roomItems, dismissedGroundLootIds);
    const lootSourceCount = roomCorpses.length + groundLootItems.length;
    const lootSummary = roomCorpses.length > 0
        ? `${roomCorpses.length} ${roomCorpses.length === 1 ? 'corpse' : 'corpses'}`
        : '';

    React.useEffect(() => {
        if (!isTargetSpectateView) retainRoom(roomNum);
        setIsOpen(false);
        clearContents();
    }, [clearContents, isTargetSpectateView, roomNum, retainRoom]);

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

    const examineCorpse = (corpse: LootTarget) => {
        const command = `examine ${corpse.commandTarget}`;
        requestContents(corpse.containerId, corpse.commandTarget);
        parser.setPendingFlags(true, true, command);
        executeCommand(command, true, true, false, true);
    };

    const corpseLoot = useCorpseLootActions({ executeCommand, examineCorpse, roomNum });
    const lootCorpse = (corpse: LootTarget) => corpseLoot.execute(corpse, `get all ${corpse.commandTarget}`);

    useAutoLootValuables({ enabled: autoLootValuables, roomId: roomNum,
        combatIsActive: engagedOpponents.length > 0 || opponentId !== null || opponentName !== null,
        isBusy: cargoBusy, hasMount: mountSuggestions.length > 0, corpses: roomCorpses,
        mountTarget: selectedRecipientTarget, lootValuables });

    if (!lootSourceCount && !shopLabel && !hasRentService && !hasGuildService && !shouldShowSeekRivendell) return null;

    const openShop = () => {
        setIsShopOpen(true);
        const commandPanel = useCommandPanelStore.getState();
        useGearPanelStore.getState().setIsOpen(false);
        if (isMobile) commandPanel.setIsMobileGuideOpen(true);
        else commandPanel.setIsOpen(true);
        commandPanel.requestShopOpen();
        commandPanel.requestTargetSection('shop');
        triggerHaptic?.(10);
    };
    const openSkillsPanel = () => {
        const commandPanel = useCommandPanelStore.getState();
        useGearPanelStore.getState().setIsOpen(false);
        if (isMobile) commandPanel.setIsMobileGuideOpen(true);
        else commandPanel.setIsOpen(true);
        commandPanel.requestPracticeOpen();
        commandPanel.requestTargetSection('practice');
        triggerHaptic?.(10);
    };
    const lootPanel = <RoomLootPanel isMobile={isMobile} lootSourceCount={lootSourceCount} lootSummary={lootSummary}
        selectedRecipientTarget={selectedRecipientTarget} setRecipientTarget={setRecipientTarget}
        giveLootToMount={giveLootToMount} setGiveLootToMount={setGiveLootToMount}
        detectedMountSuggestions={detectedMountSuggestions} roomCorpses={roomCorpses} cargoBusy={cargoBusy || corpseLoot.isBusy}
        lootCorpse={lootCorpse} lootValuables={lootValuables} corpseContents={corpseContents}
        examineCorpse={examineCorpse} executeCommand={command => executeCommand(command)} groundLootItems={groundLootItems}
        executeCorpseCommand={corpseLoot.execute} onClose={() => setIsOpen(false)} />;

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
                onClick={() => sellMountLoot()} aria-label="Sell mount loot">
                <Store size={14} /><span>{cargoBusy ? 'Selling…' : 'Sell mount loot'}</span>
            </button>}
            {(cargoStatus || corpseLoot.status) && <span className="room-loot-status" role="status">{cargoStatus || corpseLoot.status}</span>}
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
