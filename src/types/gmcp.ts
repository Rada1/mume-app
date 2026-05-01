/**
 * @file gmcp.ts
 * @description GMCP protocol-specific interfaces.
 */

export interface GmcpCharVitals {
    hp?: number;
    maxhp?: number;
    hits?: number;
    maxhits?: number;
    health?: number;
    maxhealth?: number;
    h?: number;
    H?: number;
    mana?: number;
    maxmana?: number;
    m?: number;
    M?: number;
    'mana-string'?: string;
    sp?: number;
    maxsp?: number;
    s?: number;
    S?: number;
    'sp-string'?: string;
    move?: number;
    maxmove?: number;
    v?: number;
    V?: number;
    mp?: number;
    maxmp?: number;
    moves?: number;
    maxmoves?: number;
    mv?: number;
    maxmv?: number;
    'mp-string'?: string;
    stamina?: number;
    maxstamina?: number;
    position?: string;
    mood?: string;
    opponent?: string | null;
    'opponent-hits'?: string;
    'opponent-hp'?: string;
    hp_status?: string;
    'hp-string'?: string;
    'health-string'?: string;
    buff?: string | null;
    weather?: string | null;
    w?: string | null;
    fog?: string | null;
    f?: string | null;
    light?: string | null;
    terrain?: string | null;
    move_status?: string;
    stamina_status?: string;
    wimpy?: number;
    xp?: number;
    xp_max?: number;
    'next-level-xp'?: number;
    isSnooped?: boolean;
}

export interface GmcpExitInfo {
    name: string;
    flags?: string[];
    id?: number;
    door?: number;
    to_vnum?: number;
}

export interface GmcpRoomInfo {
    num?: number;
    id?: number;
    vnum?: number;
    name?: string;
    desc?: string;
    area?: string;
    zone?: string;
    terrain?: string | null;
    environment?: string | null;
    weather?: string | null;
    w?: string | null;
    light?: string | number | null;
    l?: string | number | null;
    sundeath?: boolean;
    exits?: Record<string, GmcpExitInfo | number | false>;
    details?: string[];
    isSnooped?: boolean;
}

export interface GmcpUpdateExits {
    exits: Record<string, GmcpExitInfo | number | false>;
    isSnooped?: boolean;
}

export interface GmcpOccupant {
    id?: string | number;
    name?: string;
    short?: string;
    shortdesc?: string;
    keyword?: string;
    desc?: string;
    type?: string;
    pc?: boolean | number;
    category?: string;
    level?: number;
    hp?: number;
    maxhp?: number;
    status?: string;
    fighting?: string | number | null;
    labels?: string[];
    flags?: string[];
}

export interface GmcpRoomPlayers extends Array<string | GmcpOccupant> {}
export interface GmcpRoomNpcs extends Array<string | GmcpOccupant> {}
export interface GmcpRoomItems extends Array<string | GmcpOccupant> {}

export interface GmcpCharInfo {
    name?: string;
    fullname?: string;
    level?: number;
    xp?: number;
    xp_max?: number;
    'next-level-xp'?: number;
    tp?: number;
    tp_max?: number;
    'next-level-tp'?: number;
    race?: string;
    subrace?: string;
    subclass?: string;
    class?: string;
    gold?: number;
    description?: string;
    whois?: string;
    isSnooped?: boolean;
}

export interface GmcpMumeEdit {
    title: string;
    text: string;
    key: string;
}

export interface GroupMember {
    id: string | number;
    name: string;
    label?: string; // fallback
    type?: string;
    hp: number | string;
    'hp-string'?: string;
    mana?: number | string;
    'mana-string'?: string;
    mp?: number | string;
    'mp-string'?: string;
    vits?: {
        hp: number | string;
        maxhp: number | string;
        mana: number | string;
        maxmana: number | string;
        moves: number | string;
        maxmoves: number | string;
    };
    room?: string;
    position?: string;
    fighting?: boolean;
    waiting?: boolean;
    bashed?: boolean;
    poison?: boolean;
    wound?: boolean;
    blind?: boolean;
    snared?: boolean;
    slept?: boolean;
    sanctuary?: boolean;
    hungry?: boolean;
    thirsty?: boolean;
    mapid?: string | number;
}
