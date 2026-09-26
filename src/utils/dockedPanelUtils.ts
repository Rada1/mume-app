/**
 * @file dockedPanelUtils.ts
 * @description Coordinates desktop sliding dock panels and calculates dynamic right-offsets.
 */

export type DockedPanelId = 'commands' | 'chat' | 'shop' | 'players' | 'gear' | 'help' | 'archive' | 'editor';

export const DOCKED_PANEL_ORDER: readonly DockedPanelId[] = [
    'editor', 'archive', 'shop', 'gear', 'players', 'help', 'chat', 'commands'
] as const;

export const PANEL_WIDTH_VARS: Record<DockedPanelId, string> = {
    commands: '--desktop-character-width',
    chat: '--desktop-chat-width',
    shop: '--desktop-shop-width',
    players: '--desktop-players-width',
    gear: '--desktop-gear-width',
    help: '--desktop-help-width',
    archive: '--desktop-archive-width',
    editor: '--desktop-editor-width'
};

export const PANEL_DEFAULT_WIDTHS: Record<DockedPanelId, string> = {
    commands: '260px',
    chat: '24vw',
    shop: '30vw',
    players: '24vw',
    gear: '30vw',
    help: '28vw',
    archive: '34vw',
    editor: '32vw'
};

export function getDockedWidth(panelId: DockedPanelId): string {
    return `var(${PANEL_WIDTH_VARS[panelId]}, ${PANEL_DEFAULT_WIDTHS[panelId]})`;
}

/**
 * Computes CSS `right` offset for a docked panel based on panels to its right.
 */
export function computeDockedRight(
    panelId: DockedPanelId,
    activePanels: readonly DockedPanelId[]
): string {
    const idx = activePanels.indexOf(panelId);
    if (idx <= 0) return '0px';

    const parts: string[] = [];
    for (let i = 0; i < idx; i++) {
        parts.push(getDockedWidth(activePanels[i]));
    }

    return `calc(${parts.join(' + ')})`;
}

/**
 * Height for mobile sliding panels opening from header tabs: full height from header down to bottom inset.
 */
export const MOBILE_DOCKED_HEIGHT = 'calc(100dvh - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px) - 62px)';

/**
 * Returns mobile panel height for sliding header panels.
 */
export function getMobilePanelHeight(_totalActivePanels: number = 1): string {
    return MOBILE_DOCKED_HEIGHT;
}

/**
 * Computes CSS `top` offset for a docked panel on mobile.
 */
export function computeDockedTop(
    _panelId: DockedPanelId,
    _activePanels: readonly DockedPanelId[]
): string {
    return 'calc(env(safe-area-inset-top, 0px) + 50px)';
}

/**
 * Computes complete inline style for a docked panel on desktop or mobile.
 */
export function computeDockedPanelStyle(
    panelId: DockedPanelId,
    activePanels: readonly DockedPanelId[],
    isMobile: boolean
): React.CSSProperties {
    if (isMobile) {
        const idx = activePanels.indexOf(panelId);
        const mobileHeight = getMobilePanelHeight(activePanels.length);
        return {
            top: computeDockedTop(panelId, activePanels),
            left: '8px',
            right: '8px',
            width: 'calc(100% - 16px)',
            maxWidth: 'none',
            minWidth: '0',
            height: `var(--mobile-docked-height, ${mobileHeight})`,
            bottom: 'calc(env(safe-area-inset-bottom, 0px) + 10px)',
            zIndex: 60000 + Math.max(0, idx)
        };
    }

    return {
        right: computeDockedRight(panelId, activePanels),
        top: 'calc(env(safe-area-inset-top, 0px) + 52px)',
        bottom: 'calc(env(safe-area-inset-bottom, 0px) + 10px)'
    };
}
