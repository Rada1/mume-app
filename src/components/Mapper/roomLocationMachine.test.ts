/** @file MMapper-style candidate resolution and weak-property comparison regressions. */
import { describe, expect, it } from 'vitest';
import type { MapperLocationInputs, MapperPreloadedRoom } from '../../types';
import { createRoomLocationState, locateRoomObservation, resetRoomLocation } from './roomLocationMachine';
import { getMatchRoom, getObservationIndex } from './roomObservationIndex';
import { roomMatchesObservation } from './roomObservationMatch';

// --- Static map fixtures ---
const description = 'A narrow passage runs through the cold mountain beneath a high vaulted ceiling.';
const tuple = (name: string, exits: MapperPreloadedRoom[4], desc = description): MapperPreloadedRoom =>
    [10,10,0,'CAVERN',exits,name,0,[],[],'Mountain',0,1,'','','','','',desc];
const setup = (rooms: Record<string, MapperPreloadedRoom>): MapperLocationInputs => ({
    roomsRef:{current:{}},preloadedCoordsRef:{current:rooms},serverIdIndexRef:{current:{}},spatialIndexRef:{current:{}}
});

describe('candidate location machine', () => {
    it('separates duplicate room names by indexed static descriptions', () => {
        const inputs = setup({'1':tuple('Hall',{u:3}), '2':tuple('Hall',{u:4},'A completely different cavern filled with the roaring sound of rushing water.')});
        const state = createRoomLocationState(); resetRoomLocation(state);
        const match = locateRoomObservation(inputs,state,{name:'Hall',desc:description},'m_99',null);
        expect(match.id).toBe('m_1'); expect(state.confidence).toBe('confirmed');
        expect(getObservationIndex(inputs.preloadedCoordsRef.current)).toBe(getObservationIndex(inputs.preloadedCoordsRef.current));
    });
    it('retains ambiguous candidates until a subsequent movement disambiguates them', () => {
        const inputs = setup({'1':tuple('Hall',{e:3}), '2':tuple('Hall',{e:4}),
            '3':tuple('Landing',{w:1}), '4':tuple('Dead End',{w:2})});
        const state = createRoomLocationState(); resetRoomLocation(state);
        expect(locateRoomObservation(inputs,state,{name:'Hall',desc:description},null,null).id).toBeNull();
        expect(state.confidence).toBe('uncertain');
        expect(state.candidates.map(candidate => candidate.id)).toEqual(['m_1','m_2']);
        expect(locateRoomObservation(inputs,state,{name:'Landing',exits:{w:1}},null,'e').id).toBe('m_3');
        expect(state.confidence).toBe('confirmed');
    });
    it('keeps every possible destination of a random exit until the next room distinguishes them', () => {
        const inputs = setup({'1':tuple('Start',{e:{target:'',targets:['2','3']}}),
            '2':tuple('Hall',{n:4}), '3':tuple('Hall',{n:5}),
            '4':tuple('Landing',{s:2}), '5':tuple('Dead End',{s:3})});
        const state = createRoomLocationState();
        expect(locateRoomObservation(inputs,state,{name:'Hall',desc:description},'m_1','e').id).toBeNull();
        expect(state.candidates.map(candidate => candidate.id)).toEqual(['m_2','m_3']);
        expect(locateRoomObservation(inputs,state,{name:'Landing'},'m_1','n')).toMatchObject({id:'m_4',relocation:true});
    });
    it('rejects the old location when a look has contradictory room evidence', () => {
        const inputs = setup({'1':tuple('Trail at a Cave',{n:3})});
        const state = createRoomLocationState();
        expect(locateRoomObservation(inputs,state,{name:'Halls of the Morruhk',exits:{u:1}},'m_1',null).id).toBeNull();
        expect(state.confidence).toBe('searching');
    });
    it('uses reverse connections when an outgoing connection is missing', () => {
        const inputs = setup({'1':tuple('Start',{}), '2':tuple('Landing',{w:1})});
        expect(locateRoomObservation(inputs,createRoomLocationState(),{name:'Landing'},'m_1','e').id).toBe('m_2');
    });
    it('ignores coordinates when a collocated candidate contradicts the observed name', () => {
        const inputs = setup({'1':tuple('Start',{e:2}), '2':tuple('Wrong',{w:1})});
        const state = createRoomLocationState();
        expect(locateRoomObservation(inputs,state,{name:'Different room',exits:{u:1}},'m_1','e').id).toBeNull();
        expect(state.confidence).toBe('searching');
    });
    it('keeps exact server-ID lookup independent of the search indices', () => {
        const inputs = setup({'1':tuple('Hall',{u:2})});
        inputs.serverIdIndexRef.current['100'] = '1';
        const match = locateRoomObservation(inputs,createRoomLocationState(),{id:100,name:'Newly renamed room'},null,null);
        expect(match).toMatchObject({id:'m_1',source:'EXACT_VNUM'});
    });
});

describe('static observation comparison', () => {
    it('allows a missing hidden exit while rejecting an unexplained visible exit', () => {
        const inputs = setup({'1':tuple('Hall',{n:2,e:{target:3,hasDoor:true,flags:['DOOR','HIDDEN']}})});
        const room = getMatchRoom(inputs,'m_1')!;
        expect(roomMatchesObservation(room,{name:'Hall',exits:{n:1}})).toBe(true);
        expect(roomMatchesObservation(room,{name:'Hall',exits:{s:1}})).toBe(false);
    });
    it('recognizes hidden door flags retained separately by the mm2 importer', () => {
        const room = getMatchRoom(setup({'1':tuple('Hall',{n:2,e:{target:3,hasDoor:true,flags:['DOOR'],doorFlags:['HIDDEN']}})}),'m_1')!;
        expect(roomMatchesObservation(room,{name:'Hall',exits:{n:1}})).toBe(true);
    });
    it('treats NO_MATCH exits and absent descriptions as unknown evidence', () => {
        const inputs = setup({'1':tuple('Hall',{n:2,e:{target:3,flags:['NO_MATCH']}})});
        expect(roomMatchesObservation(getMatchRoom(inputs,'m_1')!,{name:'Hall',exits:{n:1}})).toBe(true);
    });
    it('allows small static text edits but rejects a different room or terrain', () => {
        const inputs = setup({'1':tuple('Hall',{n:2})}), room = getMatchRoom(inputs,'m_1')!;
        expect(roomMatchesObservation(room,{name:'Hall',desc:description.replace('cold','cool')})).toBe(true);
        expect(roomMatchesObservation(room,{name:'Hall',desc:'An entirely different room.'})).toBe(false);
        expect(roomMatchesObservation(room,{name:'Hall',terrain:'forest'})).toBe(false);
    });
    it('distinguishes absent exit evidence from an explicitly empty exit list', () => {
        const room = getMatchRoom(setup({'1':tuple('Hall',{n:2})}),'m_1')!;
        expect(roomMatchesObservation(room,{name:'Hall'})).toBe(true);
        expect(roomMatchesObservation(room,{name:'Hall',exits:{}})).toBe(false);
    });
});
