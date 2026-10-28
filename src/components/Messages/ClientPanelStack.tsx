/** @file ClientPanelStack.tsx — A reserved desktop column for entities, chat, actions, and details. */

import React from 'react';
import ChatWindow from './ChatTranscriptWindow';
import GroupStatusWindow from './GroupStatusWindow';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { useClientPanelStackStore } from '../../stores/useClientPanelStackStore';
import type { ClientPanelStackId } from '../../types/clientPanelStack';
import { ClientPanelStackResizeHandle } from './ClientPanelStackResizeHandle';
import { DrawerResizeHandle } from '../Drawers/DrawerResizeHandle';
import { useHelpStore } from '../../stores/useHelpStore';
import { useUIStore } from '../../stores/useUIStore';
import { isDesktopTargetWorkspaceRequest } from '../../utils/popoverPanelUtils';
const HelpPanel = React.lazy(() => import('../Help/HelpPanel'));

// --- Logic Section ---
export const ClientPanelStack: React.FC<{ mobileDetailsOnly?: boolean }> = ({ mobileDetailsOnly = false }) => {
    const showGroupPanel = useSettingsStore(state => state.showGroupPanel);
    const showChatWindow = useSettingsStore(state => state.showChatWindow);
    const showHelpPanel = useHelpStore(state => state.isOpen);
    const order = useClientPanelStackStore(state => state.order);
    const weights = useClientPanelStackStore(state => state.weights);
    const singleHeights = useClientPanelStackStore(state => state.singleHeights);
    const mobileDetailsHeight = useClientPanelStackStore(state => state.mobileDetailsHeight);
    const detailsOpen = useClientPanelStackStore(state => state.detailsOpen);
    const detailsEnabled = useClientPanelStackStore(state => state.detailsEnabled);
    const setDetailsEnabled = useClientPanelStackStore(state => state.setDetailsEnabled);
    const movePanel = useClientPanelStackStore(state => state.movePanel);
    const popoverState = useUIStore(state => state.popoverState);
    const inlineActionsOpen = Boolean(popoverState?.entityId && popoverState.sourceRect
        && !popoverState.commandPanelCapture && (!popoverState.type || popoverState.type === 'menu')
        && popoverState.menuDisplay !== 'dial' && !isDesktopTargetWorkspaceRequest(popoverState));

    const isVisible = (panel: ClientPanelStackId) => mobileDetailsOnly
        ? panel === 'details' && detailsEnabled && detailsOpen
        : panel === 'entities'
            ? showGroupPanel
            : panel === 'chat'
                ? showChatWindow
                : panel === 'actions'
                    ? inlineActionsOpen
                    : panel === 'help' ? showHelpPanel : detailsEnabled;
    const visiblePanels = order.filter(isVisible);
    const isSingle = visiblePanels.length === 1;
    const singleRatio = isSingle && visiblePanels[0]
        ? mobileDetailsOnly ? mobileDetailsHeight : (singleHeights?.[visiblePanels[0]] ?? 1)
        : 1;

    const startReorder = (panel: ClientPanelStackId, event: React.DragEvent<HTMLDivElement>) => {
        if (!(event.target as HTMLElement).closest('[data-client-panel-drag-handle]')) {
            event.preventDefault();
            return;
        }
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/client-panel', panel);
    };

    const dropReorder = (panel: ClientPanelStackId, event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        const source = event.dataTransfer.getData('text/client-panel') as ClientPanelStackId;
        if (order.includes(source)) {
            const before = event.clientY < event.currentTarget.getBoundingClientRect().top + event.currentTarget.offsetHeight / 2;
            movePanel(source, panel, before);
        }
    };

    const reorderByKeyboard = (panel: ClientPanelStackId, event: React.KeyboardEvent<HTMLDivElement>) => {
        if (!(event.target as HTMLElement).closest('[data-client-panel-drag-handle]')) return;
        if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
        event.preventDefault();
        const position = order.indexOf(panel);
        const target = order[position + (event.key === 'ArrowUp' ? -1 : 1)];
        if (target) movePanel(panel, target, event.key === 'ArrowUp');
    };

    // --- Render Section ---
    return (
        <aside
            className="client-panels-stack"
            data-active={visiblePanels.length > 0}
            data-mobile-details-only={mobileDetailsOnly ? 'true' : undefined}
            data-overlay-panel-open={showHelpPanel || showChatWindow ? 'true' : undefined}
            data-single-panel={isSingle ? 'true' : undefined}
            style={{
                '--client-single-panel-height': isSingle ? `${Math.round(singleRatio * 1000) / 10}%` : '100%',
                '--client-mobile-details-height': mobileDetailsOnly
                    ? `calc(${Math.round(singleRatio * 1000) / 10}dvh + ${Math.round((1 - singleRatio) * 12 * 10) / 10}px)`
                    : undefined
            } as React.CSSProperties}
            aria-label={mobileDetailsOnly ? 'Details panel' : 'Entities, chat, inline actions, details, and help'}
        >
            {!mobileDetailsOnly && <DrawerResizeHandle
                handleType="left"
                widthVar="--desktop-client-panels-width"
                label="Resize entities, chat, inline actions, details, and help panel width"
                minWidthPx={220}
                maxWidth={50}
            />}
            {order.map((panel, index) => {
                const visible = isVisible(panel);
                const nextPanel = order.slice(index + 1).find(isVisible);
                const isSinglePanel = isSingle && visible;
                const slotStyle: React.CSSProperties = isSinglePanel
                    ? mobileDetailsOnly ? {
                        display: 'flex',
                        flex: '0 0 auto',
                        height: 'calc(100% - 12px)',
                        maxHeight: 'calc(100% - 12px)'
                    } : {
                        display: 'flex',
                        flex: '0 0 auto',
                        height: singleRatio < 1 ? `calc(${Math.round(singleRatio * 1000) / 10}% - 12px)` : 'calc(100% - 12px)',
                        maxHeight: 'calc(100% - 12px)'
                    }
                    : {
                        display: visible ? 'flex' : 'none',
                        flexGrow: weights[panel]
                    };

                return (
                    <React.Fragment key={panel}>
                        <div
                            className={`client-panel-stack-slot client-panel-stack-slot--${panel}`}
                            data-client-panel-id={panel}
                            data-inline-actions-slot={panel === 'actions' ? 'true' : undefined}
                            id={panel === 'actions'
                                ? 'client-panel-inline-actions-slot'
                                : panel === 'details'
                                    ? mobileDetailsOnly ? 'client-panel-mobile-details-slot' : 'client-panel-details-slot'
                                    : undefined}
                            data-active={visible}
                            style={slotStyle}
                            onDragStart={event => startReorder(panel, event)}
                            onDragOver={event => event.preventDefault()}
                            onDrop={event => dropReorder(panel, event)}
                            onKeyDown={event => reorderByKeyboard(panel, event)}
                        >
                            {panel === 'entities' && visible && <GroupStatusWindow stacked />}
                            {panel === 'chat' && visible && <ChatWindow stacked />}
                            {panel === 'help' && visible && <React.Suspense fallback={<p>Loading help…</p>}><HelpPanel stacked /></React.Suspense>}
                            {panel === 'details' && visible && !detailsOpen && <div className="client-panel-stack-empty">
                                <header className="popover-inspection-panel-heading"><span>Details</span>
                                    <button type="button" aria-label="Close details panel" onClick={() => setDetailsEnabled(false)}>×</button>
                                </header>
                                <p>Command details appear here.</p>
                            </div>}
                            {!mobileDetailsOnly && <span
                                className="client-panel-stack-drag-handle"
                                data-client-panel-drag-handle
                                draggable
                                role="button"
                                tabIndex={0}
                                aria-label={`Reorder ${panel} panel`}
                                title="Drag to reorder panels; use arrow keys when focused"
                            >
                                ⋮⋮
                            </span>}
                        </div>
                        {visible && (nextPanel || isSingle) && (
                            <ClientPanelStackResizeHandle
                                firstPanel={panel}
                                secondPanel={nextPanel}
                                mobileDetailsOnly={mobileDetailsOnly}
                            />
                        )}
                    </React.Fragment>
                );
            })}
        </aside>
    );
};
