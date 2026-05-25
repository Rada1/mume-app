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
    preloadedCoordsRef?: React.MutableRefObject<Record<string, any[]>>;
    setViewZ?: (z: number | null) => void;
    isDarkMode: boolean;
}

export const RoomInfoCard: React.FC<RoomInfoCardProps> = ({
    roomId, rooms, setRooms, mode, onClose, cardRef, preloadedCoordsRef, setViewZ, isDarkMode
}) => {
    let room = rooms[roomId];

    React.useEffect(() => {
        if (room && setViewZ) {
            setViewZ(room.z || 0);
        }
    }, [roomId, room?.z, setViewZ]);

    // Data resolution: Use live room state if available, but always supplement/fallback to preloaded Arda map data
    const vnum = roomId.startsWith('m_') ? roomId.substring(2) : roomId;
    const masterData = preloadedCoordsRef?.current?.[vnum];
    
    if (masterData) {
        // Arda Map format: [x, y, z, terrainVal, exits, name, masterId, mobFlags, loadFlags, area, light, sundeath, align, portable, ridable, note, contents, description]
        const [mx, my, mz, mTVal, mExits, mName, mMasterId, mMobF, mLoadF, mArea, mLight, mSundeath, mAlign, mPortable, mRidable, mNote, mContents, mDescription] = masterData;

        if (!room) {
            // Derive a "Virtual Master Room" for rooms in the Arda map that aren't in live state
            const mappedExits: Record<string, import('./mapperTypes').MapperExit> = {};
            if (mExits) {
                for (const d in (mExits as any)) {
                    let dirKey = d.toLowerCase();
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

                    const dest = (mExits as any)[d];
                    const rawDestId = typeof dest === 'number' ? dest : (typeof dest === 'object' ? (dest as any).id || (dest as any).target : (typeof dest === 'string' ? dest : null));
                    const destId = rawDestId !== null ? Number(rawDestId) : null;

                    if (destId !== null && !isNaN(destId)) {
                        mappedExits[dirKey] = {
                            target: `m_${destId}`,
                            gmcpDestId: destId,
                            closed: false,
                            hasDoor: typeof dest === 'object' ? !!(dest as any).hasDoor : false,
                            doorName: typeof dest === 'object' ? (dest as any).doorName : undefined,
                            flags: typeof dest === 'object' ? (dest as any).flags : []
                        };
                    }
                }
            }

            let resolvedTerrain = 'Field';
            if (mTVal !== undefined) {
                const tKey = String(mTVal);
                resolvedTerrain = TERRAIN_MAP[tKey] || normalizeTerrain(tKey);
            }

            let resolvedZone = mArea || 'Imported Map';
            if (!mArea && mName) {
                const nv = String(mName).toLowerCase();
                if (nv.includes('bree')) resolvedZone = 'Bree';
                else if (nv.includes('shire') || nv.includes('hobbit') || nv.includes('buckland')) resolvedZone = 'The Shire';
                else if (nv.includes('moria')) resolvedZone = 'Moria';
            }

            room = {
                id: roomId,
                gmcpId: Number(vnum),
                name: String(mName || `Room ${vnum}`),
                x: mx, y: my, z: mz,
                terrain: resolvedTerrain,
                exits: mappedExits,
                desc: mDescription || '',
                zone: resolvedZone,
                notes: mNote || '',
                contents: mContents || '',
                mobFlags: mMobF || [],
                loadFlags: mLoadF || [],
                light: mLight,
                sundeath: mSundeath,
                align: mAlign,
                portable: mPortable,
                ridable: mRidable,
                createdAt: Date.now()
            };
        } else {
            // MERGE Logic: Supplement the live room with rich "Geographical" data (Arda Map)
            const clonedRoom = { ...room };
            let hasChanged = false;

            // Fallback terrain if live is generic or missing
            if (!clonedRoom.terrain || clonedRoom.terrain === 'Field') {
                const tKey = String(mTVal);
                clonedRoom.terrain = TERRAIN_MAP[tKey] || normalizeTerrain(tKey);
                hasChanged = true;
            }

            // Sync Mob/Load flags (merge sets to avoid duplicates)
            if (mMobF && mMobF.length > 0) {
                const merged = Array.from(new Set([...(clonedRoom.mobFlags || []), ...mMobF]));
                if (merged.length !== (clonedRoom.mobFlags?.length || 0)) {
                    clonedRoom.mobFlags = merged;
                    hasChanged = true;
                }
            }
            if (mLoadF && mLoadF.length > 0) {
                const merged = Array.from(new Set([...(clonedRoom.loadFlags || []), ...mLoadF]));
                if (merged.length !== (clonedRoom.loadFlags?.length || 0)) {
                    clonedRoom.loadFlags = merged;
                    hasChanged = true;
                }
            }

            // Fallback shading flags
            if (clonedRoom.light === undefined && mLight !== undefined) { clonedRoom.light = mLight; hasChanged = true; }
            if (clonedRoom.sundeath === undefined && mSundeath !== undefined) { clonedRoom.sundeath = mSundeath; hasChanged = true; }

            // Ensure DARK/NO_SUNDEATH are in mobFlags for UI badge consistency
            if (clonedRoom.light !== undefined && Number(clonedRoom.light) === 1) {
                if (!clonedRoom.mobFlags) clonedRoom.mobFlags = ['DARK'];
                else if (!clonedRoom.mobFlags.includes('DARK')) { clonedRoom.mobFlags = [...clonedRoom.mobFlags, 'DARK']; hasChanged = true; }
            }
            if (clonedRoom.sundeath !== undefined && Number(clonedRoom.sundeath) === 0) {
                if (!clonedRoom.mobFlags) clonedRoom.mobFlags = ['NO_SUNDEATH'];
                else if (!clonedRoom.mobFlags.includes('NO_SUNDEATH')) { clonedRoom.mobFlags = [...clonedRoom.mobFlags, 'NO_SUNDEATH']; hasChanged = true; }
            }

            // Sync new geographic flags
            if (!clonedRoom.align && mAlign) { clonedRoom.align = mAlign; hasChanged = true; }
            if (clonedRoom.portable === undefined && mPortable !== undefined) { clonedRoom.portable = mPortable; hasChanged = true; }
            if (clonedRoom.ridable === undefined && mRidable !== undefined) { clonedRoom.ridable = mRidable; hasChanged = true; }
            if ((!clonedRoom.notes || clonedRoom.notes === '') && mNote) { clonedRoom.notes = mNote; hasChanged = true; }
            if ((!clonedRoom.contents || clonedRoom.contents === '') && mContents) { clonedRoom.contents = mContents; hasChanged = true; }
            if ((!clonedRoom.desc || clonedRoom.desc.startsWith('Alias of room')) && mDescription) { clonedRoom.desc = mDescription; hasChanged = true; }

            if (hasChanged) room = clonedRoom;
        }
    }

    if (!room) return null;

    const updateRoom = (patch: Partial<MapperRoom>) => {
        setRooms(prev => ({
            ...prev,
            [roomId]: { ...(prev[roomId] || room), ...patch }
        }));
    };

    const getNoteBadges = () => {
        if (!room.notes) return [];
        const badges: { text: string; color: string; bg: string }[] = [];
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

    const getAdditionalFlags = () => {
        const flags: React.JSX.Element[] = [];
        
        if (room.align) {
            let color = '#cad3f5';
            let bg = 'rgba(202, 211, 245, 0.1)';
            if (room.align.toLowerCase() === 'good') { color = '#89b4fa'; bg = 'rgba(137, 180, 250, 0.15)'; }
            else if (room.align.toLowerCase() === 'evil') { color = '#f38ba8'; bg = 'rgba(243, 139, 168, 0.15)'; }
            
            flags.push(
                <span key="align" style={{ color, backgroundColor: bg, padding: '4px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: 'bold', border: `1px solid ${color}33`, textTransform: 'uppercase' }}>
                    Align: {room.align}
                </span>
            );
        }

        if (room.portable !== undefined) {
            const isPort = String(room.portable) === 'true';
            const color = isPort ? '#a6e3a1' : '#f38ba8';
            const bg = isPort ? 'rgba(166, 227, 161, 0.1)' : 'rgba(243, 139, 168, 0.1)';
            flags.push(
                <span key="portable" style={{ color, backgroundColor: bg, padding: '4px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: 'bold', border: `1px solid ${color}33`, textTransform: 'uppercase' }}>
                    {isPort ? 'PORTABLE' : 'NO_PORT'}
                </span>
            );
        }

        if (room.ridable !== undefined) {
            const isRide = String(room.ridable) === 'true';
            const color = isRide ? '#a6e3a1' : '#ee99a0';
            const bg = isRide ? 'rgba(166, 227, 161, 0.1)' : 'rgba(238, 153, 160, 0.1)';
            flags.push(
                <span key="ridable" style={{ color, backgroundColor: bg, padding: '4px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: 'bold', border: `1px solid ${color}33`, textTransform: 'uppercase' }}>
                    {isRide ? 'RIDABLE' : 'NO_RIDE'}
                </span>
            );
        }

        return flags;
    };

    const noteBadges = getNoteBadges();
    const hasNoteHerb = noteBadges.some(b => b.text.includes('Herb'));
    const staticContents = room.contents || '';

    return (
        <div
            ref={cardRef}
            style={{
                position: 'absolute', 
                top: '80px', bottom: '48px', left: '48px', right: '48px',
                zIndex: 100, 
                backgroundColor: isDarkMode ? 'rgba(24, 24, 27, 0.4)' : 'rgba(245, 245, 247, 0.6)', 
                padding: '8px 12px', 
                borderRadius: '12px',
                boxShadow: '0 4px 24px rgba(0,0,0,0.8)', 
                border: isDarkMode ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.1)',
                backdropFilter: 'blur(25px)', WebkitBackdropFilter: 'blur(25px)',
                display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px',
                overflowY: 'auto', pointerEvents: 'auto', color: isDarkMode ? '#e4e4e7' : '#1d1d1f', touchAction: 'pan-y'
            }}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <h3 style={{ margin: 0, color: '#ffcc00', fontSize: '18px', fontWeight: 'bold' }}>Room Info</h3>
                <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#71717a', cursor: 'pointer' }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#a1a1aa' }}>
                <span>Client ID: <span style={{ color: '#e4e4e7', fontWeight: '500' }}>{roomId}</span></span>
                <span>GMCP ID: <span style={{ color: '#60a5fa' }}>{room.gmcpId || 'N/A'}</span></span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <input
                    type="text"
                    value={room.name || ''}
                    onChange={(e) => updateRoom({ name: e.target.value })}
                    style={{ backgroundColor: isDarkMode ? '#1c1c1f' : '#ffffff', border: isDarkMode ? '1px solid #3f3f46' : '1px solid #d1d1d6', padding: '10px 14px', borderRadius: '8px', color: isDarkMode ? 'white' : '#1d1d1f', fontWeight: 'bold', fontSize: '15px' }}
                    readOnly={mode !== 'edit'}
                    placeholder="Room Name"
                />
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{ backgroundColor: isDarkMode ? '#1c1c1f' : '#ffffff', border: isDarkMode ? '1px solid #27272a' : '1px solid #d1d1d6', padding: '8px 12px', borderRadius: '8px', flex: 1, fontSize: '12px', display: 'flex', alignItems: 'center' }}>
                    <span style={{ color: isDarkMode ? '#71717a' : '#8e8e93', marginRight: '4px' }}>Zone: </span>
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

            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', backgroundColor: isDarkMode ? '#1c1c1f' : '#ffffff', border: isDarkMode ? '1px solid #27272a' : '1px solid #d1d1d6', padding: '8px 12px', borderRadius: '8px', fontSize: '12px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', userSelect: 'none', width: '100%' }}>
                    <input
                        type="checkbox"
                        checked={!!room.isPermanentSnow}
                        onChange={(e) => updateRoom({ isPermanentSnow: e.target.checked })}
                        disabled={mode !== 'edit'}
                        style={{ cursor: mode === 'edit' ? 'pointer' : 'default', width: '16px', height: '16px' }}
                    />
                    <span style={{ fontWeight: 'bold', color: room.isPermanentSnow ? '#60a5fa' : (isDarkMode ? '#a1a1aa' : '#71717a') }}>
                        Permanent Snow Cover
                    </span>
                </label>
            </div>

            {room.desc && (
                <div style={{ fontSize: '13px', color: isDarkMode ? '#d1d5db' : '#3a3a3c', backgroundColor: isDarkMode ? '#141417' : '#ffffff', padding: '14px', borderRadius: '8px', border: isDarkMode ? '1px solid #27272a' : '1px solid #d1d1d6', lineHeight: '1.6' }}>
                    {room.desc}
                </div>
            )}

            {staticContents && (
                <div style={{
                    fontSize: '12px',
                    color: isDarkMode ? '#dff6ff' : '#164e63',
                    backgroundColor: isDarkMode ? 'rgba(116, 199, 236, 0.08)' : 'rgba(8, 145, 178, 0.08)',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: isDarkMode ? '1px solid rgba(116, 199, 236, 0.22)' : '1px solid rgba(8, 145, 178, 0.22)',
                    lineHeight: '1.4',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    marginTop: '4px'
                }}>
                    <span style={{ fontWeight: '800', textTransform: 'uppercase', fontSize: '9px', color: '#74c7ec', letterSpacing: '0.05em' }}>Static Room Contents</span>
                    <div style={{ whiteSpace: 'pre-wrap' }}>{staticContents}</div>
                </div>
            )}

            {(room.mobFlags?.length || room.loadFlags?.length || room.roomQuestFlags?.length || room.align || room.portable !== undefined || room.ridable !== undefined || room.notes) ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {room.mobFlags?.map(f => {
                        const isAgg = f.includes('AGGRESSIVE');
                        const isShop = f.includes('SHOP');
                        const isGuild = f.includes('GUILD');
                        const isDark = f === 'DARK';
                        const isNoSun = f === 'NO_SUNDEATH';
                        
                        let color = '#94e2d5'; // DEFAULT TEAL
                        let bg = 'rgba(148, 226, 213, 0.1)';
                        if (isAgg) { color = '#f38ba8'; bg = 'rgba(243, 139, 168, 0.15)'; }
                        else if (isShop) { color = '#f9e2af'; bg = 'rgba(249, 226, 175, 0.15)'; }
                        else if (isGuild) { color = '#cba6f7'; bg = 'rgba(203, 166, 247, 0.15)'; }
                        else if (isDark) { color = '#cad3f5'; bg = 'rgba(202, 211, 245, 0.15)'; }
                        else if (isNoSun) { color = '#ee99a0'; bg = 'rgba(238, 153, 160, 0.15)'; }

                        return (
                            <span key={f} style={{ color, backgroundColor: bg, padding: '4px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: 'bold', border: `1px solid ${color}33`, textTransform: 'uppercase' }}>
                                {f.replace('BIN_MOB_', '')}
                            </span>
                        );
                    })}
                    {room.loadFlags?.map(f => {
                        const flag = f.toUpperCase();
                        const isHerb = flag.includes('HERB');
                        if (isHerb && hasNoteHerb) return null;
                        const isWater = flag.includes('WATER') || flag.includes('POND') || flag.includes('WELL') || flag.includes('FOUNTAIN');
                        const isFood = /FOOD|BERRY|VEGETABLE/i.test(flag);
                        const isHorse = /HORSE|STALLION|DONKEY/i.test(flag);
                        const isBoat = /BOAT/i.test(flag);
                        const isStable = /STABLE/i.test(flag);
                        const isDT = /DT|DEATHTRAP/i.test(flag);
                        const isFerry = /FERRY/i.test(flag);
                        const isCoach = /COACH/i.test(flag);

                        let color = '#94e2d5'; // DEFAULT TEAL
                        let bg = 'rgba(148, 226, 213, 0.1)';
                        if (isHerb) { color = '#a6e3a1'; bg = 'rgba(166, 227, 161, 0.15)'; }
                        else if (isWater) { color = '#89b4fa'; bg = 'rgba(137, 180, 250, 0.15)'; }
                        else if (isFood) { color = '#f9e2af'; bg = 'rgba(249, 226, 175, 0.15)'; }
                        else if (isHorse) { color = '#cba6f7'; bg = 'rgba(203, 166, 247, 0.15)'; }
                        else if (isBoat) { color = '#94e2d5'; bg = 'rgba(148, 226, 213, 0.15)'; }
                        else if (isStable) { color = '#fab387'; bg = 'rgba(250, 179, 135, 0.15)'; }
                        else if (isDT) { color = '#f38ba8'; bg = 'rgba(243, 139, 168, 0.15)'; }
                        else if (isFerry) { color = '#74c7ec'; bg = 'rgba(116, 199, 236, 0.15)'; }
                        else if (isCoach) { color = '#b4befe'; bg = 'rgba(180, 190, 254, 0.15)'; }

                        return (
                            <span key={f} style={{ color, backgroundColor: bg, padding: '4px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: 'bold', border: `1px solid ${color}33`, textTransform: 'uppercase' }}>
                                {f.replace('BIN_LOAD_', '')}
                            </span>
                        );
                    })}
                    {room.roomQuestFlags?.map(f => (
                        <span key={f} style={{ color: '#00c0ff', backgroundColor: 'rgba(0, 192, 255, 0.15)', padding: '4px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: 'bold', border: '1px solid #00c0ff33', textTransform: 'uppercase' }}>
                            {f}
                        </span>
                    ))}
                    {getAdditionalFlags()}
                    {noteBadges.map((badge, idx) => (
                        <span key={`note-badge-${idx}`} style={{ color: badge.color, backgroundColor: badge.bg, padding: '4px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: 'bold', border: `1px solid ${badge.color}33`, textTransform: 'uppercase' }}>
                            {badge.text}
                        </span>
                    ))}
                </div>
            ) : null}

            {room.notes && (
                <div style={{
                    fontSize: '12px',
                    color: isDarkMode ? '#e4e4e7' : '#27272a',
                    backgroundColor: isDarkMode ? 'rgba(249, 226, 175, 0.05)' : 'rgba(217, 119, 6, 0.05)',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: isDarkMode ? '1px solid rgba(249, 226, 175, 0.2)' : '1px solid rgba(217, 119, 6, 0.2)',
                    lineHeight: '1.4',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    marginTop: '4px'
                }}>
                    <span style={{ fontWeight: '800', textTransform: 'uppercase', fontSize: '9px', color: '#f9e2af', letterSpacing: '0.05em' }}>Notes</span>
                    <div style={{ whiteSpace: 'pre-wrap' }}>{room.notes}</div>
                </div>
            )}

            <div style={{ height: '1px', backgroundColor: '#27272a', margin: '4px 0' }} />

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '800' }}>Exits & Diagnostics</span>
                    {mode === 'edit' && <span style={{ fontSize: '9px', color: '#52525b' }}>Shift+Click to delete</span>}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                    {['n', 'u', 's', 'w', 'd', 'e'].map(d => {
                        const exit = room.exits[d];
                        const isActive = !!exit;
                        if (!isActive && mode !== 'edit') return null;

                        return (
                            <div key={d} style={{ display: 'flex', flexDirection: 'column', gap: '4px', backgroundColor: isDarkMode ? '#1c1c1f' : '#ffffff', padding: '8px', borderRadius: '8px', border: isDarkMode ? '1px solid #27272a' : '1px solid #d1d1d6' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '12px', fontWeight: 'bold', color: isActive ? '#60a5fa' : (isDarkMode ? '#3f3f46' : '#8e8e93') }}>{d.toUpperCase()}</span>
                                    {isActive && (
                                        <span style={{ fontSize: '9px', fontWeight: 'bold', color: exit.hasDoor ? '#fab387' : '#52525b' }}>
                                            {exit.doorName || `DOOR: ${exit.hasDoor ? 'YES' : 'NO'}`}
                                        </span>
                                    )}
                                </div>
                                <button
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
                                    }}
                                    style={{
                                        width: '100%',
                                        backgroundColor: isActive ? (exit?.closed ? (isDarkMode ? '#521313' : '#fee2e2') : (isDarkMode ? '#27272a' : '#f2f2f7')) : 'transparent',
                                        color: isActive ? (exit?.closed ? (isDarkMode ? '#f87171' : '#ef4444') : (isDarkMode ? '#e4e4e7' : '#1d1d1f')) : (isDarkMode ? '#3f3f46' : '#8e8e93'),
                                        border: '1px solid',
                                        borderColor: isActive ? (exit?.closed ? (isDarkMode ? '#f87171' : '#ef4444') : (isDarkMode ? '#3f3f46' : '#d1d1d6')) : (isDarkMode ? '#313244' : '#e5e5ea'),
                                        padding: '6px 4px',
                                        borderRadius: '6px',
                                        fontSize: '10px',
                                        fontWeight: '500',
                                        cursor: mode === 'edit' ? 'pointer' : 'default',
                                        transition: 'all 0.2s',
                                        opacity: isActive ? 1 : 0.4
                                    }}
                                >
                                    {isActive ? (exit.target.startsWith('m_') ? `#${exit.target.substring(2)}` : 'Local') : 'NO EXIT'}
                                </button>
                                {isActive && (
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px', marginTop: '4px' }}>
                                        {exit.flags && exit.flags.length > 0 ? (
                                            exit.flags.map(f => (
                                                <span key={f} style={{ fontSize: '8px', color: '#a6e3a1', backgroundColor: isDarkMode ? 'rgba(166, 227, 161, 0.1)' : 'rgba(52, 199, 89, 0.1)', padding: '2px 4px', borderRadius: '4px', border: '1px solid rgba(166, 227, 161, 0.2)' }}>
                                                    {f}
                                                </span>
                                            ))
                                        ) : (
                                            <span style={{ fontSize: '8px', color: '#52525b', fontStyle: 'italic' }}>no flags</span>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
