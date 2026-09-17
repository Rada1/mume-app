const DISPOSITION_OPTIONS: Record<'mood' | 'alertness' | 'spellSpeed', string[]> = {
    mood: ['wimpy', 'prudent', 'normal', 'brave', 'aggressive', 'berserk'],
    alertness: ['normal', 'careful', 'attentive', 'vigilant', 'paranoid'],
    spellSpeed: ['quick', 'fast', 'normal', 'careful', 'thorough']
};

/** Maps a disposition's slider position to a low-to-high confirmation pitch. */
export const getDispositionSliderPitch = (
    disposition: keyof typeof DISPOSITION_OPTIONS,
    value: string
): number => {
    const options = DISPOSITION_OPTIONS[disposition];
    const index = options.indexOf(value.toLowerCase());
    if (index < 0 || options.length < 2) return 1;
    return Number((0.8 + (index / (options.length - 1)) * 0.4).toFixed(2));
};
