import { describe, expect, it } from 'vitest';
import { isRidingFromGmcpRide } from './gmcpRideUtils';

describe('isRidingFromGmcpRide', () => {
    it.each([true, 1, 'horse', { riding: true }, { mount_name: 'a horse' }])('recognizes active ride payload %j', value => {
        expect(isRidingFromGmcpRide(value)).toBe(true);
    });

    it.each([false, 0, 'off', { ride: false }, { mount: null }])('recognizes inactive ride payload %j', value => {
        expect(isRidingFromGmcpRide(value)).toBe(false);
    });
});
