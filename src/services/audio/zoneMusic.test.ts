import { describe, it, expect } from 'vitest';
import { AUDIO_MANIFEST } from '../../constants/audioManifest';
import { getZoneAlignment } from '../../utils/zoneAlignment';
import { KNOWN_ZONE_COLORS } from '../../utils/zoneColors';

describe('Lorien Surroundings zone audio and metadata', () => {
    it('maps lorien surroundings and the lorien surroundings to loriensurroundings.mp3', () => {
        expect(AUDIO_MANIFEST.ambient.zones['lorien surroundings']).toBeDefined();
        expect(AUDIO_MANIFEST.ambient.zones['lorien surroundings'].url).toBe('/assets/Sounds/ZoneSounds/loriensurroundings.mp3');

        expect(AUDIO_MANIFEST.ambient.zones['the lorien surroundings']).toBeDefined();
        expect(AUDIO_MANIFEST.ambient.zones['the lorien surroundings'].url).toBe('/assets/Sounds/ZoneSounds/loriensurroundings.mp3');
    });

    it('keeps lorien mapped to Lorien1.mp3', () => {
        expect(AUDIO_MANIFEST.ambient.zones['lorien']).toBeDefined();
        expect(AUDIO_MANIFEST.ambient.zones['lorien'].url).toBe('/assets/Sounds/ZoneSounds/Lorien1.mp3');
    });

    it('includes loriensurroundings.mp3 in bpmMap for combat drum alignment', () => {
        expect(AUDIO_MANIFEST.bpmMap['loriensurroundings.mp3']).toBe(112);
    });

    it('maps alignment and colors for both lorien surroundings formats', () => {
        expect(getZoneAlignment('lorien surroundings')).toBe('good');
        expect(getZoneAlignment('the lorien surroundings')).toBe('good');
        expect(getZoneAlignment('Lorien Surroundings')).toBe('good');

        expect(KNOWN_ZONE_COLORS['lorien surroundings']).toBe('#538e58');
        expect(KNOWN_ZONE_COLORS['the lorien surroundings']).toBe('#538e58');
    });
});
