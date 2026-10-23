/** @file useRoomInfoCard.ts — Room resolution, notes, and map-edit actions. */
import { useEffect, useState } from 'react';
import type { RoomInfoCardProps, RoomInfoBadge } from '../types';
import type { MapperRoom } from '../components/Mapper/mapperTypes';
import { DIRS, generateId } from '../components/Mapper/mapperUtils';
import { resolveRoomInfoRoom, roomInfoTerrainLabel } from '../utils/roomInfoRoom';
import { normalizeMapRoomFlag } from '../utils/mapRoomFlags';
import { useRoomFlagEditor } from './useRoomFlagEditor';

// --- Resolve the selected room and persist edits through mapper state ---
export const useRoomInfoCard = ({roomId, rooms, setRooms, mode, preloadedCoordsRef, isMmapperMap = false, setViewZ}: RoomInfoCardProps) => {
    const masterData = preloadedCoordsRef?.current[roomId.replace(/^m_/, '')];
    const room = resolveRoomInfoRoom(roomId, rooms, masterData, isMmapperMap);
    const [flagsEditingRoomId, setFlagsEditingRoomId] = useState<string | null>(null);
    const flagsEditing = flagsEditingRoomId === roomId;
    useEffect(() => { if (room) setViewZ?.(room.z || 0); }, [roomId, room?.z, setViewZ]);
    const terrain = room?.terrain && room.terrain !== 'Field' ? room.terrain : masterData?.[3] ?? room?.terrain;
    const terrainLabel = roomInfoTerrainLabel(terrain, isMmapperMap);
    const updateRoom = (patch: Partial<MapperRoom>) => {
        if (!room) return;
        const flagsPatch = patch.mobFlags !== undefined || patch.loadFlags !== undefined
            ? { mobFlags: room.mobFlags ?? [], loadFlags: room.loadFlags ?? [], mapFlagsEdited: true } : {};
        const attributeKeys = (['align', 'light', 'sundeath', 'portable', 'ridable'] as const).filter(key => key in patch);
        const attributesPatch = attributeKeys.length
            ? { mapAttributesEdited: [...new Set([...(room.mapAttributesEdited ?? []), ...attributeKeys])] } : {};
        const lightingPatch = 'light' in patch
            ? { mobFlags: (room.mobFlags ?? []).filter(flag => !['DARK', 'NOLIGHT'].includes(normalizeMapRoomFlag(flag))) } : {};
        setRooms(previous => ({...previous, [roomId]: {...(previous[roomId] || room), ...flagsPatch, ...attributesPatch, ...lightingPatch, ...patch}}));
    };
    const flagEditor = useRoomFlagEditor(room, updateRoom);
    const updateNotes = (notes: string) => updateRoom({notes, notesEdited: true});
    const editExit = (d: string, remove: boolean) => {
        if (mode !== 'edit' || !room) return;
        setRooms(prev => {
            const r = prev[roomId] || room;
            if (remove && r.exits[d]) {
                const targetId = r.exits[d].target;
                const nextRooms = { ...prev };
                const nextExits = { ...r.exits };
                delete nextExits[d];
                nextRooms[roomId] = { ...r, exits: nextExits };
                if (targetId && nextRooms[targetId]) {
                    const targetExits = { ...nextRooms[targetId].exits };
                    const opp = DIRS[d]?.opp;
                    if (opp) delete targetExits[opp];
                    nextRooms[targetId] = { ...nextRooms[targetId], exits: targetExits };
                }
                return nextRooms;
            }
            if (!r.exits[d]) {
                const dir = DIRS[d];
                if (!dir) return prev;
                const tx = r.x + dir.dx, ty = r.y + dir.dy, tz = (r.z || 0) + (dir.dz || 0);
                let tId = Object.keys(prev).find(id => Math.round(prev[id].x) === Math.round(tx) && Math.round(prev[id].y) === Math.round(ty) && (prev[id].z || 0) === tz);
                const nextRooms = { ...prev };
                if (!tId) {
                    tId = generateId();
                    nextRooms[tId] = { id: tId, gmcpId: 0, name: 'New Room', desc: '', x: tx, y: ty, z: tz, terrain: 'Field', exits: {}, zone: r.zone || '', notes: "", createdAt: Date.now() };
                }
                nextRooms[roomId] = { ...r, exits: { ...r.exits, [d]: { target: tId, closed: false, hasDoor: false } } };
                if (dir.opp) {
                    nextRooms[tId] = { ...nextRooms[tId], exits: { ...nextRooms[tId].exits, [dir.opp]: { target: roomId, closed: false, hasDoor: false } } };
                }
                return nextRooms;
            } else {
                const targetId = r.exits[d].target;
                const closed = !r.exits[d].closed;
                const nextRooms = { ...prev };
                nextRooms[roomId] = { ...r, exits: { ...r.exits, [d]: { ...r.exits[d], closed } } };
                if (targetId && nextRooms[targetId]) {
                    const opp = DIRS[d]?.opp;
                    if (opp) {
                        nextRooms[targetId] = { ...nextRooms[targetId], exits: { ...nextRooms[targetId].exits, [opp]: { ...(nextRooms[targetId].exits[opp] || {}), closed, target: roomId } } };
                    }
                }
                return nextRooms;
            }
        });
    };
    const getNoteBadges = () => {
        if (!room?.notes) return [];
        const badges: RoomInfoBadge[] = [];
        const noteLower = room.notes.toLowerCase();
        
        // Herb matching
        const genericHerbs = ['herb', 'plant', 'flower', 'root', 'berry', 'berries'];
        const specificHerbKeywords = ['sage', 'thyme', 'clover', 'tarragon', 'cardamom', 'rosemary', 'mandrake', 'ginseng', 'garlic', 'wolfsbane', 'hemlock', 'belladonna', 'foxglove', 'lavender', 'comfrey'];
        const foundSpecificHerbs = specificHerbKeywords.filter(k => noteLower.includes(k));
        const foundGenericHerbs = genericHerbs.filter(k => noteLower.includes(k));
        
        if (foundSpecificHerbs.length > 0 || foundGenericHerbs.length > 0) {
            const displayNames = foundSpecificHerbs.length > 0 ? foundSpecificHerbs : foundGenericHerbs;
            badges.push({
                text: `🌿 Herb: ${displayNames.join(', ')}`,
                color: '#a6e3a1',
                bg: 'rgba(166, 227, 161, 0.15)'
            });
        }
        
        // Gear matching
        const genericGear = ['gear', 'equipment', 'weapon'];
        const specificGearKeywords = ['sword', 'shield', 'ring', 'cloak', 'boots', 'helmet', 'armour', 'armor', 'mail', 'blade', 'dagger', 'bow', 'arrow', 'axe', 'spear', 'staff', 'robe', 'greaves', 'vambraces', 'gauntlets', 'circlet', 'belt'];
        const foundSpecificGear = specificGearKeywords.filter(k => noteLower.includes(k));
        const foundGenericGear = genericGear.filter(k => noteLower.includes(k));
        
        if (foundSpecificGear.length > 0 || foundGenericGear.length > 0) {
            const displayNames = foundSpecificGear.length > 0 ? foundSpecificGear : foundGenericGear;
            badges.push({
                text: `🛡️ Gear: ${displayNames.join(', ')}`,
                color: '#89b4fa',
                bg: 'rgba(137, 180, 250, 0.15)'
            });
        }

        if (noteLower.includes('chest') || noteLower.includes('coffer') || noteLower.includes('key') || noteLower.includes('lock')) {
            badges.push({
                text: `🔑 Contains: Key/Chest`,
                color: '#f9e2af',
                bg: 'rgba(249, 226, 175, 0.15)'
            });
        }

        return badges;
    };

    return {room, terrainLabel, updateRoom, updateNotes, editExit, noteBadges: getNoteBadges(),
        flagsEditing, toggleFlagsEditor: () => setFlagsEditingRoomId(flagsEditing ? null : roomId),
        flagEditor};
};
