/** @file useParleyChannelMenu.ts — Hover channel selection followed by recipient selection. */
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import type { ParleyChannelChipProps } from '../types/commandChat';
import { useGame } from '../context/GameContext';
import { getRoomEntityMenuEntries } from '../objects/roomEntityMenuModel';
import { CHAT_PARLEY_CHANNELS, getWhoPlayerNames } from '../utils/chatWindowUtils';
import { menuVerticalPlacement } from '../utils/menuVerticalPlacement';
// --- Menu State Section ---
export const isDirectedParleyChannel = (command: string) => ['tell','whisper','ask'].includes(command);
const MENU_EDGE_GUTTER = 8;
const RECENT_CHANNELS_STORAGE_KEY = 'mume-recent-parley-channels';
type ChatChannel = typeof CHAT_PARLEY_CHANNELS[number];

const readRecentChannels = (): ChatChannel[] => {
    if (typeof localStorage === 'undefined') return [];
    try {
        const saved: unknown = JSON.parse(localStorage.getItem(RECENT_CHANNELS_STORAGE_KEY) || '[]');
        if (!Array.isArray(saved)) return [];
        return [...new Set(saved.filter((value): value is ChatChannel =>
            typeof value === 'string' && value !== 'group' && CHAT_PARLEY_CHANNELS.includes(value as ChatChannel)
        ))];
    } catch {
        return [];
    }
};

export function useParleyChannelMenu(props: ParleyChannelChipProps) {
    const { roomPlayers, roomNpcs, characterName, groupMembers, viewport } = useGame();
    const anchorRef = useRef<HTMLDivElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [open, setOpen] = useState(false);
    const [preview, setPreview] = useState('');
    const [recentChannels, setRecentChannels] = useState<ChatChannel[]>(readRecentChannels);
    const orderedChannels = viewport?.isMobile
        ? [...recentChannels, ...CHAT_PARLEY_CHANNELS.filter(channel => channel !== 'group' && !recentChannels.includes(channel))]
        : CHAT_PARLEY_CHANNELS.filter(channel => channel !== 'group');
    const rememberChannel = (command: ChatChannel) => {
        if (command === 'group') return;
        setRecentChannels(current => [command, ...current.filter(channel => channel !== command)]);
    };
    const [position, setPosition] = useState<CSSProperties>({});
    const cancelClose = () => { if (timer.current) clearTimeout(timer.current); };
    const close = () => { cancelClose(); setOpen(false); setPreview(''); };
    const scheduleClose = () => { cancelClose(); timer.current = setTimeout(close, 220); };
    const show = () => {
        if (props.disabled) return;
        cancelClose();
        const rect = anchorRef.current?.getBoundingClientRect();
        if (!rect) return;
        const availableWidth = Math.max(1, window.innerWidth - MENU_EDGE_GUTTER * 2);
        const logRect = !viewport?.isMobile && anchorRef.current?.closest('.message-log-docked-input')
            ? (anchorRef.current?.closest('.desktop-center-column') ?? document.querySelector('.desktop-center-column'))?.getBoundingClientRect()
            : null;
        const leftLaneWidth = logRect ? logRect.left - MENU_EDGE_GUTTER * 2 : 0;
        const useLeftLane = leftLaneWidth >= 240;
        const width = Math.min(620, useLeftLane ? leftLaneWidth : availableWidth);
        const left = useLeftLane && logRect
            ? logRect.left - width - MENU_EDGE_GUTTER
            : Math.max(MENU_EDGE_GUTTER, Math.min(rect.left, window.innerWidth - width - MENU_EDGE_GUTTER));
        setPosition({ left, width,
            ...menuVerticalPlacement(rect.top, rect.bottom, window.innerHeight) });
        setOpen(true);
    };
    const previewChannel = (command: string) => {
        cancelClose();
        setPreview(command);
        if (command === 'tell' && preview !== 'tell') props.requestWhoList();
    };
    const choose = (command: ParleyChannelChipProps['command'], target: string | null = null) => {
        if (command === 'none' || (isDirectedParleyChannel(command) && !target)) return;
        rememberChannel(command);
        props.onChoose(command, target);
        setPreview('');
    };
    useEffect(() => {
        if (isDirectedParleyChannel(props.command) && !props.target) show();
    }, [props.command, props.target]);
    useEffect(() => {
        if (!open || props.target || !isDirectedParleyChannel(props.command) || preview) return;
        previewChannel(props.command);
    }, [open, props.command, props.target, preview]);
    useEffect(() => {
        if (!open) return;
        const outside = (event: PointerEvent) => {
            const target = event.target;
            if (target instanceof Element && target.closest('.docked-input-form, .chat-communication-bar')) return;
            if (!anchorRef.current?.contains(target as Node) && !menuRef.current?.contains(target as Node)) close();
        };
        const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') { anchorRef.current?.querySelector('button')?.focus(); close(); } };
        document.addEventListener('pointerdown', outside);
        document.addEventListener('keydown', escape);
        window.addEventListener('resize', show);
        return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape); window.removeEventListener('resize', show); };
    }, [open]);
    useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
    useEffect(() => {
        try {
            localStorage.setItem(RECENT_CHANNELS_STORAGE_KEY, JSON.stringify(recentChannels));
        } catch {
            // Channel ordering still works for this session if storage is unavailable.
        }
    }, [recentChannels]);
    const recipients = preview === 'tell'
        ? [...(groupMembers?.length ? [{ key:'tell-group', label:'Group', value:'group', category:'cat-ally-remote' }] : []),
            ...getWhoPlayerNames(props.whoList).map(name => ({ key: name, label: name, value: name, category: 'cat-ally-remote' }))]
        : getRoomEntityMenuEntries(roomPlayers || [], roomNpcs || [], []).map(entry => ({ key: entry.id, label: entry.label, value: entry.context, category: entry.category }));
    return { anchorRef, menuRef, open, preview, position, orderedChannels, show, close, scheduleClose, cancelClose, previewChannel, choose, clearPreview: () => setPreview(''),
        recipients: recipients.filter(entry => entry.value.toLowerCase() !== characterName?.toLowerCase() && entry.label.toLowerCase() !== characterName?.toLowerCase()) };
}
