/**
 * @file dockedPanelUtils.ts
 * @description Coordinates desktop sliding dock panels and calculates dynamic right-offsets.
 */

export type DockedPanelId = 'commands' | 'chat' | 'shop' | 'players' | 'help' | 'archive' | 'editor';

export const DOCKED_PANEL_ORDER: readonly DockedPanelId[] = [
    'editor', 'archive', 'shop', 'players', 'help', 'chat', 'commands'
] as const;

export const PANEL_WIDTH_VARS: Record<DockedPanelId, string> = {
    commands: '--desktop-character-width',
    chat: '--desktop-chat-width',
    shop: '--desktop-shop-width',
    players: '--desktop-players-width',
    help: '--desktop-help-width',
    archive: '--desktop-archive-width',
    editor: '--desktop-editor-width'
};

export const PANEL_DEFAULT_WIDTHS: Record<DockedPanelId, string> = {
    commands: '260px',
    chat: '24vw',
    shop: '30vw',
    players: '24vw',
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
 * Returns dynamic mobile panel height depending on how many panels are open simultaneously.
 */
export function getMobilePanelHeight(totalActivePanels: number): string {
    if (totalActivePanels >= 3) return '24vh';
    if (totalActivePanels === 2) return '30vh';
    return '38vh';
}

/**
 * Computes CSS `top` offset for a docked panel on mobile, stacking downward from the top.
 */
export function computeDockedTop(
    panelId: DockedPanelId,
    activePanels: readonly DockedPanelId[]
): string {
    const idx = activePanels.indexOf(panelId);
    const baseTop = 'calc(env(safe-area-inset-top, 0px) + 50px)';
    if (idx <= 0) return baseTop;

    const heightVal = getMobilePanelHeight(activePanels.length);
    return `calc(${baseTop} + ${idx} * (var(--mobile-docked-height, ${heightVal}) + 8px))`;
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
        const mobileHeight = getMobilePanelHeight(activePanels.length);
        return {
            top: computeDockedTop(panelId, activePanels),
            left: '8px',
            right: '8px',
            width: 'calc(100% - 16px)',
            maxWidth: 'none',
            minWidth: '0',
            height: `var(--mobile-docked-height, ${mobileHeight})`,
            bottom: 'auto'
        };
    }

    return {
        right: computeDockedRight(panelId, activePanels),
        top: 'calc(env(safe-area-inset-top, 0px) + 52px)',
        bottom: 'calc(env(safe-area-inset-bottom, 0px) + 10px)'
    };
}
