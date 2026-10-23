/** @file useParleyChannelMenu.ts — Hover channel selection followed by recipient selection. */
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import type { ParleyChannelChipProps } from '../types/commandChat';
import { useGame } from '../context/GameContext';
import { getRoomEntityMenuEntries } from '../objects/roomEntityMenuModel';
import { getWhoPlayerNames } from '../utils/chatWindowUtils';
import { menuVerticalPlacement } from '../utils/menuVerticalPlacement';
// --- Menu State Section ---
export const isDirectedParleyChannel = (command: string) => ['tell','whisper','ask'].includes(command);
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
        setPosition({ left: Math.max(8, Math.min(rect.right - 180, window.innerWidth - 188)),
            ...menuVerticalPlacement(rect.top, rect.bottom, window.innerHeight) });
        setOpen(true);
    };
    const previewChannel = (command: string, element: HTMLElement) => {
        cancelClose();
        const rect = element.getBoundingClientRect();
        setRecipientPosition({ left: rect.left >= 228 ? rect.left - 220 : Math.min(window.innerWidth - 228, rect.right),
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
