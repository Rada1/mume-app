/** @file Header.tsx — Space-free time and menu controls over the game log. */
import React, { useId } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, MoreVertical, RefreshCw } from 'lucide-react';
import { useGame } from '../../context/GameContext';
import { useClientChromeMenu } from '../../hooks/useClientChromeMenu';
import { MobileHeaderTime } from './MobileHeaderTime';
import { HeaderEnvironmentStrip } from './HeaderEnvironmentStrip';
import { ClientPanelMenu } from './ClientPanelMenu';
import { ClientSettingsMenu } from './ClientSettingsMenu';
import './ClientChrome.css';

// --- Compact client controls ---
const Header: React.FC = () => {
    const { gameState, sessionMode, status, telnet } = useGame();
    const menu = useClientChromeMenu();
    const menuId = useId();
    const playing = gameState !== 'account' || sessionMode === 'replay';
    const close = () => menu.setOpen(false);
    return <div className="client-chrome" aria-label="Client controls">
        {playing && <details className="client-time-control">
            <summary className="client-time-chip" aria-label="Time and environment details">
                <MobileHeaderTime />
                <ChevronDown className="client-time-chevron" size={12} strokeWidth={1.5} aria-hidden="true" />
            </summary>
            <div className="client-time-expanded">
                <MobileHeaderTime expanded showTime={false} />
                <HeaderEnvironmentStrip showTime={false} />
            </div>
        </details>}
        <button ref={menu.buttonRef} type="button" className="client-menu-trigger" aria-label="Client menu"
            aria-haspopup="dialog" aria-expanded={menu.isOpen} aria-controls={menuId}
            onClick={() => menu.setOpen(!menu.isOpen)}><MoreVertical size={19} /></button>
        {createPortal(<div ref={menu.menuRef} id={menuId} popover="auto" className="client-menu-popover"
            role="dialog" aria-label="Client menu"
            onToggle={event => { if (event.newState === 'closed' && menu.isOpen) menu.setOpen(false); }}>
            <div className="client-menu-heading"><strong>Client menu</strong><button type="button" onClick={close} aria-label="Close client menu">×</button></div>
            {status === 'disconnected' && <button type="button" className="client-reconnect" onClick={() => { telnet.connect(); close(); }}><RefreshCw size={16} />Reconnect</button>}
            {playing && <ClientPanelMenu close={close} />}
            <ClientSettingsMenu close={close} />
        </div>, document.body)}
    </div>;
};
export default React.memo(Header);
