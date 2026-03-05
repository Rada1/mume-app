import { GameStats, WeatherType, DeathStage, GmcpCharVitals, GmcpRoomInfo, GmcpRoomPlayers, GmcpRoomItems, GmcpOccupant, GmcpExitInfo } from '../../types';
import { isGmcpCharVitals, isGmcpRoomInfo, isGmcpRoomPlayers, isGmcpRoomItems, isGmcpExitInfoMap } from '../../utils/gmcpValidation';

export interface GmcpHandlers {
    setStats: React.Dispatch<React.SetStateAction<GameStats>>;
    setWeather: React.Dispatch<React.SetStateAction<WeatherType>>;
    setIsFoggy: React.Dispatch<React.SetStateAction<boolean>>;
    setInCombat: (inCombat: boolean) => void;
    detectLighting: (light: string) => void;
    onOpponentChange?: (opponent: string | null) => void;
    onAddPlayer?: (data: string | GmcpOccupant) => void;
    onRemovePlayer?: (data: string | GmcpOccupant) => void;
    onRoomItems?: (data: GmcpRoomItems | (string | GmcpOccupant)[]) => void;
    onRoomInfo?: (data: GmcpRoomInfo) => void;
    onRoomUpdateExits?: (data: Record<string, GmcpExitInfo | false>) => void;
    onCharVitals?: (data: GmcpCharVitals) => void;
    onRoomPlayers?: (data: GmcpRoomPlayers | (string | GmcpOccupant)[]) => void;
    onRoomNpcs?: (data: GmcpRoomPlayers | (string | GmcpOccupant)[]) => void;
    onAddNpc?: (data: string | GmcpOccupant) => void;
    onRemoveNpc?: (data: string | GmcpOccupant) => void;
    onCharNameChange?: (name: string | null) => void;
    onPositionChange?: (position: string) => void;
}

export class GmcpDecoder {
    private charVitalsState: { position?: string, opponent?: string | null } = {};

    constructor(private handlers: GmcpHandlers) { }

    public decode(pkg: string, json: string) {
        const pkgLower = pkg.toLowerCase();
        const { handlers } = this;

        if (pkgLower === 'char.vitals') {
            this.handleCharVitals(json);
        } else if (pkgLower === 'room.info' || pkgLower === 'external.room.info' || pkgLower.endsWith('.room.info')) {
            this.handleRoomInfo(json);
        } else if (pkgLower === 'room.updateexits') {
            this.handleUpdateExits(json);
        } else if (pkgLower === 'room.players') {
            this.handleRoomPlayers(json);
        } else if (pkgLower === 'room.chars' || pkgLower === 'room.chars.set' || pkgLower === 'room.chars.list') {
            this.handleRoomNpcs(json);
        } else if (pkgLower === 'room.addplayer') {
            this.handleSimpleJson(json, handlers.onAddPlayer);
        } else if (pkgLower === 'room.addchar' || pkgLower === 'room.chars.add') {
            this.handleSimpleJson(json, handlers.onAddNpc);
        } else if (pkgLower === 'room.removeplayer') {
            this.handleSimpleJson(json, handlers.onRemovePlayer);
        } else if (pkgLower === 'room.removechar' || pkgLower === 'room.chars.remove') {
            this.handleSimpleJson(json, handlers.onRemoveNpc);
        } else if (pkgLower === 'room.items' || pkgLower === 'char.items' || pkgLower === 'char.inv' || pkgLower === 'room.objects' || pkgLower === 'room.items.list' || pkgLower === 'char.items.list' || pkgLower === 'room.items.set') {
            this.handleRoomItems(json);
        } else if (pkgLower === 'char.name') {
            this.handleCharName(json);
        } else if (pkgLower === 'char.status') {
            this.handleCharStatus(json);
        }
    }

    private handleCharVitals(json: string) {
        try {
            const data = JSON.parse(json);
            if (isGmcpCharVitals(data)) {
                if (this.handlers.onCharVitals) this.handlers.onCharVitals(data);
                this.updateStatsFromVitals(data);
            }
        } catch (e) { }
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
            const mana = getField(['mana', 'sp', 'spirit', 'm']); if (mana !== undefined) next.mana = Number(mana);
            const maxmana = getField(['maxmana', 'maxsp', 'maxspirit', 'M']); if (maxmana !== undefined) next.maxMana = Number(maxmana);
            const move = getField(['move', 'mv', 'mp', 'moves', 'stamina', 'st', 'v']); if (move !== undefined) next.move = Number(move);
            const maxmove = getField(['maxmove', 'maxmv', 'maxmp', 'maxmoves', 'maxstamina', 'maxst', 'V']); if (maxmove !== undefined) next.maxMove = Number(maxmove);
            const wimpy = getField(['wimpy', 'w']); if (wimpy !== undefined) next.wimpy = Number(wimpy);
            return next;
        });

        const pos = getField(['position', 'pos', 'p']);
        if (pos !== undefined) {
            const p = pos.toLowerCase(); this.charVitalsState.position = p;
            if (this.handlers.onPositionChange) this.handlers.onPositionChange(p);
        }

        const opp = getField(['opponent', 'opp', 'o']);
        if (opp !== undefined) {
            this.charVitalsState.opponent = opp;
            if (this.handlers.onOpponentChange) this.handlers.onOpponentChange(opp);
        }

        const fighting = this.charVitalsState.position === 'fighting' || (this.charVitalsState.opponent != null && this.charVitalsState.opponent !== '');
        this.handlers.setInCombat(fighting);

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
    }

    private handleRoomInfo(json: string) {
        try {
            const data = JSON.parse(json);
            if (isGmcpRoomInfo(data) && this.handlers.onRoomInfo) this.handlers.onRoomInfo(data);
        } catch (e) { }
    }

    private handleUpdateExits(json: string) {
        try {
            const data = JSON.parse(json);
            if (isGmcpExitInfoMap(data) && this.handlers.onRoomUpdateExits) this.handlers.onRoomUpdateExits(data);
        } catch (e) { }
    }

    private handleRoomPlayers(json: string) {
        try {
            const data = JSON.parse(json);
            if (isGmcpRoomPlayers(data) && this.handlers.onRoomPlayers) this.handlers.onRoomPlayers(data);
        } catch (e) { }
    }

    private handleRoomNpcs(json: string) {
        try {
            const data = JSON.parse(json);
            if (isGmcpRoomPlayers(data) && this.handlers.onRoomNpcs) this.handlers.onRoomNpcs(data);
        } catch (e) { }
    }

    private handleRoomItems(json: string) {
        try {
            const data = JSON.parse(json);
            if (isGmcpRoomItems(data) && this.handlers.onRoomItems) this.handlers.onRoomItems(data);
        } catch (e) { }
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
}
