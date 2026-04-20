export interface ParserContext {
    isSpectateMode: boolean;
    sessionMode: string;
    characterName: string;
    roomDescRef: { current: string | null };
}

export type ParsedEvent = 
    | { type: 'atmosphere_weather'; data: { weather: string } }
    | { type: 'atmosphere_fog'; data: { isFoggy: boolean } }
    | { type: 'atmosphere_lightning'; data: {} }
    | { type: 'atmosphere_haptic'; data: { ms: number } }
    | { type: 'atmosphere_position'; data: { position: string, isSpectateTarget: boolean } }
    | { type: 'atmosphere_move_fail'; data: {} }
    | { type: 'atmosphere_door'; data: { isOpen: boolean } };

export type ParsedEventResult = ParsedEvent[] | null;