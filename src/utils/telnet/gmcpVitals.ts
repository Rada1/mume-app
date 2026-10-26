/** @file gmcpVitals.ts — Applies normalized vitals fields without redispatching the packet callback. */
import type { GameStats, GmcpCharVitals, GmcpHandlers, GmcpVitalsState } from '../../types';
import { normalizeGmcpWeather } from '../weatherUtils';

// --- Vitals Update Section ---
export function updateGmcpVitals(data: GmcpCharVitals, handlers: GmcpHandlers, state: GmcpVitalsState) {
    const fields: [string, unknown][] = Object.entries(data);
    const getField = (keys: string[]) => {
        for (const k of keys) {
            const found = fields.find(([dk]) => dk.toLowerCase() === k.toLowerCase());
            if (found !== undefined) return found[1];
        }
        return undefined;
    };

    if (typeof handlers.setStats === 'function') {
        handlers.setStats((prev: GameStats) => {
            const next = { ...prev };
            const hp = getField(['hp', 'hits', 'health', 'h']); if (hp !== undefined) next.hp = Number(hp);
            const maxhp = getField(['maxhp', 'maxhits', 'maxhealth', 'H']); if (maxhp !== undefined) next.maxHp = Number(maxhp);
            const mana = getField(['mana', 'sp', 'spirit', 's', 'm']); if (mana !== undefined) next.mana = Number(mana);
            const maxmana = getField(['maxmana', 'maxsp', 'maxspirit', 'S', 'M']); if (maxmana !== undefined) next.maxMana = Number(maxmana);
            const move = getField(['move', 'mv', 'mp', 'moves', 'stamina', 'st', 'v']); if (move !== undefined) next.move = Number(move);
            const maxmove = getField(['maxmove', 'maxmv', 'maxmp', 'maxmoves', 'maxstamina', 'maxst', 'V']); if (maxmove !== undefined) next.maxMove = Number(maxmove);
            const wimpy = getField(['wimpy', 'W']); if (wimpy !== undefined) next.wimpy = Number(wimpy);
            const moveStatus = getField(['move_status', 'stamina_status', 'st_status']); if (moveStatus !== undefined) next.staminaStatus = String(moveStatus);

            // Hunger / Thirst (MUME fields)
            const hungry = getField(['hungry', 'hunger']); if (hungry !== undefined) next.conditions = { ...next.conditions, hungry: !!hungry };
            const thirsty = getField(['thirsty', 'thirst']); if (thirsty !== undefined) next.conditions = { ...next.conditions, thirsty: !!thirsty };

            return next;
        });
    }

    const pos = getField(['position', 'pos', 'p']);
    if (pos !== undefined) {
        const p = String(pos).toLowerCase();
        state.position = p;
        if (handlers.onPositionChange) handlers.onPositionChange(p);

        // NOTE: We no longer sync 'waiting' condition from position here.
        // Spells can be cast while 'standing'.
    }

    const opp = getField(['opponent', 'opp', 'o']);
    if (opp !== undefined) {
        const newOpp = opp == null || opp === "" ? null : String(opp);
        state.opponent = newOpp;
        if (handlers.onOpponentChange) handlers.onOpponentChange(newOpp);

        // If opponent is explicitly cleared and we aren't fighting, help the transition
        if (newOpp === null && state.position && !state.position.includes('fighting')) {
            handlers.setInCombat(false, true);
        }
    }

    const buff = getField(['buff', 'b']);
    if (buff !== undefined) {
        state.buff = buff == null || buff === "" ? null : String(buff);
        if (handlers.onBufferChange) handlers.onBufferChange(state.buff);
    }

    // Combat state is driven strictly by the position field in *this* Char.Vitals update.
    // We intentionally ignore the opponent field — it can linger as stale cached state from
    // a previous fight, and using it was causing combat mode to re-fire on unrelated vitals
    // updates where position had already returned to 'standing' / 'resting' / etc.
    const posRaw = getField(['position', 'pos', 'p']);
    if (posRaw !== undefined) {
        const posStr = String(posRaw).toLowerCase();
        if (posStr.includes('fighting')) {
            handlers.setInCombat(true);
        } else {
            // If position is explicitly a non-fighting state, force clear the UI latch
            const isExplicitlyNotFighting = ['standing', 'resting', 'sitting', 'sleeping'].some(p => posStr === p || posStr.includes(p));
            if (isExplicitlyNotFighting) {
                handlers.setInCombat(false, true);
                // Also clear stale opponent if we are definitely not fighting
                state.opponent = null;
            } else {
                handlers.setInCombat(false);
            }
        }
    }

    const weatherVal = getField(['weather', 'w']);
    if (weatherVal !== undefined && typeof handlers.setWeather === 'function') {
        const weather = normalizeGmcpWeather(weatherVal);
        if (weather) handlers.setWeather(weather);
    }

    const fogVal = getField(['fog', 'f']);
    if (fogVal !== undefined && typeof handlers.setIsFoggy === 'function') {
        handlers.setIsFoggy(fogVal === '-' || fogVal === '=');
    }

    const lightVal = getField(['light', 'l']);
    if (lightVal !== undefined && typeof handlers.detectLighting === 'function') {
        handlers.detectLighting(String(lightVal));
    }

    // Pass xp/tp to charInfo if present in vitals (MUME style)
    const xp = getField(['xp']);
    const tp = getField(['tp']);
    if ((xp !== undefined || tp !== undefined) && handlers.onCharInfo) {
        handlers.onCharInfo({
            xp: xp !== undefined ? Number(xp) : undefined,
            tp: tp !== undefined ? Number(tp) : undefined
        });
    }
}
