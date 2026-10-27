/** @file useClientChromeMenu.ts — Synchronizes and positions the shared client menu. */
import { useEffect, useLayoutEffect, useRef } from 'react';
import { useUI } from '../context/GameContext';

// --- Menu lifetime and placement ---
export const useClientChromeMenu = () => {
    const { ui, setUI } = useUI();
    const buttonRef = useRef<HTMLButtonElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const setOpen = (open: boolean) => setUI(previous => ({ ...previous, isMenuOpen: open, menuView: 'main' }));
    useLayoutEffect(() => {
        const menu = menuRef.current;
        if (!menu) return;
        if (!ui.isMenuOpen) {
            if (menu.matches(':popover-open')) menu.hidePopover();
            return;
        }
        menu.showPopover();
        const place = () => {
            const anchor = buttonRef.current?.getBoundingClientRect();
            if (!anchor) return;
            const viewport = window.visualViewport;
            const left = (viewport?.offsetLeft ?? 0) + 8;
            const top = (viewport?.offsetTop ?? 0) + 8;
            const right = left + (viewport?.width ?? window.innerWidth) - 16;
            const bottom = top + (viewport?.height ?? window.innerHeight) - 16;
            const y = Math.max(top, Math.min(anchor.bottom + 4, bottom - 80));
            menu.style.left = `${Math.max(left, Math.min(anchor.right - menu.offsetWidth, right - menu.offsetWidth))}px`;
            menu.style.top = `${y}px`;
            menu.style.maxHeight = `${Math.max(60, bottom - y)}px`;
        };
        place();
        window.addEventListener('resize', place);
        window.visualViewport?.addEventListener('resize', place);
        window.visualViewport?.addEventListener('scroll', place);
        return () => {
            window.removeEventListener('resize', place);
            window.visualViewport?.removeEventListener('resize', place);
            window.visualViewport?.removeEventListener('scroll', place);
        };
    }, [ui.isMenuOpen]);
    useEffect(() => {
        const onKey = (event: KeyboardEvent) => {
            if (event.key !== 'Escape' || event.defaultPrevented) return;
            const expandedTime = document.querySelector<HTMLDetailsElement>('.client-time-control[open]');
            if (expandedTime) {
                event.preventDefault();
                expandedTime.open = false;
                expandedTime.querySelector('summary')?.focus();
                return;
            }
            const target = event.target;
            if (target instanceof HTMLElement && target.closest('input, textarea, [contenteditable="true"]')) return;
            event.preventDefault();
            setUI(previous => ({ ...previous, isMenuOpen: !previous.isMenuOpen, menuView: 'main' }));
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [setUI]);
    return { buttonRef, menuRef, isOpen: ui.isMenuOpen, setOpen };
};
