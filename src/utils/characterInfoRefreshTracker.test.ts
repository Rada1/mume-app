import { afterEach, describe, expect, it } from 'vitest';
import {
    beginCharacterInfoRefresh,
    consumeCharacterInfoRefreshLine,
    resetCharacterInfoRefreshTracker
} from './characterInfoRefreshTracker';

describe('character info refresh tracking', () => {
    afterEach(resetCharacterInfoRefreshTracker);

    it('assigns separate %c, %a, %h, %K, %g, and %y response lines in order', () => {
        beginCharacterInfoRefresh();
        expect(consumeCharacterInfoRefreshLine('Bree Fornost GreyHavens Rivendell BlueMountains Lórien'))
            .toEqual({ citizenships: 6 });
        expect(consumeCharacterInfoRefreshLine('260')).toEqual({ age: '260' });
        expect(consumeCharacterInfoRefreshLine('You have learnt of a quest in this area.')).toBeNull();
        expect(consumeCharacterInfoRefreshLine('six feet two')).toEqual({ height: 'six feet two' });
        expect(consumeCharacterInfoRefreshLine('unknown at war')).toEqual({ warFame: 0 });
        expect(consumeCharacterInfoRefreshLine('199,999')).toEqual({ gold: 199999 });
        expect(consumeCharacterInfoRefreshLine('30')).toEqual({ wimpy: 30 });
    });
});
