import { describe, it, expect } from 'vitest';
import { isTrailExit, getRoomRouteDirections, getRoomTrailDirections, getTrailPixmapSuffix } from './trailUtils';

describe('trailUtils', () => {
    describe('isTrailExit', () => {
        it('returns false when no flags or trail names are present', () => {
            const res = isTrailExit('Mountains', 'Mountains', []);
            expect(res.isRoad).toBe(false);
            expect(res.isTrail).toBe(false);
        });

        it('returns isRoad=true when both ends are Road', () => {
            const res = isTrailExit('Road', 'Road', ['ROAD']);
            expect(res.isRoad).toBe(true);
            expect(res.isTrail).toBe(false);
        });

        it('returns isTrail=true when exit has ROAD flag and origin is Mountains', () => {
            const res = isTrailExit('Mountains', 'Mountains', ['ROAD']);
            expect(res.isRoad).toBe(false);
            expect(res.isTrail).toBe(true);
        });

        it('returns isTrail=true when exit connects Road and Forest', () => {
            const res = isTrailExit('Road', 'Forest', ['ROAD']);
            expect(res.isRoad).toBe(false);
            expect(res.isTrail).toBe(true);
        });

        it('does not infer a trail from room names without explicit exit flags', () => {
            const res = isTrailExit('Hills', 'Hills', []);
            expect(res.isRoad).toBe(false);
            expect(res.isTrail).toBe(false);
        });
    });

    describe('getTrailPixmapSuffix', () => {
        it('returns undefined for empty directions', () => {
            expect(getTrailPixmapSuffix([])).toBeUndefined();
        });

        it('returns single cardinal directions', () => {
            expect(getTrailPixmapSuffix(['n'])).toBe('n');
            expect(getTrailPixmapSuffix(['e'])).toBe('e');
            expect(getTrailPixmapSuffix(['s'])).toBe('s');
            expect(getTrailPixmapSuffix(['w'])).toBe('w');
        });

        it('returns canonical composite combinations regardless of input order', () => {
            expect(getTrailPixmapSuffix(['s', 'w'])).toBe('sw');
            expect(getTrailPixmapSuffix(['w', 's'])).toBe('sw');
            expect(getTrailPixmapSuffix(['e', 's'])).toBe('es');
            expect(getTrailPixmapSuffix(['w', 'n'])).toBe('nw');
            expect(getTrailPixmapSuffix(['n', 'e'])).toBe('ne');
            expect(getTrailPixmapSuffix(['s', 'n'])).toBe('ns');
            expect(getTrailPixmapSuffix(['w', 'e'])).toBe('ew');

            // 3 directions
            expect(getTrailPixmapSuffix(['w', 's', 'e'])).toBe('esw');
            expect(getTrailPixmapSuffix(['n', 's', 'w'])).toBe('nsw');
            expect(getTrailPixmapSuffix(['e', 'n', 'w'])).toBe('new');
            expect(getTrailPixmapSuffix(['s', 'e', 'n'])).toBe('nes');

            // 4 directions
            expect(getTrailPixmapSuffix(['s', 'w', 'n', 'e'])).toBe('all');
        });
    });

    describe('getRoomTrailDirections', () => {
        it('does not draw ordinary exits from a room whose name contains Path as trails', () => {
            const localRoom = {
                id: '200', terrain: 'Forest', name: 'A Dark Path in the Forest',
                exits: {
                    n: { target: '201', flags: ['TRAIL'] },
                    s: { target: '202', flags: [] },
                    w: { target: '203', flags: ['TRAIL'] }
                }
            };
            const preloaded: Record<string, any> = {
                '200': [10, 10, 0, 'Forest', {}, 'A Dark Path in the Forest', '200'],
                '201': [10, 9, 0, 'Forest', {}], '202': [10, 11, 0, 'Forest', {}],
                '203': [9, 10, 0, 'Forest', {}]
            };

            expect(getRoomTrailDirections('200', localRoom, localRoom.exits, preloaded)).toEqual(['n', 'w']);
        });

        it('identifies trail exits from local room with flags', () => {
            const localRoom = {
                id: '8657',
                terrain: 'Mountains',
                exits: {
                    e: { target: '8658', flags: [] },
                    s: { target: '8659', flags: ['ROAD'] },
                    w: { target: '8656', flags: ['ROAD'] }
                }
            };
            const preloaded: Record<string, any> = {
                '8657': [100, 100, 0, 'Mountains', {
                    e: { target: '8658' },
                    s: { target: '8659', flags: ['ROAD'] },
                    w: { target: '8656', flags: ['ROAD'] }
                }],
                '8658': [101, 100, 0, 'Mountains', {}],
                '8659': [100, 101, 0, 'Mountains', {}],
                '8656': [99, 100, 0, 'Mountains', {}]
            };

            const trailDirs = getRoomTrailDirections('8657', localRoom, localRoom.exits, preloaded);
            expect(trailDirs).toEqual(['s', 'w']);
            expect(getTrailPixmapSuffix(trailDirs)).toBe('sw');
        });

        it('resolves flags from preloaded exits when local exits lack flags (GMCP numeric destination case)', () => {
            const localRoom = {
                id: '8657',
                terrain: 'Mountains',
                exits: {
                    s: { target: '8659', flags: [] },
                    w: { target: '8656', flags: [] }
                }
            };
            const preloaded: Record<string, any> = {
                '8657': [100, 100, 0, 'Mountains', {
                    s: { target: '8659', flags: ['ROAD'] },
                    w: { target: '8656', flags: ['ROAD'] }
                }, 'Angmarian Trail', '8657'],
                '8659': [100, 101, 0, 'Mountains', {}],
                '8656': [99, 100, 0, 'Mountains', {}]
            };

            const trailDirs = getRoomTrailDirections('8657', localRoom, localRoom.exits, preloaded);
            expect(trailDirs).toEqual(['s', 'w']);
            expect(getTrailPixmapSuffix(trailDirs)).toBe('sw');
        });

        it('returns empty array if room terrain is Road', () => {
            const localRoom = {
                id: '100',
                terrain: 'Road',
                exits: {
                    n: { target: '101', flags: ['ROAD'] }
                }
            };
            const preloaded: Record<string, any> = {
                '100': [10, 10, 0, 'Road', { n: { target: '101', flags: ['ROAD'] } }]
            };
            const trailDirs = getRoomTrailDirections('100', localRoom, localRoom.exits, preloaded);
            expect(trailDirs).toEqual([]);
            expect(getTrailPixmapSuffix(trailDirs)).toBeUndefined();
        });

        it('returns explicit route directions for a road tile', () => {
            const localRoom = {
                id: '100', terrain: 'Road',
                exits: {
                    n: { target: '101', flags: ['ROAD'] },
                    e: { target: '102', flags: ['ROAD'] },
                    s: { target: '103', flags: [] }
                }
            };
            const preloaded: Record<string, any> = {
                '100': [10, 10, 0, 'Road', {}],
                '101': [10, 9, 0, 'Road', {}], '102': [11, 10, 0, 'Road', {}],
                '103': [10, 11, 0, 'Field', {}]
            };

            expect(getRoomRouteDirections('100', localRoom, localRoom.exits, preloaded)).toEqual(['n', 'e']);
            expect(getTrailPixmapSuffix(getRoomRouteDirections('100', localRoom, localRoom.exits, preloaded))).toBe('ne');
        });
    });
});
