/** @file DesktopShopPanel.tsx — Item-first desktop shop workspace. */
import React from 'react';
import { createPortal } from 'react-dom';
import type { useCommandTreeController } from '../../hooks/useCommandTreeController';
import { useDesktopShopWorkspace } from '../../hooks/useDesktopShopWorkspace';
import { useDesktopShopActionPopover } from '../../hooks/useDesktopShopActionPopover';
import { GearItemLabel } from '../GearItemLabel';
import { CommandShopStock } from './CommandShopStock';
import { CommandShopActions } from './CommandShopActions';
import { CapturedDetailsCard } from '../Popovers/StandardMenu/CapturedDetailsCard';
import './DesktopShopPanel.css';

// --- Render Section ---
export const DesktopShopPanel = ({ controller }: { controller: ReturnType<typeof useCommandTreeController> }) => {
    const { shop } = controller;
    const visible = shop.browsing && shop.available && controller.game.viewport?.isMobile === false;
    const workspace = useDesktopShopWorkspace(visible);
    const inlineReport = shop.outputVisible && (/^show\s/i.test(shop.pendingCommand || shop.completedCommand || '') || shop.outputTitle.includes(' ↔ '));
    const actions = useDesktopShopActionPopover(visible, Boolean(shop.pendingCommand) && !inlineReport);
    if (!visible || typeof document === 'undefined') return null;
    const target = document.getElementById('client-panel-shop-slot');
    if (!target) return null;
    const popupTarget = document.querySelector<HTMLElement>('.app-container') || document.body;
    const stock = { ...shop, browse: (command?: string) => {
        const first = shop.compareFirst; shop.browse(command); if (first) shop.setCompareFirst(first);
    } };
    const switchView = (view: 'stock' | 'gear') => {
        if (view === workspace.view) return;
        actions.close(); shop.setOutputOpen(false); workspace.setView(view);
    };
    return <>{createPortal(<aside className="desktop-shop-panel" aria-label="Shop panel">
        <header className="desktop-shop-heading"><strong>Shop</strong>
            <button type="button" aria-label="Close shop" onClick={shop.closeWorkspace}>×</button>
        </header>
        <nav className="desktop-shop-views" aria-label="Shop item sources">
            <button type="button" disabled={Boolean(shop.pendingCommand)} aria-pressed={workspace.view === 'stock'} onClick={() => switchView('stock')}>Shop inventory</button>
            <button type="button" disabled={Boolean(shop.pendingCommand)} aria-pressed={workspace.view === 'gear'} onClick={() => switchView('gear')}>Your inventory</button>
        </nav>
        {shop.compareFirst && <div className="desktop-shop-compare-hint" role="status">
            <span>Compare <strong>{shop.compareFirst.name}</strong> with another item in the shop or your inventory.</span>
            <button type="button" onClick={() => shop.setCompareFirst(null)}>Cancel</button>
        </div>}
        {shop.outputVisible && (!inlineReport || !actions.anchor) && <div className="desktop-shop-report"><CapturedDetailsCard shopLines={shop.outputLines}
            shopTitle={shop.outputTitle} isShopPending={Boolean(shop.pendingCommand)} /></div>}
        <div className="desktop-shop-content" onClick={event => {
            if (shop.pendingCommand || !(event.target instanceof Element)) return;
            const row = event.target.closest<HTMLElement>('.shop-item-row, .shop-variant-row, .desktop-shop-gear');
            if (!row || (event.target.closest('button') && !row.matches('button')) || row.matches(':disabled')) return;
            if (!shop.compareFirst) shop.setOutputOpen(false);
            actions.setAnchor(row);
        }}>
            {workspace.view === 'stock' ? <CommandShopStock shop={stock} open panel selectOnClick onOpenChange={() => undefined} />
                : <section aria-label="Your inventory items">
                        {controller.entries.filter(entry => entry.group === 'inventory').map(entry => <button type="button" key={entry.id} className="desktop-shop-gear"
                            disabled={Boolean(shop.pendingCommand)}
                            onClick={() => { if (!shop.tryCompare(entry)) controller.selectEntity(entry); }}>
                            {entry.gearRow ? <GearItemLabel row={entry.gearRow} category={entry.category} /> : entry.label}
                        </button>)}
                        {!controller.entries.some(entry => entry.group === 'inventory') && <p>{workspace.data.status.inventory === 'loading' ? 'Loading…' : 'No items available.'}</p>}
                    </section>}
        </div>
    </aside>, target)}
    {actions.anchor && createPortal(<div ref={actions.popoverRef} className="desktop-shop-action-popover" role="dialog" aria-label="Item actions"
        style={{ left: actions.position?.left ?? 0, top: actions.position?.top ?? 0, visibility: actions.position ? 'visible' : 'hidden' }}>
        <button type="button" className="desktop-shop-action-close" aria-label="Close item actions" onClick={actions.close}>×</button>
        <CommandShopActions shop={{ ...shop, showBrowse: false }} isHelpMode={controller.isHelpMode} onRequestHelp={controller.executeHelp} hideSyntax flat />
        {inlineReport && <CapturedDetailsCard shopLines={shop.outputLines} shopTitle={shop.outputTitle} isShopPending={Boolean(shop.pendingCommand)} />}
    </div>, popupTarget)}</>;
};
