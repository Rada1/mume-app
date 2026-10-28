/** @file useParleyChannelMenu.ts — Hover channel selection followed by recipient selection. */
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import type { ParleyChannelChipProps } from '../types/commandChat';
import { useGame } from '../context/GameContext';
import { getRoomEntityMenuEntries } from '../objects/roomEntityMenuModel';
import { getWhoPlayerNames } from '../utils/chatWindowUtils';
import { menuVerticalPlacement } from '../utils/menuVerticalPlacement';
// --- Menu State Section ---
export const isDirectedParleyChannel = (command: string) => ['tell','whisper','ask'].includes(command);
const CHANNEL_MENU_WIDTH = 180;
const RECIPIENT_MENU_WIDTH = 220;
const MENU_EDGE_GUTTER = 8;

export function useParleyChannelMenu(props: ParleyChannelChipProps) {
    const { roomPlayers, roomNpcs, characterName, groupMembers } = useGame();
    const anchorRef = useRef<HTMLDivElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [open, setOpen] = useState(false);
    const [preview, setPreview] = useState('');
    const [position, setPosition] = useState<CSSProperties>({});
    const [recipientPosition, setRecipientPosition] = useState<CSSProperties>({});
    const cancelClose = () => { if (timer.current) clearTimeout(timer.current); };
    const close = () => { cancelClose(); setOpen(false); setPreview(''); };
    const scheduleClose = () => { cancelClose(); timer.current = setTimeout(close, 220); };
    const show = () => {
        if (props.disabled) return;
        cancelClose();
        const rect = anchorRef.current?.getBoundingClientRect();
        if (!rect) return;
        const availableWidth = Math.max(1, window.innerWidth - MENU_EDGE_GUTTER * 2);
        const channelWidth = Math.min(CHANNEL_MENU_WIDTH, availableWidth * 0.45);
        const recipientWidth = Math.min(RECIPIENT_MENU_WIDTH, availableWidth - channelWidth);
        const maxLeft = window.innerWidth - channelWidth - recipientWidth - MENU_EDGE_GUTTER;
        const left = Math.max(MENU_EDGE_GUTTER, Math.min(rect.right - channelWidth, maxLeft));
        setPosition({ left, width: channelWidth,
            ...menuVerticalPlacement(rect.top, rect.bottom, window.innerHeight) });
        setOpen(true);
    };
    const previewChannel = (command: string, element: HTMLElement) => {
        cancelClose();
        const rect = element.getBoundingClientRect();
        const channelLeft = typeof position.left === 'number' ? position.left : MENU_EDGE_GUTTER;
        const channelWidth = typeof position.width === 'number' ? position.width : CHANNEL_MENU_WIDTH;
        const recipientWidth = Math.min(RECIPIENT_MENU_WIDTH, Math.max(1, window.innerWidth - channelLeft - channelWidth - MENU_EDGE_GUTTER));
        setRecipientPosition({ left: channelLeft + channelWidth, width: recipientWidth,
            ...menuVerticalPlacement(rect.top, rect.bottom, window.innerHeight, true) });
        setPreview(command);
        if (command === 'tell' && preview !== 'tell') props.requestWhoList();
    };
    const choose = (command: ParleyChannelChipProps['command'], target: string | null = null) => {
        if (command === 'none' || (isDirectedParleyChannel(command) && !target)) return;
        props.onChoose(command, target);
        close();
    };
    useEffect(() => {
        if (isDirectedParleyChannel(props.command) && !props.target) show();
    }, [props.command, props.target]);
    useEffect(() => {
        if (!open || props.target || !isDirectedParleyChannel(props.command) || preview) return;
        const button = menuRef.current?.querySelector<HTMLElement>(`[data-channel="${props.command}"]`);
        if (button) previewChannel(props.command, button);
    }, [open, props.command, props.target, preview]);
    useEffect(() => {
        if (!open) return;
        const outside = (event: PointerEvent) => {
            if (!anchorRef.current?.contains(event.target as Node) && !menuRef.current?.contains(event.target as Node)) close();
        };
        const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') { anchorRef.current?.querySelector('button')?.focus(); close(); } };
        document.addEventListener('pointerdown', outside);
        document.addEventListener('keydown', escape);
        window.addEventListener('resize', close);
        return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape); window.removeEventListener('resize', close); };
    }, [open]);
    useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
    const recipients = preview === 'tell'
        ? [...(groupMembers?.length ? [{ key:'tell-group', label:'Group', value:'group', category:'cat-ally-remote' }] : []),
            ...getWhoPlayerNames(props.whoList).map(name => ({ key: name, label: name, value: name, category: 'cat-ally-remote' }))]
        : getRoomEntityMenuEntries(roomPlayers || [], roomNpcs || [], []).map(entry => ({ key: entry.id, label: entry.label, value: entry.context, category: entry.category }));
    return { anchorRef, menuRef, open, preview, position, recipientPosition, show, close, scheduleClose, cancelClose, previewChannel, choose,
        recipients: recipients.filter(entry => entry.value.toLowerCase() !== characterName?.toLowerCase() && entry.label.toLowerCase() !== characterName?.toLowerCase()) };
}
