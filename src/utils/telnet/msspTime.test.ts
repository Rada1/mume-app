/** @file msspTime.test.ts — MSSP calendar parsing and pre-login Telnet negotiation. */
import { describe, expect, it, vi } from 'vitest';
import { parseMsspTime } from './msspTime';
import { ProtocolHandler } from './ProtocolHandler';
import { DO, IAC, SB, SE, TELNET_MSSP, WILL } from '../../constants';

// --- Server Status Fixtures ---
const payload = (fields: Record<string, string>) => Array.from(new TextEncoder().encode(
    Object.entries(fields).map(([key, value]) => `\x01${key}\x02${value}`).join('')
));
const fields = { 'GAME YEAR': '3000', 'GAME MONTH': 'Nórui', 'GAME DAY': '0', 'GAME HOUR': '18' };
const now = 1792530000000;

// --- Calendar Checks ---
describe('MUME server status calendar', () => {
    it('uses the named month and zero-based day supplied before login', () => {
        expect(parseMsspTime(payload(fields), now)).toMatchObject({ year: 3000, month: 'Forelithe', day: 1, hour: 18 });
        expect(parseMsspTime(payload({ ...fields, 'GAME DAY': '29', 'GAME MONTH': 'Winterfilth' }), now))
            .toMatchObject({ month: 'Winterfilth', day: 30 });
    });

    it.each([
        { 'GAME YEAR': '' }, { 'GAME MONTH': 'Unknown' }, { 'GAME DAY': '30' },
        { 'GAME HOUR': '24' }, { 'GAME DAY': '2x' }
    ])('rejects invalid or incomplete calendar data: %j', invalid => {
        expect(parseMsspTime(payload({ ...fields, ...invalid }), now)).toBeNull();
    });

    it('negotiates MSSP and parses a status frame split between network chunks', () => {
        const sendBytes = vi.fn();
        const onTime = vi.fn();
        const processText = vi.fn();
        const protocol = new ProtocolHandler({
            sendBytes, addMessage: vi.fn(), sendGMCP: vi.fn(), processText,
            handleSubnegotiation: buffer => {
                if (buffer[0] === TELNET_MSSP) onTime(parseMsspTime(buffer.slice(1), now));
            }
        });
        protocol.handleRawData(new Uint8Array([IAC, WILL, TELNET_MSSP]));
        expect(sendBytes).toHaveBeenCalledWith([IAC, DO, TELNET_MSSP]);
        const frame = [IAC, SB, TELNET_MSSP, ...payload(fields), IAC, SE];
        protocol.handleRawData(new Uint8Array(frame.slice(0, 17)));
        expect(onTime).not.toHaveBeenCalled();
        protocol.handleRawData(new Uint8Array(frame.slice(17)));
        expect(onTime).toHaveBeenCalledWith(expect.objectContaining({ month: 'Forelithe', day: 1 }));
        expect(processText).not.toHaveBeenCalled();
    });
});
