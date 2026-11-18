/** @file useSettingsStore.mapBrightness.test.ts — Theme brightness defaults and saved choices. */
import {afterEach, expect, it} from 'vitest';
import {useSettingsStore} from './useSettingsStore';

// --- Theme brightness section ---
const original = useSettingsStore.getState();
afterEach(() => useSettingsStore.setState(original));
it('defaults light maps to full brightness and retains independent adjustments', () => {
 useSettingsStore.setState({theme:'dark',mapBrightness:50,mapBrightnessDark:50,mapBrightnessLight:100});
 const settings = useSettingsStore.getState();
 settings.setTheme('light');
 expect(useSettingsStore.getState().mapBrightness).toBe(100);
 settings.setMapBrightness(80);
 settings.setTheme('dark');
 expect(useSettingsStore.getState().mapBrightness).toBe(50);
 settings.setTheme('light');
 expect(useSettingsStore.getState().mapBrightness).toBe(80);
});
