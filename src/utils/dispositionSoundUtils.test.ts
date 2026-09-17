import { describe, expect, it } from 'vitest';
import { getDispositionSliderPitch } from './dispositionSoundUtils';

describe('getDispositionSliderPitch', () => {
    it('uses a lower pitch for low mood and a higher pitch for high mood', () => {
        expect(getDispositionSliderPitch('mood', 'wimpy')).toBe(0.8);
        expect(getDispositionSliderPitch('mood', 'berserk')).toBe(1.2);
    });

    it('maps the endpoints of each other disposition slider', () => {
        expect(getDispositionSliderPitch('alertness', 'normal')).toBe(0.8);
        expect(getDispositionSliderPitch('alertness', 'paranoid')).toBe(1.2);
        expect(getDispositionSliderPitch('spellSpeed', 'quick')).toBe(0.8);
        expect(getDispositionSliderPitch('spellSpeed', 'thorough')).toBe(1.2);
    });
});
