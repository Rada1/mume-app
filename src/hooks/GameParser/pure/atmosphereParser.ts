import { ParserContext, ParsedEvent, ParsedEventResult } from './types';

export function atmosphereParser(lower: string, context: ParserContext, isSnoop?: boolean): ParsedEventResult {
    const events: ParsedEvent[] = [];

    if (lower.includes("starts to rain") || lower.includes("it is raining")) {
        events.push({ type: 'atmosphere_weather', data: { weather: lower.includes("heavily") ? 'heavy-rain' : 'rain' } });
    }
    if (lower.includes("starts to snow") || lower.includes("it is snowing")) {
        events.push({ type: 'atmosphere_weather', data: { weather: 'snow' } });
    }
    if (lower.includes("rain stops") || lower.includes("snow stops") || lower.includes("clouds disappear")) {
        events.push({ type: 'atmosphere_weather', data: { weather: 'none' } });
    }

    if (lower.includes("starts to fog") || lower.includes("it is foggy") || lower.includes("fog has thickened") || lower.includes("thick fog covers") || lower.includes("disappears into the fog") || (lower.includes("fog") && lower.includes("thickens"))) {
        events.push({ type: 'atmosphere_fog', data: { isFoggy: true } });
    }
    if (lower.includes("fog thins") || lower.includes("fog dissipates") || lower.includes("fog has lifted") || lower.includes("fog disappears")) {
        events.push({ type: 'atmosphere_fog', data: { isFoggy: false } });
    }

    if (lower.includes("flash of lightning") || lower.includes("lightning illuminates")) {
        events.push({ type: 'atmosphere_lightning', data: {} });
        events.push({ type: 'atmosphere_haptic', data: { ms: 50 } });
    }

    // Position/Riding state updates from text triggers (covers both 1st-person "you mount" and 3rd-person "bob mounts")
    const isMounting = lower.includes("you mount ") || lower.includes("mounts ") || lower.includes("start riding") || lower.includes("picks up some reins") || lower.includes("pick up some reins");
    const isDismounting = lower.includes("you dismount") || lower.includes("dismounts ") || lower.includes("stop riding");
    const isSitting = lower.includes("you sit down") || lower.includes("sits down") || lower.includes("you rest") || lower.includes("rests");
    const isSleeping = lower.includes("you lie down") || lower.includes("lies down") || lower.includes("you go to sleep") || lower.includes("goes to sleep");
    const isStanding = lower.includes("you wake up") || lower.includes("wakes up") || lower.includes("you stand up") || lower.includes("stands up");

    const isSpectateTarget = Boolean(context.isSpectateMode && isSnoop);

    if (isMounting) {
        events.push({ type: 'atmosphere_position', data: { position: 'riding', isSpectateTarget } });
    } else if (isDismounting) {
        events.push({ type: 'atmosphere_position', data: { position: 'standing', isSpectateTarget } });
    } else if (isSitting) {
        events.push({ type: 'atmosphere_position', data: { position: 'sitting', isSpectateTarget } });
    } else if (isSleeping) {
        events.push({ type: 'atmosphere_position', data: { position: 'sleeping', isSpectateTarget } });
    } else if (isStanding) {
        events.push({ type: 'atmosphere_position', data: { position: 'standing', isSpectateTarget } });
    }

    const stopMovementMsg = lower.includes("alas, you cannot go that way") ||
        lower.includes("there is no exit") ||
        lower.includes("your mount refuses to go there");

    if (stopMovementMsg) {
        events.push({ type: 'atmosphere_haptic', data: { ms: 100 } });
        events.push({ type: 'atmosphere_move_fail', data: {} });
    }

    // Door sound triggers (text-based fallback)
    const isDoorOpen = lower.includes('is opened') || lower.includes('someone opens') || lower.includes('you hear a door open') || lower.includes('you open ') || lower.includes('you unlock and open');
    const isDoorClose = lower.includes('is closed') || lower.includes('someone closes') || lower.includes('you hear a door close') || lower.includes('you close ') || lower.includes('you lock and close');

    if (isDoorOpen) {
        events.push({ type: 'atmosphere_door', data: { isOpen: true } });
    } else if (isDoorClose) {
        events.push({ type: 'atmosphere_door', data: { isOpen: false } });
    }

    return events.length > 0 ? events : null;
}
