/** @file useMobileGroupControl.ts — Group menu and held-target interaction. */
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useGame } from '../context/GameContext';
import { useRoomEntitiesPanel } from './useRoomEntitiesPanel';
import { useDesktopHoverPreview } from './useDesktopHoverPreview';

// --- Interaction Section ---
export function useMobileGroupControl() {
    const game = useGame();
    const entities = useRoomEntitiesPanel();
    const [open, setOpen] = useState(false);
    const preview = useDesktopHoverPreview(game.viewport?.isMobile === false && !game.isSpectateMode);
    const visible = open || preview.open;
    const [heldTarget, setHeldTarget] = useState<string | null>(null);
    const [position, setPosition] = useState({ top: 0, left: 0 });
    const anchor = useRef<HTMLButtonElement>(null);
    const menu = useRef<HTMLDivElement>(null);
    const timer = useRef<number | undefined>(undefined);
    const held = useRef(false);
    const suppressClick = useRef(false);
    const target = useRef<string | null>(null);
    const select = (name: string) => {
        if (!game.isSpectateMode && name) {
            game.executeCommand(`group ${name}`);
            game.triggerHaptic(15);
        }
        setOpen(false);
        preview.clear();
    };
    const clear = () => { window.clearTimeout(timer.current); timer.current = undefined; };
    useEffect(() => () => clear(), []);
    useLayoutEffect(() => {
        if (!visible) return;
        const update = () => {
            const rect = anchor.current?.getBoundingClientRect();
            if (!rect || !menu.current) return;
            const portraitMobile = game.viewport?.isMobile === true && window.matchMedia('(orientation: portrait)').matches;
            setPosition({ top: Math.max(8, rect.top - menu.current.offsetHeight - 5), left: portraitMobile ? 8 : Math.max(8, Math.min(rect.left, window.innerWidth - menu.current.offsetWidth - 8)) });
        };
        update();
        window.addEventListener('resize', update);
        window.addEventListener('scroll', update, true);
        return () => { window.removeEventListener('resize', update); window.removeEventListener('scroll', update, true); };
    }, [visible, game.viewport?.isMobile]);
    useEffect(() => {
        if (!visible) return;
        const outside = (event: PointerEvent) => {
            if (!anchor.current?.contains(event.target as Node) && !menu.current?.contains(event.target as Node)) { setOpen(false); preview.clear(); }
        };
        const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') { setOpen(false); preview.clear(); } };
        document.addEventListener('pointerdown', outside);
        document.addEventListener('keydown', escape);
        return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape); };
    }, [visible, preview.clear]);
    const pointerDown = (event: React.PointerEvent<HTMLButtonElement>) => {
        if (game.isSpectateMode || event.button !== 0) return;
        suppressClick.current = false;
        held.current = false;
        target.current = null;
        event.currentTarget.setPointerCapture(event.pointerId);
        clear();
        timer.current = window.setTimeout(() => { held.current = true; setOpen(true); game.triggerHaptic(15); }, 220);
    };
    const pointerMove = (event: React.PointerEvent<HTMLButtonElement>) => {
        if (!held.current) return;
        const element = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>('[data-group-target]');
        const next = element?.dataset.groupTarget || null;
        if (next !== target.current) { target.current = next; setHeldTarget(next); if (next) game.triggerHaptic(15); }
    };
    const pointerEnd = (cancelled: boolean) => {
        clear();
        if (held.current) {
            suppressClick.current = true;
            if (!cancelled && target.current) select(target.current);
            else if (cancelled) { setOpen(false); preview.clear(); }
        }
        held.current = false;
        target.current = null;
        setHeldTarget(null);
    };
    const click = () => {
        if (suppressClick.current) { suppressClick.current = false; return; }
        if (!game.isSpectateMode) { setOpen(value => !value); preview.clear(); game.triggerHaptic(15); }
    };
    return { entities, open: visible, position, anchor, menu, heldTarget, select, pointerDown, pointerMove, pointerEnd, click,
        hoverEnter: preview.enter, hoverLeave: preview.leave, disabled: game.isSpectateMode };
}

