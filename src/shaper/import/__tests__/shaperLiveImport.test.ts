/**
 * @file shaperLiveImport.test.ts
 * @description Tests applying live MUME room-read transcripts to Shaper docs.
 */

import { describe, expect, it } from 'vitest';
import { createDefaultShaperDocument } from '../../model/shaperDocument';
import { applyShaperLiveTranscript } from '../shaperLiveImport';

// --- Test Section ---
describe('shaperLiveImport', () => {
    it('updates zone info, room stat fields, com nodes, and room libraries', () => {
        const doc = createDefaultShaperDocument({ zoneNumber: 31 });
        const result = applyShaperLiveTranscript(doc, `
/info z 31 map
The old road bends through the hills.
/at 31:04 /stat room full
Name: [A quiet road]
Sector: [road]
Flags: dark trail
Owner: [Builder]
Description:
  A quiet road runs east and west.
Exits: east west
/at 31:04 /com list -commands
/com add mobile 70 10000
/com add + equip 2012 0 wield
/lib room 31:04 list -commands
/lib room 31:04 add hide-exits
/lib room 31:04 set 1 direction e
/lib room 31:04 load
`, 1234);

        const room = Object.values(result.doc.rooms).find(item => item.roomNumber === '31:04');
        expect(room?.name).toBe('A quiet road');
        expect(room?.sector).toBe('road');
        expect(room?.flags).toEqual(['dark', 'trail']);
        expect(room?.owner).toBe('Builder');
        expect(room?.description).toBe('A quiet road runs east and west.');
        expect(room?.liveSnapshot?.statRoomFull).toContain('Name: [A quiet road]');
        expect(result.doc.zoneInfoKeywords.map.body).toBe('The old road bends through the hills.');

        const commands = Object.values(result.doc.commandNodes);
        expect(commands).toHaveLength(2);
        expect(commands[0]).toMatchObject({ type: 'mobile', parentId: null, fields: { vnum: '70' } });
        expect(commands[1]).toMatchObject({ type: 'equip', parentId: commands[0].id, fields: { vnum: '2012', position: 'wield' } });

        const libraries = Object.values(result.doc.libraries);
        expect(libraries).toHaveLength(1);
        expect(libraries[0]).toMatchObject({
            targetType: 'room',
            targetId: room?.id,
            name: 'hide-exits',
            parameters: { direction: 'e' },
            requiresLoad: true
        });
        expect(result.summary.roomsTouched).toBe(1);
    });

    it('decodes escaped symbols in imported zone info keyword bodies', () => {
        const doc = createDefaultShaperDocument({ zoneNumber: 31 });
        const result = applyShaperLiveTranscript(doc, `
/info z 31 asciimap
&gt; = mountain
&lt; = valley
&amp; = river crossing
`, 1234);

        expect(result.doc.zoneInfoKeywords.asciimap.body).toBe(
            '> = mountain\n< = valley\n& = river crossing'
        );
    });

    it('accepts explicit /info zone keyword reads', () => {
        const doc = createDefaultShaperDocument({ zoneNumber: 31 });
        const result = applyShaperLiveTranscript(doc, `
/info zone 31 history read
Old notes survive here.
`, 1234);

        expect(result.doc.zoneInfoKeywords.history.body).toBe('Old notes survive here.');
    });

    it('preserves internal empty lines in imported zone info keyword bodies', () => {
        const doc = createDefaultShaperDocument({ zoneNumber: 31 });
        const result = applyShaperLiveTranscript(doc, `
/info z 31 asciimap
Key

> = mountains

        15
`, 1234);

        expect(result.doc.zoneInfoKeywords.asciimap.body).toBe('Key\n\n> = mountains\n\n        15');
    });

    it('imports a real /stat room full description (unindented body, Extra-keywords terminator)', () => {
        const doc = createDefaultShaperDocument({ zoneNumber: 31 });
        const result = applyShaperLiveTranscript(doc, `
/at 31:20 /stat room full
Room 31:20 (3120) - in@a Shadowy Forest by the River
Magical key: seamnebobvi, Owner: none, Sector: forest, MapId: 15019284
Entrances: 0.00 (0.0000%), Magic: [0.00%,0.00%]
Room permanent flags: BUILD
Room temporary flags: none
Light sources: 0
Description:
The trees press close here, their tangled boughs shutting out nearly all light.
Rope-thick webs sag between the trunks and roots, beaded with cold moisture
from the nearby river. To the east, the faint rush of water stirs the stale
air, carrying the scent of mud, rot, and old silk.
Extra description keywords: none
------- Chars present -------
  a huge, venomous spider (6113)
  Ellessar (player 695470)
------- Exits -------
West   31: 10, flags: none
`, 1234);

        const room = Object.values(result.doc.rooms).find(item => item.roomNumber === '31:20');
        expect(room?.name).toBe('a Shadowy Forest by the River');
        expect(room?.preposition).toBe('in');
        expect(room?.sector).toBe('forest');
        expect(room?.description).toBe(
            'The trees press close here, their tangled boughs shutting out nearly all light.\n' +
            'Rope-thick webs sag between the trunks and roots, beaded with cold moisture\n' +
            'from the nearby river. To the east, the faint rush of water stirs the stale\n' +
            'air, carrying the scent of mud, rot, and old silk.'
        );
        // The char list, separators, and exits must NOT leak into the description.
        expect(room?.description).not.toContain('spider');
        expect(room?.description).not.toContain('Extra description');
        expect(room?.description).not.toContain('Exits');
    });

    it('imports extra description keyword names without dropping existing text', () => {
        const doc = createDefaultShaperDocument({ zoneNumber: 31 });
        const room = Object.values(doc.rooms).find(item => item.roomNumber === '31:20')!;
        const seeded = {
            ...doc,
            rooms: {
                ...doc.rooms,
                [room.id]: {
                    ...room,
                    keywords: [{ id: 'old', keywords: ['webbing'], description: 'Old sticky strands cling here.' }]
                }
            }
        };
        const result = applyShaperLiveTranscript(seeded, `
/at 31:20 /stat room full
Room 31:20 (3120) - in@a Shadowy Forest by the River
Magical key: seamnebobvi, Owner: none, Sector: forest, MapId: 15019284
Room permanent flags: BUILD
Description:
The trees press close here.
Extra description keywords: webbing strands
------- Exits -------
`, 1234);

        const imported = Object.values(result.doc.rooms).find(item => item.roomNumber === '31:20');
        expect(imported?.keywords).toEqual([
            { id: 'live-edesc-webbing', keywords: ['webbing'], description: 'Old sticky strands cling here.' },
            { id: 'live-edesc-strands', keywords: ['strands'], description: '' }
        ]);
    });

    it('treats Description: <none> as an empty import (keeps existing desc)', () => {
        const doc = createDefaultShaperDocument({ zoneNumber: 31 });
        const result = applyShaperLiveTranscript(doc, `
/at 31:15 /stat room full
Room 31:15 (3115) - on a@Brambly Slope
Magical key: oilxygraac, Owner: none, Sector: mountains, MapId: 15413516
Room permanent flags: BUILD
Description: <none>
Extra description keywords: none
------- Exits -------
North 31: 14, flags: none
`, 1234);

        const room = Object.values(result.doc.rooms).find(item => item.roomNumber === '31:15');
        expect(room?.description).toBe('');
    });

    it('normalizes live plural mountain sector into the Shaper sector model', () => {
        const doc = createDefaultShaperDocument({ zoneNumber: 188 });
        const result = applyShaperLiveTranscript(doc, `
/at 188:38 /stat room
Room 188:38 (19638) - on a@Silent Peak
Magical key: jobglaeiil, Owner: none, Sector: mountains, MapId: 14000343
Entrances: 23.48 (0.0001%), Magic: [0.00%,0.00%]
Room permanent flags: NO_RIDE
Room temporary flags: none
Light sources: 0
Extra description keywords: none
------ Exits ------
West  188: 28, flags: none
`, 1234);

        const room = Object.values(result.doc.rooms).find(item => item.roomNumber === '188:38');
        expect(room?.sector).toBe('mountain');
        expect(room?.flags).toEqual(['no_ride']);
    });

    it('parses /com via the room-scoped command form', () => {
        const doc = createDefaultShaperDocument({ zoneNumber: 31 });
        const result = applyShaperLiveTranscript(doc, `
/com room 31:04 list -commands
/com add mobile 70 10000
/com add + equip 2012 0 wield
`, 1234);

        const room = Object.values(result.doc.rooms).find(item => item.roomNumber === '31:04');
        const commands = Object.values(result.doc.commandNodes);
        expect(commands).toHaveLength(2);
        expect(commands[0]).toMatchObject({ type: 'mobile', roomId: room?.id, parentId: null, fields: { vnum: '70' } });
        expect(commands[1]).toMatchObject({ type: 'equip', parentId: commands[0].id, fields: { vnum: '2012', position: 'wield' } });
        expect(room?.liveSnapshot?.comListCommands).toContain('/com add mobile 70 10000');
    });

    it('parses abbreviated type names from live /com list -commands output', () => {
        const doc = createDefaultShaperDocument({ zoneNumber: 31 });
        const result = applyShaperLiveTranscript(doc, `
/at 31:00 /com list -commands
/com add mob 8008 20200
/com add mob 2663 100
`, 1234);

        const commands = Object.values(result.doc.commandNodes);
        expect(commands).toHaveLength(2);
        expect(commands[0]).toMatchObject({ type: 'mobile', fields: { vnum: '8008' } });
        expect(commands[1]).toMatchObject({ type: 'mobile', fields: { vnum: '2663' } });
    });

    it('matches the unpadded /at … /com list -com form to the padded room key', () => {
        const doc = createDefaultShaperDocument({ zoneNumber: 31 });
        // Discovery created room "31:08"; the live command carries canonical "31:8".
        const result = applyShaperLiveTranscript(doc, `
/at 31:8 /com list -com
/com add mob 8008 20200
`, 1234);

        const rooms = Object.values(result.doc.rooms).filter(item => item.roomNumber === '31:08');
        expect(rooms).toHaveLength(1);
        const commands = Object.values(result.doc.commandNodes);
        expect(commands).toHaveLength(1);
        expect(commands[0]).toMatchObject({ type: 'mobile', roomId: rooms[0].id, fields: { vnum: '8008' } });
    });

    it('parses libraries from the /at <room> /lib list form, scoped or unscoped', () => {
        const doc = createDefaultShaperDocument({ zoneNumber: 31 });
        // Unscoped output (god standing in the room via /at).
        const unscoped = applyShaperLiveTranscript(doc, `
/at 31:4 /lib list -commands
/lib add hide-exits
/lib set 1 direction e
/lib load
`, 1234);
        const libsA = Object.values(unscoped.doc.libraries);
        expect(libsA).toHaveLength(1);
        expect(libsA[0]).toMatchObject({ name: 'hide-exits', parameters: { direction: 'e' }, requiresLoad: true });

        // Scoped output (room id echoed in each recreate line).
        const scoped = applyShaperLiveTranscript(doc, `
/at 31:4 /lib list -commands
/lib room 31:4 add hide-exits
/lib room 31:4 set 1 direction e
`, 1234);
        const libsB = Object.values(scoped.doc.libraries);
        expect(libsB).toHaveLength(1);
        expect(libsB[0]).toMatchObject({ name: 'hide-exits', parameters: { direction: 'e' } });
    });

    it('parses human /lib room list redress output onto matching room entities', () => {
        const doc = createDefaultShaperDocument({ zoneNumber: 31 });
        const result = applyShaperLiveTranscript(doc, `
/at 31:50 /com list
1    Object  9902 (some cracked wood) (--/--/1/100%)
/lib room 31:50 list
Commands on room 31:50 (hills by a watchtower):
1: redress-obj
  object:      obj 9902 (some cracked and splintered pieces of wood)
  keywords:    watchtower
  short-desc:  a watchtower is here
  long-desc:   A crumbling, circular watchtower rises above the hills.
  plural-desc: watchtowers
  full-desc:   A withered wooden watchtower of Dorwinion slumps beside the old
               road, its narrow beams gray with rot and weather.
  ptype:       the
`, 1234);

        const room = Object.values(result.doc.rooms).find(item => item.roomNumber === '31:50');
        const objectNode = Object.values(result.doc.commandNodes).find(node => node.fields.vnum === '9902');
        const library = Object.values(result.doc.libraries)[0];
        expect(library).toMatchObject({
            targetType: 'object',
            targetId: objectNode?.id,
            name: 'redress-obj',
            parameters: {
                object: 'obj 9902 (some cracked and splintered pieces of wood)',
                keywords: 'watchtower',
                'short-desc': 'a watchtower is here',
                'long-desc': 'A crumbling, circular watchtower rises above the hills.',
                'plural-desc': 'watchtowers',
                ptype: 'the'
            },
            requiresLoad: true
        });
        expect(String(library.parameters['full-desc'])).toContain('road, its narrow beams gray');
        expect(room?.liveSnapshot?.libRoomCommands).toContain('redress-obj');
    });

    it('infers room and retargets redress libs from shorthand manual list output', () => {
        const doc = createDefaultShaperDocument({ zoneNumber: 31 });
        const result = applyShaperLiveTranscript(doc, `
[/lib r h list]
Commands on room 31:50 (hills by a watchtower):
1: redress-obj
  object:      obj 9902 (some cracked and splintered pieces of wood)
  keywords:    watchtower
  short-desc:  a watchtower is here
  long-desc:   A crumbling, circular watchtower rises above the hills.
  plural-desc: watchtowers
  full-desc:   A withered wooden watchtower of Dorwinion slumps beside the old
               road, its narrow beams gray with rot and weather.
  ptype:       the
+ *( C iMw NN NS 3150[31:50]
[/com list]
1    Object  9902 (some cracked and splintered pieces of wood) (--/--/1/100%)
+ *( C iMw NN NS 3150[31:50]
`, 1234);

        const room = Object.values(result.doc.rooms).find(item => item.roomNumber === '31:50');
        const objectNode = Object.values(result.doc.commandNodes).find(node => node.fields.vnum === '9902');
        const library = Object.values(result.doc.libraries)[0];
        expect(room).toBeTruthy();
        expect(objectNode).toBeTruthy();
        expect(library).toMatchObject({
            targetType: 'object',
            targetId: objectNode?.id,
            name: 'redress-obj',
            parameters: { keywords: 'watchtower', ptype: 'the' }
        });
    });

    it('retargets redress object libraries to nested put commands', () => {
        const doc = createDefaultShaperDocument({ zoneNumber: 31 });
        const result = applyShaperLiveTranscript(doc, `
/at 31:50 /com list
1    Object  6042 (a wooden crate) (--/--/1/100%)
> 2  Put     2090 (a fishing net) in 6042 (crate) (--/--/1/100%)
/lib room 31:50 list
Commands on room 31:50 (hills by a watchtower):
1: redress-obj
  object:      obj 2090 (a fishing net)
  keywords:    net fishing
  short-desc:  a fishing net lies coiled inside
`, 1234);

        const putNode = Object.values(result.doc.commandNodes).find(node => node.type === 'put');
        const library = Object.values(result.doc.libraries)[0];
        expect(library).toMatchObject({
            targetType: 'object',
            targetId: putNode?.id,
            name: 'redress-obj'
        });
    });

    it('parses the /com list table form for names and decoded load counts', () => {
        const doc = createDefaultShaperDocument({ zoneNumber: 31 });
        const result = applyShaperLiveTranscript(doc, `
/at 31:31 /com list
[/com list]
1    Mobile  1010 (a catfish) (--/2/--/100%)
2    Mobile  8008 (a butterfly) (--/2/2/100%)
3    Object  2012 (a rusty sword) (--/--/1/50%)
`, 1234);

        const commands = Object.values(result.doc.commandNodes).sort((a, b) => a.order - b.order);
        expect(commands).toHaveLength(3);
        expect(commands[0]).toMatchObject({
            type: 'mobile',
            fields: { vnum: '1010', name: 'a catfish' },
            limit: { world: null, zone: 2, room: null, chancePercent: 100 }
        });
        expect(commands[1]).toMatchObject({
            type: 'mobile',
            fields: { vnum: '8008', name: 'a butterfly' },
            limit: { world: null, zone: 2, room: 2, chancePercent: 100 }
        });
        expect(commands[2]).toMatchObject({
            type: 'object',
            fields: { vnum: '2012', name: 'a rusty sword' },
            limit: { world: null, zone: null, room: 1, chancePercent: 50 }
        });
        // Decoded counts are re-packed into the numeric form deploy/validation need.
        expect(commands[0].limit?.raw).toBe('20000');
        expect(commands[1].limit?.raw).toBe('20200');
        expect(commands[2].limit?.raw).toBe('150');
    });

    it('parses nested /com list table commands with room prefixes and sets parent-child relationships', () => {
        const doc = createDefaultShaperDocument({ zoneNumber: 31 });
        const result = applyShaperLiveTranscript(doc, `
/com list z
 31:100  3   Object  6042 (a wooden crate) (--/--/1/100%)
 31:100  > 4   Put     2090 (a fishing net) in 6042 (crate) (--/--/1/100%)
 31:100  2   Follow  3800 (a small termite) follows 3801 (termite) (--/3/--/100%)
`, 1234);

        const commands = Object.values(result.doc.commandNodes).sort((a, b) => a.order - b.order);
        expect(commands).toHaveLength(3);
        expect(commands[0]).toMatchObject({
            type: 'object',
            parentId: null,
            fields: { vnum: '6042', name: 'a wooden crate' }
        });
        expect(commands[1]).toMatchObject({
            type: 'put',
            parentId: commands[0].id,
            fields: { vnum: '2090', name: 'a fishing net', container: '6042', containerName: 'crate' }
        });
        expect(commands[2]).toMatchObject({
            type: 'follow',
            parentId: null,
            fields: { vnum: '3800', name: 'a small termite', master: '3801', masterName: 'termite' }
        });
    });

    it('splits the MUME room title into preposition and name on the @ marker', () => {
        const doc = createDefaultShaperDocument({ zoneNumber: 31 });
        const result = applyShaperLiveTranscript(doc, `
/at 31:8 /stat room
Room 31:8 (3108) - on a@Jagged Crag
Magical key: none, Owner: none, Sector: hills, MapId: 1
Room permanent flags: BUILD
`, 1234);

        const room = Object.values(result.doc.rooms).find(item => item.roomNumber === '31:08');
        expect(room?.preposition).toBe('on a');
        expect(room?.name).toBe('Jagged Crag');
        expect(room?.mapId).toBe('1');
    });

    it('understands compact /stat room output from live MUME', () => {
        const doc = createDefaultShaperDocument({ zoneNumber: 31 });
        const result = applyShaperLiveTranscript(doc, `
/at 31:12 /stat room
Room 31:12 (3112) - among the Great Roots
Magical key: heveyimnig, Owner: none, Sector: forest, MapId: 10251233
Room permanent flags: BUILD
Room temporary flags: none
Extra description keywords: none
----- Exits -----
West   31: 2, flags: none
`, 1234);

        const room = Object.values(result.doc.rooms).find(item => item.roomNumber === '31:12');
        expect(room?.name).toBe('among the Great Roots');
        expect(room?.sector).toBe('forest');
        expect(room?.flags).toEqual(['build']);
        expect(room?.owner).toBe('none');
        expect(room?.mapId).toBe('10251233');
        expect(room?.liveSnapshot?.statRoomFull).toContain('Room 31:12');
        const westTarget = Object.values(result.doc.rooms).find(item => item.roomNumber === '31:02');
        expect(result.doc.exits[`${room?.id}:w`]).toMatchObject({ toRoomId: westTarget?.id, direction: 'w' });
    });

    it('imports the Mc-level bare `/stat room <n> full` form (no /at teleport)', () => {
        const doc = createDefaultShaperDocument({ zoneNumber: 31 });
        const result = applyShaperLiveTranscript(doc, `
/stat room 31:8 full
Room 31:8 (3108) - on a@Jagged Crag
Magical key: none, Owner: none, Sector: hills, MapId: 42
Room permanent flags: BUILD
Extra description keywords: none
----- Exits -----
West   31: 2, flags: none
`, 1234);

        const room = Object.values(result.doc.rooms).find(item => item.roomNumber === '31:08');
        expect(room?.name).toBe('Jagged Crag');
        expect(room?.preposition).toBe('on a');
        expect(room?.sector).toBe('hills');
        expect(room?.mapId).toBe('42');
        const westTarget = Object.values(result.doc.rooms).find(item => item.roomNumber === '31:02');
        expect(result.doc.exits[`${room?.id}:w`]).toMatchObject({ toRoomId: westTarget?.id, direction: 'w' });
    });

    it('replaces stale concept-grid exits with live /stat room exit rows', () => {
        const doc = createDefaultShaperDocument({ zoneNumber: 31 });
        const room = Object.values(doc.rooms).find(item => item.roomNumber === '31:50');
        expect(room).toBeTruthy();
        const staleEast = doc.exits[`${room?.id}:e`];
        expect(staleEast).toBeTruthy();

        const result = applyShaperLiveTranscript(doc, `
/at 31:50 /stat room
Room 31:50 (3150) - among@hills by a watchtower
Magical key: lhakouwtwi, Owner: none, Sector: hills, MapId: 5262803
Room permanent flags: BUILD
Room temporary flags: none
Extra description keywords: none
----- Exits -----
East   31: 60, flags: none
South  31: 51, flags: none
West   31: 40, flags: none
Up     31:101, flags: none
Down   31:100, flags: DOOR NO_MOB, name: trapdoor, key: no-keyhole, pick: 0%,
       weight: 1
`, 1234);

        const importedRoom = Object.values(result.doc.rooms).find(item => item.roomNumber === '31:50');
        expect(importedRoom?.mapId).toBe('5262803');
        const eastTarget = Object.values(result.doc.rooms).find(item => item.roomNumber === '31:60');
        const southTarget = Object.values(result.doc.rooms).find(item => item.roomNumber === '31:51');
        const westTarget = Object.values(result.doc.rooms).find(item => item.roomNumber === '31:40');
        const upTarget = Object.values(result.doc.rooms).find(item => item.roomNumber === '31:101');
        const downTarget = Object.values(result.doc.rooms).find(item => item.roomNumber === '31:100');
        expect(result.doc.exits[`${importedRoom?.id}:e`]).toMatchObject({ toRoomId: eastTarget?.id, direction: 'e' });
        expect(result.doc.exits[`${importedRoom?.id}:s`]).toMatchObject({ toRoomId: southTarget?.id, direction: 's' });
        expect(result.doc.exits[`${importedRoom?.id}:w`]).toMatchObject({ toRoomId: westTarget?.id, direction: 'w' });
        expect(result.doc.exits[`${importedRoom?.id}:u`]).toMatchObject({ toRoomId: upTarget?.id, direction: 'u' });
        expect(result.doc.exits[`${importedRoom?.id}:d`]).toMatchObject({
            toRoomId: downTarget?.id,
            doorFlags: ['door', 'no_mob'],
            hasDoor: true,
            doorName: 'trapdoor',
            keyMode: 'no_keyhole',
            doorPickPercent: 0,
            doorWeight: 1
        });
        expect(Object.values(result.doc.exits).filter(exit => exit.fromRoomId === importedRoom?.id)).toHaveLength(5);
    });

    it('imports live exits with abbreviated directions and loose comma spacing', () => {
        const doc = createDefaultShaperDocument({ zoneNumber: 31 });
        const result = applyShaperLiveTranscript(doc, `
/at 31:44 /stat room
Room 31:44 (3144) - in@A Test Junction
Room permanent flags: BUILD
Extra description keywords: none
----- Exits -----
N 31: 34 flags: none
E 31:45, flags: DOOR CLOSED
       name: gate, key: no_keyhole, pick: 25%,
       weight: 3
S 31:54, flags:
`, 1234);

        const importedRoom = Object.values(result.doc.rooms).find(item => item.roomNumber === '31:44');
        const northTarget = Object.values(result.doc.rooms).find(item => item.roomNumber === '31:34');
        const eastTarget = Object.values(result.doc.rooms).find(item => item.roomNumber === '31:45');
        const southTarget = Object.values(result.doc.rooms).find(item => item.roomNumber === '31:54');
        expect(result.doc.exits[`${importedRoom?.id}:n`]).toMatchObject({ toRoomId: northTarget?.id, direction: 'n' });
        expect(result.doc.exits[`${importedRoom?.id}:s`]).toMatchObject({ toRoomId: southTarget?.id, direction: 's' });
        expect(result.doc.exits[`${importedRoom?.id}:e`]).toMatchObject({
            toRoomId: eastTarget?.id,
            direction: 'e',
            doorFlags: ['door', 'closed'],
            hasDoor: true,
            doorName: 'gate',
            keyMode: 'no_keyhole',
            doorPickPercent: 25,
            doorWeight: 3
        });
    });

    it('imports exit descriptions from /stat room exit blocks', () => {
        const doc = createDefaultShaperDocument({ zoneNumber: 31 });
        const result = applyShaperLiveTranscript(doc, `
/at 31:50 /stat room
Room 31:50 (3150) - at@The Old Road Lookout
Magical key: nthhobnigoo, Owner: none, Sector: hills, MapId: 5262803
Entrances: 0.00 (0.0000%), Magic: [0.00%,0.00%]
Room permanent flags: BUILD SUNLIT
Room temporary flags: none
Light sources: 0
Extra description keywords: none
------- Exits -------
East   31: 60, flags: none
Description:
  test
  
South  31: 51, flags: none
West   31: 40, flags: none
Up     31:101, flags: none
Down   31:100, flags: DOOR CLOSED LOCKED NO_MOB, name: trapdoor, key: none,
               pick: 50%, weight: 1
Description:
  there somethign there
`, 1234);

        const importedRoom = Object.values(result.doc.rooms).find(item => item.roomNumber === '31:50');
        const east = result.doc.exits[`${importedRoom?.id}:e`];
        const down = result.doc.exits[`${importedRoom?.id}:d`];
        expect(importedRoom?.description).toBe('');
        expect(east).toMatchObject({ exitDescription: 'test' });
        expect(down).toMatchObject({ exitDescription: 'there somethign there', doorPickPercent: 50, doorWeight: 1 });
    });
});
