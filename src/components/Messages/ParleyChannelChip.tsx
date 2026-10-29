/** @file ParleyChannelChip.tsx — Shared channel chip with cascading recipient menus. */
import React from 'react';
import { createPortal } from 'react-dom';
import { MessageCircle } from 'lucide-react';
import type { ParleyChannelChipProps } from '../../types/commandChat';
import { CHAT_PARLEY_CHANNELS, getChatChannelColor } from '../../utils/chatWindowUtils';
import { useParleyChannelMenu, isDirectedParleyChannel } from '../../hooks/useParleyChannelMenu';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { getInlineGlowColor } from '../../utils/inlineActionModel';
import { ParleyHistory } from './ParleyHistory';
import { useGame } from '../../context/GameContext';
import { useParleyMobileBounds } from '../../hooks/useParleyMobileBounds';
import './ParleyChannelChip.css';
// --- Render Section ---
export const ParleyChannelChip: React.FC<ParleyChannelChipProps> = props => {
    const menu = useParleyChannelMenu(props);
    const settings = useSettingsStore();
    const { viewport } = useGame();
    const mobileBounds = useParleyMobileBounds(menu.open, Boolean(viewport?.isMobile), Boolean(viewport?.isLandscape));
    const color = getChatChannelColor(props.command);
    return <>
        <div ref={menu.anchorRef} className={`docked-parley-chip parley-channel-chip${props.iconOnly ? ' is-chat-icon' : ''}`} role="group" aria-label="Communication destination">
            <button type="button" className="parley-action" disabled={props.disabled} aria-haspopup="dialog" aria-expanded={menu.open}
                aria-label={props.iconOnly ? 'Choose chat channel' : `Chat channel: ${props.command}${props.target ? ` ${props.target}` : ''}`}
                title={props.iconOnly ? 'Choose chat channel' : 'Change chat channel'}
                onClick={menu.open ? menu.close : menu.show} style={props.iconOnly ? undefined : { color }}>
                {props.iconOnly ? <MessageCircle size={16} aria-hidden="true" /> : <>{props.command === 'group' ? 'tell group' : props.command}{isDirectedParleyChannel(props.command) && ` ${props.target || '…'}`}</>}
            </button>
            {!props.iconOnly && props.onClear && <button type="button" className="parley-clear" aria-label="Return to command input" onClick={() => { menu.close(); props.onClear?.(); }}>×</button>}
        </div>
        {menu.open && (!viewport?.isMobile || mobileBounds) && createPortal(<div ref={menu.menuRef} className={`parley-communication-popover${viewport?.isMobile ? ' is-mobile' : ''}${mobileBounds?.landscape ? ' is-split' : ''}`} style={mobileBounds ? (mobileBounds.landscape ? {} : mobileBounds.channels) : menu.position} role="dialog" aria-label="Communication">
            <section className="parley-branch-menu" style={mobileBounds?.landscape ? mobileBounds.channels : undefined} aria-label={isDirectedParleyChannel(menu.preview) ? `${menu.preview} recipients` : 'Communication channels'}>
                {isDirectedParleyChannel(menu.preview) ? <>
                    <button type="button" className="parley-back" onClick={menu.clearPreview}>‹ Channels</button>
                    {menu.recipients.map(entry => <button type="button" key={entry.key} onClick={() => menu.choose(menu.preview as ParleyChannelChipProps['command'], entry.value)}
                        style={{ color: getInlineGlowColor(entry.category, settings.inlineCategories, { player:settings.playerColor, ally:settings.playerColor, npc:settings.npcColor, enemy:settings.enemyColor, neutral:settings.neutralColor }, settings.theme) }} title={entry.label}>{entry.label}</button>)}
                    {!menu.recipients.length && <p>No recipients available.</p>}
                </> : <>
                {CHAT_PARLEY_CHANNELS.filter(channel => channel !== 'group').map(channel => <button type="button" key={channel}
                    aria-pressed={props.command === channel}
                    className={['whisper', 'yell', 'narrate', 'pray'].includes(channel) ? 'parley-channel-group-start' : undefined}
                    data-channel={channel}
                    onClick={() => isDirectedParleyChannel(channel) ? menu.previewChannel(channel) : menu.choose(channel)}>
                    <span style={{ color: getChatChannelColor(channel) }}>{channel}</span>{isDirectedParleyChannel(channel) && <span aria-hidden="true">›</span>}
                </button>)}
                </>}
            </section>
            <ParleyHistory onClose={menu.close} onReply={reply => { menu.clearPreview(); props.onChoose(reply.command, reply.target); }} style={mobileBounds?.landscape ? mobileBounds.history : undefined} />
        </div>, document.body)}
    </>;
};
