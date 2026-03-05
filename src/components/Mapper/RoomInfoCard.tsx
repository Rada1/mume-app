import React from 'react';
import { MapperRoom } from './mapperTypes';
import { TERRAIN_MAP, DIRS, generateId, normalizeTerrain } from './mapperUtils';

interface RoomInfoCardProps {
    roomId: string;
    rooms: Record<string, MapperRoom>;
    setRooms: React.Dispatch<React.SetStateAction<Record<string, MapperRoom>>>;
    mode: 'play' | 'edit';
    onClose: () => void;
    cardRef: React.RefObject<HTMLDivElement>;
    preloadedCoordsRef?: React.MutableRefObject<Record<string, [number, number, number, number, Record<string, string | number>, string, string]>>;
    setViewZ?: (z: number | null) => void;
}

export const RoomInfoCard: React.FC<RoomInfoCardProps> = ({
    roomId, rooms, setRooms, mode, onClose, cardRef, preloadedCoordsRef, setViewZ
}) => {
    let room = rooms[roomId];

    React.useEffect(() => {
        if (room && setViewZ) {
            setViewZ(room.z || 0);
        }
    }, [roomId, room?.z, setViewZ]);

    // Virtual Master Room derivation
    if (!room && roomId.startsWith('m_') && preloadedCoordsRef?.current) {
        const vnum = roomId.substring(2);
        const data = preloadedCoordsRef.current[vnum];
        if (data) {
            // MMapper format: [x, y, z, terrainVal, exits, name, masterId]
            const [x, y, z, terrainVal, exitsData, nameVal, masterId] = data;

            // Map the strange numbers/objects to our internal exit format
            const mappedExits: Record<string, import('./mapperTypes').MapperExit> = {};
            if (exitsData) {
                for (const d in (exitsData as any)) {
                    let dirKey = d.toLowerCase();
                    // Normalize standard and full direction names
                    if (dirKey === 'north') dirKey = 'n';
                    else if (dirKey === 'south') dirKey = 's';
                    else if (dirKey === 'east') dirKey = 'e';
                    else if (dirKey === 'west') dirKey = 'w';
                    else if (dirKey === 'up') dirKey = 'u';
                    else if (dirKey === 'down') dirKey = 'd';
                    else if (dirKey === 'northeast') dirKey = 'ne';
                    else if (dirKey === 'northwest') dirKey = 'nw';
                    else if (dirKey === 'southeast') dirKey = 'se';
                    else if (dirKey === 'southwest') dirKey = 'sw';

                    const dest = (exitsData as any)[d];
                    const rawDestId = typeof dest === 'number' ? dest : (typeof dest === 'object' ? (dest as any).id : (typeof dest === 'string' ? dest : null));
                    const destId = rawDestId !== null ? Number(rawDestId) : null;
                    if (destId !== null && !isNaN(destId)) mappedExits[dirKey] = {
                        target: `m_${destId}`,
                        gmcpDestId: destId,
                        closed: false
                    };
                }
            }

            // Resolve Terrain Name using utility
            let resolvedTerrain = 'Field';
            if (terrainVal !== undefined) {
                const tKey = String(terrainVal);
                resolvedTerrain = TERRAIN_MAP[tKey] || normalizeTerrain(tKey);
            }

            // Guess Zone from name if missing
            let resolvedZone = 'Imported Map';
            if (nameVal) {
                const nv = String(nameVal).toLowerCase();
                if (nv.includes('bree')) resolvedZone = 'Bree';
                else if (nv.includes('shire') || nv.includes('hobbit') || nv.includes('buckland')) resolvedZone = 'The Shire';
                else if (nv.includes('grey havens') || nv.includes('mithlond')) resolvedZone = 'Grey Havens';
                else if (nv.includes('rivendell') || nv.includes('imladris')) resolvedZone = 'Rivendell';
                else if (nv.includes('moria') || nv.includes('khazad')) resolvedZone = 'Moria';
                else if (nv.includes('lorien')) resolvedZone = 'Lothlorien';
                else if (nv.includes('fornost')) resolvedZone = 'Fornost';
                else if (nv.includes('tharbad')) resolvedZone = 'Tharbad';
                else if (nv.includes('fangorn')) resolvedZone = 'Fangorn';
                else if (nv.includes('rohan') || nv.includes('edoras')) resolvedZone = 'Rohan';
                else if (nv.includes('gondor')) resolvedZone = 'Gondor';
            }

            room = {
                id: roomId,
                gmcpId: Number(vnum),
                name: String(nameVal || `Room ${vnum}`),
                x, y, z,
                terrain: resolvedTerrain,
                exits: mappedExits,
                desc: (masterId && masterId !== vnum) ? `Alias of room ${masterId}` : '',
                zone: resolvedZone,
                notes: '',
                createdAt: Date.now()
            };
        }
    }

    if (!room) return null;

    const updateRoom = (patch: Partial<MapperRoom>) => {
        setRooms(prev => ({
            ...prev,
            [roomId]: { ...(prev[roomId] || room), ...patch }
        }));
    };

    return (
        <div
            ref={cardRef}
            style={{
                position: 'absolute', top: '48px', bottom: '16px', left: '8px', right: '16px',
                zIndex: 100, backgroundColor: '#18181b', padding: '16px', borderRadius: '12px',
                boxShadow: '0 4px 24px rgba(0,0,0,0.8)', border: '1px solid #27272a',
                display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '14px',
                overflowY: 'auto', pointerEvents: 'auto', color: '#e4e4e7', touchAction: 'pan-y'
            }}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, color: '#ffcc00', fontSize: '20px', fontWeight: 'bold' }}>Room Info</h3>
                <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#71717a', cursor: 'pointer' }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#a1a1aa' }}>
                <span>Client ID: <span style={{ color: '#e4e4e7', fontWeight: '500' }}>{roomId}</span></span>
                <span>GMCP ID: <span style={{ color: '#60a5fa' }}>{room.gmcpId || 'N/A'}</span></span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <input
                    type="text"
                    value={room.name || ''}
                    onChange={(e) => updateRoom({ name: e.target.value })}
                    style={{ backgroundColor: '#1c1c1f', border: '1px solid #3f3f46', padding: '10px 14px', borderRadius: '8px', color: 'white', fontWeight: 'bold', fontSize: '15px' }}
                    readOnly={mode !== 'edit'}
                    placeholder="Room Name"
                />
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{ backgroundColor: '#1c1c1f', border: '1px solid #27272a', padding: '8px 12px', borderRadius: '8px', flex: 1, fontSize: '12px', display: 'flex', alignItems: 'center' }}>
                    <span style={{ color: '#71717a', marginRight: '4px' }}>Zone: </span>
                    <input
                        type="text"
                        value={room.zone || ''}
                        onChange={(e) => updateRoom({ zone: e.target.value })}
                        style={{ backgroundColor: 'transparent', border: 'none', color: '#d4d4d8', width: '100%', outline: 'none', fontSize: '12px' }}
                        readOnly={mode !== 'edit'}
                        placeholder="Zone"
                    />
                </div>
                <div style={{ backgroundColor: '#1c1c1f', border: '1px solid #27272a', padding: '8px 12px', borderRadius: '8px', flex: 1, fontSize: '12px', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ color: '#71717a', marginRight: '4px' }}>Terrain: </span>
                    {mode === 'edit' ? (
                        <select
                            value={room.terrain || 'Field'}
                            onChange={(e) => updateRoom({ terrain: e.target.value })}
                            style={{ backgroundColor: 'transparent', border: 'none', color: '#10b981', fontWeight: 'bold', cursor: 'pointer', outline: 'none', fontSize: '12px' }}
                        >
                            {Array.from(new Set(Object.values(TERRAIN_MAP))).map(t => (
                                <option key={t} value={t} style={{ backgroundColor: '#181825', color: 'white' }}>{t}</option>
                            ))}
                        </select>
                    ) : (
                        <span style={{ color: '#10b981', fontWeight: 'bold' }}>{room.terrain || 'Field'}</span>
                    )}
                </div>
            </div>

            {room.desc && (
                <div style={{ fontSize: '13px', color: '#d1d5db', backgroundColor: '#141417', padding: '14px', borderRadius: '8px', border: '1px solid #27272a', lineHeight: '1.6' }}>
                    {room.desc}
                </div>
            )}

            <div style={{ height: '1px', backgroundColor: '#27272a', margin: '4px 0' }} />

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Exits</span>
                    {mode === 'edit' && <span style={{ fontSize: '9px', color: '#52525b' }}>Shift+Click to delete</span>}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                    {['n', 'u', 's', 'w', 'd', 'e'].map(d => {
                        const exit = room.exits[d];
                        const isActive = !!exit;
                        return (
                            <button
                                key={d}
                                onClick={(e) => {
                                    if (mode !== 'edit') return;
                                    setRooms(prev => {
                                        const r = prev[roomId];
                                        if (e.shiftKey && r.exits[d]) {
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
                                            nextRooms[roomId] = { ...r, exits: { ...r.exits, [d]: { target: tId, closed: false } } };
                                            if (dir.opp) {
                                                nextRooms[tId] = { ...nextRooms[tId], exits: { ...nextRooms[tId].exits, [dir.opp]: { target: roomId, closed: false } } };
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
                                }}
                                style={{
                                    backgroundColor: isActive ? (exit?.closed ? '#521313' : '#1e293b') : '#1c1c1f',
                                    color: isActive ? (exit?.closed ? '#f87171' : '#60a5fa') : '#3f3f46',
                                    border: '1px solid',
                                    borderColor: isActive ? (exit?.closed ? '#f87171' : '#3b82f6') : '#313244',
                                    padding: '8px 4px',
                                    borderRadius: '6px',
                                    fontSize: '11px',
                                    fontWeight: 'bold',
                                    cursor: 'pointer',
                                    textTransform: 'uppercase',
                                    transition: 'all 0.2s'
                                }}
                            >
                                {d}
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
