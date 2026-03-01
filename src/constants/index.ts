// --- Telnet Constants ---
export const IAC = 255;
export const DONT = 254;
export const DO = 253;
export const WONT = 252;
export const WILL = 251;
export const SB = 250;
export const SE = 240;

export const TELNET_ECHO = 1;
export const TELNET_TTYPE = 24;
export const TELNET_NAWS = 31;
export const TELNET_GMCP = 201;

export const TTYPE_IS = 0;
export const TTYPE_SEND = 1;

// --- Configuration ---
export const DEFAULT_BG = "";
export const DEATH_IMG = "https://images.unsplash.com/photo-1605806616949-1e87b487bc2a?q=80&w=2574&auto=format&fit=crop";
export const LOGO_URL = "https://cdn-icons-png.flaticon.com/512/3062/3062634.png";
export const DEFAULT_URL = "wss://mume.org/ws-play/";

export const FX_THRESHOLD = 0.35; // 35% threshold for FX

// Map Environment Colors
export const ROOM_COLORS: Record<string, string> = {
    road: '#94a3b8',
    city: '#94a3b8',
    forest: '#14532d',
    field: '#3f6212',
    water: '#1e3a8a',
    shallow: '#3b82f6',
    rapids: '#1e40af',
    underwater: '#172554',
    brush: '#4d7c0f',
    underground: '#475569',
    tunnel: '#334155',
    cavern: '#1e293b',
    building: '#64748b',
    inside: '#475569',
    hills: '#713f12',
    mountain: '#451a03',
    default: '#64748b'
};
