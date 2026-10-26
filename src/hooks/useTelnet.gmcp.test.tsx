/** @file useTelnet.gmcp.test.tsx — One wire packet must cause one authoritative state callback. */
// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, expect, it, vi } from 'vitest';
import { useTelnet, type TelnetConfig } from './useTelnet';
import { IAC, SB, SE, TELNET_GMCP } from '../constants';

// --- Transport Section ---
const transport = vi.hoisted(() => ({
    receive: null as ((data: ArrayBuffer) => void) | null,
    sendBytes: vi.fn(),
}));
vi.mock('./useTelnetSocket', () => ({useTelnetSocket: () => ({
    isConnected: true, lastError: null, sendBytes: transport.sendBytes,
    connect: (_url: string, receive: (data: ArrayBuffer) => void) => { transport.receive = receive; },
    disconnect: vi.fn(),
})}));
const roots: ReturnType<typeof createRoot>[] = [];
afterEach(async () => {
    for (const root of roots.splice(0)) await act(async () => root.unmount());
    transport.receive = null;
    vi.clearAllMocks();
});
const packet = (pkg: string, payload: unknown) => new Uint8Array([
    IAC, SB, TELNET_GMCP, ...new TextEncoder().encode(`${pkg} ${JSON.stringify(payload)}`), IAC, SE,
]);
async function connect() {
    const handlers = {
        setStatus: vi.fn(), setStats: vi.fn(), setWeather: vi.fn(), setIsFoggy: vi.fn(),
        setInCombat: vi.fn(), detectLighting: vi.fn(), addMessage: vi.fn(),
        onCharVitals: vi.fn(), onCharInfo: vi.fn(), onCharStatusVars: vi.fn(),
        onRoomInfo: vi.fn(), onRoomChars: vi.fn(), onRoomPlayers: vi.fn(), onRoomNpcs: vi.fn(),
        onAddChar: vi.fn(), onUpdateChar: vi.fn(), onRemoveChar: vi.fn(), onRoomUpdateExits: vi.fn(),
        onGroupSet: vi.fn(), onGroupAdd: vi.fn(), onGroupUpdate: vi.fn(), onGroupRemove: vi.fn(),
        onMumeEdit: vi.fn(), onMumeView: vi.fn(), onCharRide: vi.fn(), onEvent: vi.fn(),
    };
    const config: TelnetConfig = {connectionUrl: 'ws://test', setPrompt: vi.fn(), processLine: vi.fn(), handlers};
    let client: ReturnType<typeof useTelnet>;
    function Harness() { client = useTelnet(config); return null; }
    const root = createRoot(document.createElement('div'));
    roots.push(root);
    await act(async () => root.render(<Harness/>));
    client!.connect();
    const receiveBytes = async (bytes: Uint8Array) => {
        await act(async () => transport.receive!(new Uint8Array(bytes).buffer));
    };
    return {handlers, config, receiveBytes, receive: async (pkg: string, payload: unknown) => {
        const bytes = packet(pkg, payload);
        await receiveBytes(bytes);
    }};
}

// --- Packet Regression Section ---
it.each(['Char.Vitals', 'Mume.Client.Vitals'])('routes %s vitals once per packet, including identical packets', async pkg => {
    const {handlers, receive} = await connect();
    const data = {hp: 90, maxhp: 100, position: 'standing', terrain: 'field'};
    await receive(pkg, data);
    expect(handlers.onCharVitals).toHaveBeenCalledExactlyOnceWith(data);
    expect(handlers.setStats).toHaveBeenCalledTimes(1);
    await receive(pkg, data);
    expect(handlers.onCharVitals).toHaveBeenCalledTimes(2);
});
it.each(['Room.Info', 'External.Room.Info', 'Mume.Client.Room'])('routes %s room updates once', async pkg => {
    const {handlers, receive} = await connect();
    const data = {num: 123, name: 'A road', terrain: 'road'};
    await receive(pkg, data);
    expect(handlers.onRoomInfo).toHaveBeenCalledExactlyOnceWith(data);
});
it.each([{mood: 'wimpy'}, {'spell-effort': 'quick'}, {alertness: 'alert'},
    {'hp-string': 'Fine'}, {ridden: true}, {xp: 123}, {buff: null}])('keeps partial vitals updates %j', async data => {
    const {handlers, receive} = await connect();
    await receive('Char.Vitals', data);
    expect(handlers.onCharVitals).toHaveBeenCalledExactlyOnceWith(data);
});
it.each([{zone: 'Bree'}, {desc: 'A road.'}, {exits: {n: 123}}])('keeps partial room updates %j', async data => {
    const {handlers, receive} = await connect();
    await receive('Room.Info', data);
    expect(handlers.onRoomInfo).toHaveBeenCalledExactlyOnceWith(data);
});
it.each(['Room.Chars', 'Room.Players', 'Room.Npcs', 'Mume.Client.Chars'])('routes %s occupants through the shared handler once', async pkg => {
    const {handlers, receive} = await connect();
    const data = [{id: 1, name: 'guard', type: 'npc'}];
    await receive(pkg, data);
    expect(handlers.onRoomChars).toHaveBeenCalledExactlyOnceWith(data);
    expect(handlers.onRoomPlayers).not.toHaveBeenCalled();
    expect(handlers.onRoomNpcs).not.toHaveBeenCalled();
});
it.each([
    ['Room.Chars.Add', 'onAddChar'], ['Room.Chars.Update', 'onUpdateChar'],
    ['Room.Chars.Remove', 'onRemoveChar'], ['Group.Add', 'onGroupAdd'],
    ['Group.Update', 'onGroupUpdate'], ['Group.Remove', 'onGroupRemove'],
    ['Char.Ride', 'onCharRide'], ['Mume.Client.Edit', 'onMumeEdit'], ['Mume.Client.View', 'onMumeView'],
] as const)('routes %s once', async (pkg, callback) => {
    const {handlers, receive} = await connect();
    const data = {id: 1, name: 'Guard'};
    await receive(pkg, data);
    expect(handlers[callback]).toHaveBeenCalledExactlyOnceWith(data);
});
it('preserves statusvars, character metadata and normalized exit packets', async () => {
    const {handlers, receive} = await connect();
    const status = {name: 'Ellessar', level: 104};
    await receive('Char.StatusVars', status);
    expect(handlers.onCharStatusVars).toHaveBeenCalledExactlyOnceWith(status);
    expect(handlers.onCharInfo).not.toHaveBeenCalled();
    await receive('Char.Status', status);
    expect(handlers.onCharInfo).toHaveBeenCalledExactlyOnceWith(status);
    const exits = {n: {flags: ['door', 'closed']}};
    await receive('Room.UpdateExits', exits);
    expect(handlers.onRoomUpdateExits).toHaveBeenCalledExactlyOnceWith({exits});
});
it('routes a full group list once instead of replaying set/add callbacks', async () => {
    const {handlers, receive} = await connect();
    const members = [{id: 1, name: 'Ellessar'}];
    await receive('Group', members);
    expect(handlers.onGroupSet).toHaveBeenCalledExactlyOnceWith(members);
    expect(handlers.onGroupAdd).not.toHaveBeenCalled();
});

it('keeps fragmented packets ordered and applies room metadata before parsing reply text', async () => {
    const {handlers, config, receiveBytes} = await connect();
    const sequence: string[] = [];
    handlers.onRoomInfo.mockImplementation(() => { sequence.push('room'); });
    vi.mocked(config.processLine).mockImplementation(line => { sequence.push(line); });
    const bytes = packet('Room.Info', {num: 123, name: 'A road', terrain: 'road'});
    await receiveBytes(bytes.slice(0, 18));
    expect(handlers.onRoomInfo).not.toHaveBeenCalled();
    await receiveBytes(new Uint8Array([
        ...bytes.slice(18), ...new TextEncoder().encode('A road.\n<prompt>o[&gt;</prompt>'),
    ]));
    expect(handlers.onRoomInfo).toHaveBeenCalledTimes(1);
    expect(sequence[0]).toBe('room');
    expect(sequence).toContain('A road.');
    expect(config.setPrompt).toHaveBeenCalledExactlyOnceWith('o[');
});

it('keeps two room changes in one socket event as two distinct ordered updates', async () => {
    const {handlers, receiveBytes} = await connect();
    await receiveBytes(new Uint8Array([
        ...packet('Room.Info', {num: 123, name: 'A road'}),
        ...packet('Room.Info', {num: 124, name: 'A field'}),
    ]));
    expect(handlers.onRoomInfo.mock.calls).toEqual([
        [{num: 123, name: 'A road'}], [{num: 124, name: 'A field'}],
    ]);
});
