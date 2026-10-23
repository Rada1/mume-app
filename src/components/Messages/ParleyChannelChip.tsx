/** @file ParleyChannelChip.tsx — Shared channel chip with cascading recipient menus. */
import React from 'react';
import { createPortal } from 'react-dom';
import type { ParleyChannelChipProps } from '../../types/commandChat';
import { CHAT_PARLEY_CHANNELS, getChatChannelColor } from '../../utils/chatWindowUtils';
import { useParleyChannelMenu, isDirectedParleyChannel } from '../../hooks/useParleyChannelMenu';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { getInlineGlowColor } from '../../utils/inlineActionModel';
import './ParleyChannelChip.css';
// --- Render Section ---
export const ParleyChannelChip: React.FC<ParleyChannelChipProps> = props => {
    const menu = useParleyChannelMenu(props);
    const settings = useSettingsStore();
    const color = getChatChannelColor(props.command);
    return <>
        <div ref={menu.anchorRef} className="docked-parley-chip parley-channel-chip" role="group" aria-label="Communication destination"
            onMouseEnter={menu.show} onMouseLeave={menu.scheduleClose} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget as Node) && !menu.menuRef.current?.contains(event.relatedTarget as Node)) menu.scheduleClose(); }}>
            <button type="button" className="parley-action" disabled={props.disabled} aria-haspopup="menu" aria-expanded={menu.open}
                onFocus={menu.show} onClick={menu.show} style={{ color }}>
                {props.command === 'group' ? 'tell group' : props.command}{isDirectedParleyChannel(props.command) && ` ${props.target || '…'}`}
            </button>
        </div>
        {menu.open && createPortal(<div ref={menu.menuRef} className="parley-branch-menus" onMouseEnter={menu.cancelClose} onMouseLeave={menu.scheduleClose}>
            <section className="parley-branch-menu" style={menu.position} aria-label="Communication channels" role="menu">
                <small>Channels</small>
                {CHAT_PARLEY_CHANNELS.filter(channel => channel !== 'group').map(channel => <button type="button" key={channel} role="menuitem" aria-haspopup={isDirectedParleyChannel(channel) ? 'menu' : undefined}
                    aria-expanded={isDirectedParleyChannel(channel) ? menu.preview === channel : undefined}
                    onMouseEnter={event => menu.previewChannel(channel, event.currentTarget)} onFocus={event => menu.previewChannel(channel, event.currentTarget)}
                    onKeyDown={event => { if (event.key === 'ArrowLeft' && isDirectedParleyChannel(channel)) { event.preventDefault(); menu.previewChannel(channel, event.currentTarget); requestAnimationFrame(() => menu.menuRef.current?.querySelector<HTMLButtonElement>('.parley-recipient-menu button')?.focus()); } }}
                    onClick={event => isDirectedParleyChannel(channel) ? menu.previewChannel(channel, event.currentTarget) : menu.choose(channel)}>
                    <span style={{ color: getChatChannelColor(channel) }}>{channel}</span>{isDirectedParleyChannel(channel) && <span aria-hidden="true">‹</span>}
                </button>)}
            </section>
            {isDirectedParleyChannel(menu.preview) && <section className="parley-branch-menu parley-recipient-menu" style={menu.recipientPosition} role="menu" aria-label={`${menu.preview} recipients`}
                onKeyDown={event => { if (event.key === 'ArrowRight') { event.preventDefault(); menu.menuRef.current?.querySelector<HTMLButtonElement>('button[aria-expanded="true"]')?.focus(); } }}>
                <small>{menu.preview === 'tell' ? 'Recipients' : 'Room entities'}</small>
                {menu.recipients.map(entry => <button type="button" role="menuitem" key={entry.key} onClick={() => menu.choose(menu.preview as ParleyChannelChipProps['command'], entry.value)}
                    style={{ color: getInlineGlowColor(entry.category, settings.inlineCategories, { player:settings.playerColor, ally:settings.playerColor, npc:settings.npcColor, enemy:settings.enemyColor, neutral:settings.neutralColor }, settings.theme) }} title={entry.label}>{entry.label}</button>)}
                {!menu.recipients.length && <p>No recipients available.</p>}
            </section>}
        </div>, document.body)}
    </>;
};
