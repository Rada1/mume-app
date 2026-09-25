import { describe, expect, it } from 'vitest';
import { parseCitizenshipAgeWarFameInfo } from './characterInfoUtils';

describe('parseCitizenshipAgeWarFameInfo', () => {
    it('counts the place-name strings returned by %c', () => {
        expect(parseCitizenshipAgeWarFameInfo('Bree Fornost GreyHavens Rivendell BlueMountains Lórien 42 7'))
            .toEqual({ citizenships: 6, age: '42', warFame: 7 });
    });

    it('supports characters without any listed citizenships', () => {
        expect(parseCitizenshipAgeWarFameInfo('25 0'))
            .toEqual({ citizenships: 0, age: '25', warFame: 0 });
    });
});
