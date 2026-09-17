/** @file reconcileEffectTimers.test.ts */
import { beforeEach, describe, expect, it } from 'vitest';
import { EFFECT_TIMER_CATALOG } from '../../data/effectTimerCatalog';
import { useEffectTimerStore } from '../../stores/useEffectTimerStore';
import { reconcileSelfEffectTimers } from './reconcileEffectTimers';

describe('reconcileSelfEffectTimers', () => {
    beforeEach(() => useEffectTimerStore.getState().clearAll());

    it('removes timers absent from the authoritative stat affect list', () => {
        const store = useEffectTimerStore.getState();
        const bless = EFFECT_TIMER_CATALOG.find(entry => entry.id === 'spell-bless')!;
        const shroud = EFFECT_TIMER_CATALOG.find(entry => entry.id === 'spell-shroud')!;
        store.addTimer(bless, 'parser');
        store.addTimer(shroud, 'parser');

        reconcileSelfEffectTimers(['bless']);

        expect(useEffectTimerStore.getState().timers.map(timer => timer.catalogId)).toEqual(['spell-bless']);
    });
});
