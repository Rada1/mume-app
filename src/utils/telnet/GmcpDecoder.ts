import { GameStats, WeatherType, GmcpCharVitals, GmcpRoomInfo, GmcpRoomPlayers, GmcpRoomItems, GmcpOccupant, GmcpExitInfo, GmcpUpdateExits, GmcpRoomNpcs, GmcpCharInfo } from '../../types';
import { isGmcpCharVitals, isGmcpRoomInfo, isGmcpRoomPlayers, isGmcpRoomItems, isGmcpExitInfoMap } from '../../utils/gmcpValidation';

export interface GmcpHandlers {
    setStats: React.Dispatch<React.SetStateAction<GameStats>>;
    setWeather: React.Dispatch<React.SetStateAction<WeatherType>>;
    setIsFoggy: React.Dispatch<React.SetStateAction<boolean>>;
    setInCombat: (inCombat: boolean, force?: boolean) => void;
    detectLighting: (light: string) => void;
    onOpponentChange?: (opponent: string | null) => void;
    onBufferChange?: (buffer: string | null) => void;
    onAddPlayer?: (data: string | GmcpOccupant) => void;
    onRemovePlayer?: (data: string | GmcpOccupant) => void;
    onRoomItems?: (data: GmcpRoomItems) => void;
    onRoomInfo?: (data: GmcpRoomInfo) => void;
    onRoomUpdateExits?: (data: GmcpUpdateExits) => void;
    onCharVitals?: (data: GmcpCharVitals) => void;
    onRoomPlayers?: (data: GmcpRoomPlayers) => void;
    onRoomNpcs?: (data: GmcpRoomNpcs) => void;
    onAddNpc?: (data: string | GmcpOccupant) => void;
    onRemoveNpc?: (data: string | GmcpOccupant) => void;
    onCharNameChange?: (name: string | null) => void;
    onCharInfo?: (data: GmcpCharInfo) => void;
    onPositionChange?: (position: string) => void;
    onComm?: (sender: string, chan: string, msg: string) => void;
    onGroupAdd?: (data: any) => void;
    onGroupUpdate?: (data: any) => void;
    onGroupRemove?: (data: any) => void;
    onGroupSet?: (data: any) => void;
    onMumeEdit?: (data: import('../../types').GmcpMumeEdit) => void;
    onRoomCharsCombat?: (data: any[]) => void;
    onCharRide?: (data: any) => void;
    onCorePing?: () => void;
    onDisconnect?: () => void;
}

export class GmcpDecoder {
    private charVitalsState: { position?: string, opponent?: string | null, buff?: string | null } = {};

    constructor(private handlers: GmcpHandlers) { }

    public decode(pkg: string, json: string) {
        const pkgLower = pkg.toLowerCase();
        const { handlers } = this;

        // --- GMCP Debug Logging ---
        console.log('[GMCP] Received:', pkg, json ? json.substring(0, 200) : '(no body)');

        if (pkgLower === 'char.vitals' || pkgLower === 'mume.client.vitals') {
            this.handleCharVitals(json);
        } else if (pkgLower === 'room.info' || pkgLower === 'external.room.info' || pkgLower === 'mume.client.room' || pkgLower.endsWith('.room.info')) {
            this.handleRoomInfo(json);
        } else if (pkgLower === 'room.updateexits' || pkgLower === 'mume.client.exits') {
            this.handleUpdateExits(json);
        } else if (pkgLower === 'room.players') {
            this.handleRoomPlayers(json);
        } else if (pkgLower === 'room.npcs' || pkgLower === 'room.chars' || pkgLower === 'room.char' || pkgLower === 'room.chars.set' || pkgLower === 'room.chars.list' || pkgLower === 'mume.client.chars') {
            this.handleRoomNpcs(json);
            this.handleRoomCharsCombat(json);
        } else if (pkgLower === 'room.addplayer') {
            this.handleSimpleJson(json, handlers.onAddPlayer);
        } else if (pkgLower === 'room.addnpc' || pkgLower === 'room.addchar' || pkgLower === 'room.chars.add' || pkgLower === 'room.char.add') {
            this.handleSimpleJson(json, handlers.onAddNpc);
        } else if (pkgLower === 'room.removeplayer') {
            this.handleSimpleJson(json, handlers.onRemovePlayer);
        } else if (pkgLower === 'room.removenpc' || pkgLower === 'room.removechar' || pkgLower === 'room.chars.remove' || pkgLower === 'room.char.remove') {
            this.handleSimpleJson(json, handlers.onRemoveNpc);
        } else if (pkgLower.startsWith('room.items') || pkgLower.startsWith('room.objects') || pkgLower === 'char.items' || pkgLower === 'char.inv' || pkgLower === 'room.items.list' || pkgLower === 'char.items.list' || pkgLower === 'room.items.set' || pkgLower === 'mume.client.inventory' || pkgLower === 'mume.client.equipment' || pkgLower === 'mume.client.roomitems') {
            this.handleRoomItems(json);
        } else if (pkgLower === 'char.name') {
            this.handleCharName(json);
        } else if (pkgLower === 'char.status' || pkgLower === 'char.info' || pkgLower === 'char.statusvars') {
            this.handleCharStatus(json);
            if (pkgLower === 'char.info' || pkgLower === 'char.statusvars') this.handleCharInfo(json);
        } else if (pkgLower === 'group' || pkgLower === 'group.add') {
            // MUME sends 'Group' with either an array (full list) or single object (one member)
            this.handleGroupPacket(pkgLower, json);
            this.handleGroup(json);
        } else if (pkgLower === 'group.update') {
            console.log('[GMCP Group.Update RAW]', json);
            this.handleSimpleJson(json, handlers.onGroupUpdate);
            this.handleGroup(json);
        } else if (pkgLower === 'group.remove') {
            console.log('[GMCP Group.Remove RAW]', json);
            this.handleSimpleJson(json, handlers.onGroupRemove);
        } else if (pkgLower === 'group.set') {
            console.log('[GMCP Group.Set RAW]', json);
            this.handleSimpleJson(json, handlers.onGroupSet);
            this.handleGroup(json);
        } else if (pkgLower.startsWith('group.')) {
            this.handleGroup(json);
        } else if (pkgLower === 'comm.channel') {
            this.handleCommChannel(json);
        } else if (pkgLower === 'mume.client.edit') {
            this.handleSimpleJson(json, handlers.onMumeEdit);
        } else if (pkgLower === 'char.ride') {
            this.handleSimpleJson(json, handlers.onCharRide);
        } else if (pkgLower === 'core.ping') {
            this.handlers.onCorePing?.();
        }
    }

    private handleCommChannel(json: string) {
        console.log('[GMCP] Received comm.channel:', json);
        try {
            const data = JSON.parse(json);
            // Expected MUME format: { "chan": "tell", "msg": "hello", "player": "Someone" }
            const chan = data.chan || data.channel;
            const msg = data.msg || data.message;
            const player = data.player || data.sender;

            console.log('[GMCP] Parsed comm:', { chan, msg, player });

            if (chan && player && this.handlers.onComm) {
                this.handlers.onComm(player, chan, msg || "");
            }
        } catch (e) {
            console.error('[GMCP] Parse error in Comm.Channel:', e, json);
        }
    }

    /**
     * Routes Group / Group.Add packets correctly.
     * MUME sends bare 'Group' with the FULL member array — not individual adds.
     * If the payload is an array, treat it as a set (full player list).
     * If it's a single object, treat it as an add.
     */
    private handleGroupPacket(pkgLower: string, json: string) {
        try {
            const data = JSON.parse(json);
            console.log('[GMCP Group RAW]', pkgLower, JSON.stringify(data));

            if (Array.isArray(data)) {
                // Full group list — route to onGroupSet
                if (this.handlers.onGroupSet) {
                    console.log('[GMCP Group] Routing array as GroupSet, members:', data.length, 'fields:', data[0] ? Object.keys(data[0]) : []);
                    this.handlers.onGroupSet(data);
                }
            } else if (data && typeof data === 'object') {
                if (Array.isArray(data.members)) {
                    // Wrapped { members: [...] } format
                    console.log('[GMCP Group] Routing wrapped members array as GroupSet');
                    if (this.handlers.onGroupSet) this.handlers.onGroupSet(data.members);
                } else {
                    // Single member object — add/update
                    console.log('[GMCP Group] Routing object as GroupAdd, fields:', Object.keys(data));
                    if (pkgLower === 'group.add') {
                        if (this.handlers.onGroupAdd) this.handlers.onGroupAdd(data);
                    } else {
                        // Bare 'Group' with a single object — treat as set with one member
                        if (this.handlers.onGroupSet) this.handlers.onGroupSet([data]);
                    }
                }
            }
        } catch (e) {
            console.error('[GMCP] Parse error in handleGroupPacket:', e, json);
        }
    }

    private handleGroup(json: string) {
        try {
            const data = JSON.parse(json);
            
            // Extract members array if available
            let members = [];
            if (Array.isArray(data)) {
                members = data;
            } else if (data && typeof data === 'object') {
                if (Array.isArray(data.members)) {
                    members = data.members;
                } else {
                    members = [data]; // Maybe a single update object
                }
            }

            // MUME 'name' for self is often the character name or "You".
            const playerNames = ['you', 'yourself', 'self'];
            // We don't have the player's name here directly but if "You" is used, or we just look for any matching conditions
            const playerMember = members.find(m => {
                if (!m || typeof m !== 'object') return false;
                if (!m.name) return true; // If no name, might be self update
                return playerNames.includes(m.name.toLowerCase());
            }) || members[0]; // Fallback to first if only one

            if (playerMember && typeof playerMember === 'object') {
                const conditionsToTrack = ['bashed', 'waiting', 'poison', 'slept', 'wound', 'snared', 'hungry', 'thirsty', 'sanctuary'];
                const conditions: Record<string, boolean> = {};
                let foundAny = false;

                for (const cond of conditionsToTrack) {
                    if (cond in playerMember) {
                        conditions[cond] = !!playerMember[cond];
                        foundAny = true;
                    }
                }

                if (foundAny) {
                    this.handlers.setStats((prev: GameStats) => ({
                        ...prev,
                        conditions: { ...prev.conditions, ...conditions }
                    }));
                }
            }
        } catch (e) {
            console.error('[GMCP] Parse error in Group:', e, json);
        }
    }

    private handleCharVitals(json: string) {
        try {
            const data = JSON.parse(json);
            if (isGmcpCharVitals(data)) {
                if (this.handlers.onCharVitals) this.handlers.onCharVitals(data);
                this.updateStatsFromVitals(data);
            }
        } catch (e) { console.error('[GMCP] Parse error in Char.Vitals:', e, json); }
    }

    private updateStatsFromVitals(data: any) {
        const getField = (keys: string[]) => {
            for (const k of keys) {
                const found = Object.keys(data).find(dk => dk.toLowerCase() === k.toLowerCase());
                if (found !== undefined) return data[found];
            }
            return undefined;
        };

        this.handlers.setStats((prev: GameStats) => {
            const next = { ...prev };
            const hp = getField(['hp', 'hits', 'health', 'h']); if (hp !== undefined) next.hp = Number(hp);
            const maxhp = getField(['maxhp', 'maxhits', 'maxhealth', 'H']); if (maxhp !== undefined) next.maxHp = Number(maxhp);
            const mana = getField(['mana', 'sp', 'spirit', 's', 'm']); if (mana !== undefined) next.mana = Number(mana);
            const maxmana = getField(['maxmana', 'maxsp', 'maxspirit', 'S', 'M']); if (maxmana !== undefined) next.maxMana = Number(maxmana);
            const move = getField(['move', 'mv', 'mp', 'moves', 'stamina', 'st', 'v']); if (move !== undefined) next.move = Number(move);
            const maxmove = getField(['maxmove', 'maxmv', 'maxmp', 'maxmoves', 'maxstamina', 'maxst', 'V']); if (maxmove !== undefined) next.maxMove = Number(maxmove);
            const wimpy = getField(['wimpy', 'W']); if (wimpy !== undefined) next.wimpy = Number(wimpy);
            const moveStatus = getField(['move_status', 'stamina_status', 'st_status']); if (moveStatus !== undefined) next.staminaStatus = String(moveStatus);
            return next;
        });

        const pos = getField(['position', 'pos', 'p']);
        if (pos !== undefined) {
            const p = pos.toLowerCase();
            this.charVitalsState.position = p;
            if (this.handlers.onPositionChange) this.handlers.onPositionChange(p);

            // Sync waiting condition with position
            this.handlers.setStats((prev: GameStats) => ({
                ...prev,
                conditions: { 
                    ...prev.conditions, 
                    waiting: p === 'waiting' || p.includes('waiting')
                }
            }));
        }

        const opp = getField(['opponent', 'opp', 'o']);
        if (opp !== undefined) {
            this.charVitalsState.opponent = opp === "" ? null : opp;
            if (this.handlers.onOpponentChange) this.handlers.onOpponentChange(this.charVitalsState.opponent);
        }

        const buff = getField(['buff', 'b']);
        if (buff !== undefined) {
            this.charVitalsState.buff = buff === "" ? null : buff;
            if (this.handlers.onBufferChange) this.handlers.onBufferChange(this.charVitalsState.buff);
        }

        if (this.handlers.onCharVitals) {
            this.handlers.onCharVitals(data);
        }

        // Only act on combat state if this update explicitly included position or opponent data.
        // If neither field was present, we don't know current combat state from this update alone —
        // let the prompt parser's latch handle the eventual disengage rather than keeping combat
        // active via stale cached values.
        const posUpdated = getField(['position', 'pos', 'p']) !== undefined;
        const oppUpdated = getField(['opponent', 'opp', 'o']) !== undefined;
        if (posUpdated || oppUpdated) {
            const isFighting = this.charVitalsState.position?.includes('fighting') ||
                (this.charVitalsState.opponent !== null && this.charVitalsState.opponent !== undefined);
            if (isFighting) {
                this.handlers.setInCombat(true);
            } else {
                (this.handlers as any).setInCombat(false);
            }
        }

        const weatherVal = getField(['weather', 'w']);
        if (weatherVal !== undefined) {
            const w = String(weatherVal);
            if (w === '~') this.handlers.setWeather('cloud');
            else if (w === "'" || w === '"') this.handlers.setWeather('rain');
            else if (w === '*') this.handlers.setWeather('heavy-rain');
            else if (w === ' ' || w === null || w === '') this.handlers.setWeather((prev: WeatherType) => ['cloud', 'rain', 'heavy-rain', 'snow'].includes(prev) ? 'none' : prev);
        }

        const fogVal = getField(['fog', 'f']); if (fogVal !== undefined) this.handlers.setIsFoggy(fogVal === '-' || fogVal === '=');

        const lightVal = getField(['light', 'l']);
        if (lightVal !== undefined) {
            this.handlers.detectLighting(String(lightVal));
        }

        // Pass xp/tp to charInfo if present in vitals (MUME style)
        const xp = getField(['xp']);
        const tp = getField(['tp']);
        if ((xp !== undefined || tp !== undefined) && this.handlers.onCharInfo) {
            this.handlers.onCharInfo({ 
                xp: xp !== undefined ? Number(xp) : undefined, 
                tp: tp !== undefined ? Number(tp) : undefined 
            });
        }
    }

    private handleRoomInfo(json: string) {
        try {
            const data = JSON.parse(json);
            console.log('[GMCP] Room.Info parsed:', data);
            if (isGmcpRoomInfo(data)) {
                if (this.handlers.onRoomInfo) this.handlers.onRoomInfo(data);
                
                // Track lighting from room info
                const light = data.light !== undefined ? data.light : (data.l !== undefined ? data.l : undefined);
                if (light !== undefined && light !== null) {
                    this.handlers.detectLighting(String(light));
                }
            } else {
                console.warn('[GMCP] Room.Info rejected by validator:', data);
            }
        } catch (e) { console.error('[GMCP] Parse error in Room.Info:', e, json); }
    }

    private handleUpdateExits(json: string) {
        try {
            const data = JSON.parse(json);
            if (this.handlers.onRoomUpdateExits) {
                if (data.exits) this.handlers.onRoomUpdateExits(data as GmcpUpdateExits);
                else this.handlers.onRoomUpdateExits({ exits: data });
            }
        } catch (e) { console.error('[GMCP] Parse error in Room.UpdateExits:', e, json); }
    }

    private handleRoomPlayers(json: string) {
        try {
            const data = JSON.parse(json);
            if (isGmcpRoomPlayers(data) && this.handlers.onRoomPlayers) this.handlers.onRoomPlayers(data);
        } catch (e) { console.error('[GMCP] Parse error in Room.Players:', e, json); }
    }

    private handleRoomNpcs(json: string) {
        try {
            const data = JSON.parse(json);
            if (isGmcpRoomPlayers(data) && this.handlers.onRoomNpcs) this.handlers.onRoomNpcs(data);
        } catch (e) { console.error('[GMCP] Parse error in Room.Chars:', e, json); }
    }

    private handleRoomCharsCombat(json: string) {
        try {
            const data = JSON.parse(json);
            if (!Array.isArray(data)) return;

            // Pass char data to the combat handler so opponent/buffer health can be updated from Room.Chars
            if (this.handlers.onRoomCharsCombat) this.handlers.onRoomCharsCombat(data);

            // We should rely primarily on our own Char.Vitals for combat state, not just ANY room activity.
            // Room.Chars will list other players/NPCs fighting, which shouldn't force US into combat UI
            // unless we actually have an opponent or our position is 'fighting'.
            // Therefore, we do not set combat = true based purely on Room.Chars anymore,
            // as it leads to "stuck" combat mode.

            // However, we can use it to double-check if we are in combat if our opponent is in the list.
            const weAreFighting = this.charVitalsState.position?.includes('fighting') || (this.charVitalsState.opponent !== null && this.charVitalsState.opponent !== undefined);
            if (!weAreFighting) {
                const isExplicitlyNotFighting = this.charVitalsState.position && !this.charVitalsState.position.includes('fighting');
                if (isExplicitlyNotFighting) {
                    (this.handlers as any).setInCombat(false, true); // Force clear the latch
                } else {
                    this.handlers.setInCombat(false); // Normal clear
                }
            }
        } catch (e) { }
    }

    private handleRoomItems(json: string) {
        try {
            const data = JSON.parse(json);
            if (isGmcpRoomItems(data) && this.handlers.onRoomItems) this.handlers.onRoomItems(data);
        } catch (e) { console.error('[GMCP] Parse error in Room.Items:', e, json); }
    }

    private handleSimpleJson(json: string, handler?: (data: any) => void) {
        try {
            const data = JSON.parse(json);
            if (handler) handler(data);
        } catch (e) { }
    }

    private handleCharName(json: string) {
        try {
            let name = json.trim();
            if (name.startsWith('"') && name.endsWith('"')) name = name.substring(1, name.length - 1);
            else if (name.startsWith('{')) {
                try { const parsed = JSON.parse(name); name = parsed.name || parsed.fullname || name; } catch (e) { }
            }
            name = name.replace(/\x1b\[[0-9;]*m/g, '').trim();
            if (name && this.handlers.onCharNameChange) this.handlers.onCharNameChange(name);
        } catch (e) { }
    }

    private handleCharStatus(json: string) {
        try {
            const data = JSON.parse(json);
            if (isGmcpCharVitals(data)) {
                this.updateStatsFromVitals(data);
                if (this.handlers.onCharVitals) this.handlers.onCharVitals(data);
            }
        } catch (e) { }
    }

    private handleCharInfo(json: string) {
        try {
            const data = JSON.parse(json);
            if (this.handlers.onCharInfo) this.handlers.onCharInfo(data);
        } catch (e) { }
    }
}
