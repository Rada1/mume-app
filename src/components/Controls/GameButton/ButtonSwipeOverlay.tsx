/**
 * @file ButtonSwipeOverlay.tsx
 * @description Renders swipe-wheel action previews for held game buttons.
 */

import React from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeftRight, X } from 'lucide-react';
import { CustomButton, SwipeDirection } from '../../../types';
import { useSettingsStore } from '../../../stores/useSettingsStore';
import { getButtonSwipeCommandTextColor } from '../../../utils/swipeCommandColors';
import { TacticalCommandPalette, type TacticalPaletteCommand, type TacticalSwapCell } from './TacticalCommandPalette';
import { SwipeWheelCellControls } from './SwipeWheelCellControls';
import { SwipeWheelGrid } from './SwipeWheelGrid';
import './ButtonSwipeOverlay.css';

interface ButtonSwipeOverlayProps {
    button: CustomButton;
    activeDir: SwipeDirection | 'center' | null;
    isCancelling: boolean;
    isPinned: boolean;
    swapSource?: TacticalSwapCell | null;
    isSwapMode?: boolean;
    onSelectSwapCell?: (cell: TacticalSwapCell) => void;
    hoveredPanelTool?: 'add' | 'delete' | 'swap' | null;
    isChoosingRebindSlot: boolean;
    rebindDirection: SwipeDirection | 'center' | null;
    onSelectRebindSlot: (direction: SwipeDirection | 'center') => void;
    buttonRect?: DOMRect;
    rayParams: { angle: number, length: number, opacity: number, color?: string };
    isMobile?: boolean;
    isTargetMenuVisible?: boolean;
    getCommandTargetGlowColor?: (command: string) => string | null;
    getCommandLearnedState?: (command: string) => boolean | undefined;
    activeCommand?: string;
    pendingCommandPrefix?: string | null;
    targetMenu?: React.ReactNode;
    paletteCommands?: TacticalPaletteCommand[];
    onStartCreatingCustomSwipeCell?: () => void;
    onDeleteCustomSwipeAction?: (command: string, direction?: SwipeDirection) => boolean;
    isDeletingCustomCell?: boolean;
    onDeleteModeChange?: (active: boolean) => void;
    onSwipeToolTap?: () => void;
    onClose: () => void;
    onSwapCells?: () => void;
    onPinnedPointerDown?: React.PointerEventHandler<HTMLElement>;
    onPinnedPointerMove?: React.PointerEventHandler<HTMLElement>;
    onPinnedPointerUp?: React.PointerEventHandler<HTMLElement>;
    onPinnedPointerCancel?: React.PointerEventHandler<HTMLElement>;
    onPalettePointerDown?: React.PointerEventHandler<HTMLElement>;
    onPalettePointerMove?: React.PointerEventHandler<HTMLElement>;
    onPalettePointerUp?: React.PointerEventHandler<HTMLElement>;
    onPalettePointerCancel?: React.PointerEventHandler<HTMLElement>;
    hidePreviewWheel?: boolean;
}

const colorToRgb = (colorVal: string | undefined, defaultVal: string) => {
    if (!colorVal || colorVal.startsWith('var(')) return defaultVal;
    const rgbMatch = colorVal.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
    if (rgbMatch) return `${rgbMatch[1]}, ${rgbMatch[2]}, ${rgbMatch[3]}`;

    const hex = colorVal.replace('#', '').trim();
    const fullHex = hex.length === 3
        ? hex.split('').map(ch => ch + ch).join('')
        : hex;
    if (fullHex.length < 6) return defaultVal;

    const r = parseInt(fullHex.substring(0, 2), 16);
    const g = parseInt(fullHex.substring(2, 4), 16);
    const b = parseInt(fullHex.substring(4, 6), 16);
    return !isNaN(r) && !isNaN(g) && !isNaN(b) ? `${r}, ${g}, ${b}` : defaultVal;
};

export const ButtonSwipeOverlay: React.FC<ButtonSwipeOverlayProps> = ({ button, activeDir, isCancelling, isPinned, swapSource = null, isSwapMode = false, onSelectSwapCell, hoveredPanelTool = null, isChoosingRebindSlot, rebindDirection, onSelectRebindSlot, isTargetMenuVisible = false, getCommandTargetGlowColor, getCommandLearnedState, activeCommand, pendingCommandPrefix, targetMenu, paletteCommands = [], onStartCreatingCustomSwipeCell, onDeleteCustomSwipeAction, isDeletingCustomCell = false, onDeleteModeChange, onSwipeToolTap, onClose, onSwapCells, onPinnedPointerDown, onPinnedPointerMove, onPinnedPointerUp, onPinnedPointerCancel, onPalettePointerDown, onPalettePointerMove, onPalettePointerUp, onPalettePointerCancel }) => {
    const swapTapPointerRef = React.useRef<number | null>(null);
    const useTacticalPanelBlur = useSettingsStore(state => state.useTacticalPanelBlur);

    if (!isTargetMenuVisible || !targetMenu) return null;

    const wheelAccent = button.style.borderColor || button.style.backgroundColor || 'var(--set-accent, var(--accent))';
    const wheelAccentRgb = colorToRgb(wheelAccent, 'var(--set-accent-rgb, var(--accent-rgb))');
    const centerCommand = button.command;
    const normalizedActiveCommand = activeCommand?.trim().toLowerCase() || '';
    const configuredDirection = Object.entries({ ...(button.longSwipeCommands || {}), ...(button.swipeCommands || {}) }).find(([, command]) => {
        const normalizedSwipeCommand = command?.trim().toLowerCase() || '';
        return normalizedActiveCommand === normalizedSwipeCommand || normalizedActiveCommand.startsWith(`${normalizedSwipeCommand} `);
    })?.[0] as SwipeDirection | undefined;
    const normalizedCenterCommand = centerCommand.trim().toLowerCase();
    const isCenterCommand = Boolean(normalizedCenterCommand && (
        normalizedActiveCommand === normalizedCenterCommand
        || normalizedActiveCommand.startsWith(`${normalizedCenterCommand} `)
    ));
    const displayDirection = isSwapMode || hoveredPanelTool || isCancelling
        ? null
        : isChoosingRebindSlot
            ? rebindDirection
            : rebindDirection || activeDir || (isCenterCommand ? 'center' : configuredDirection || null);
    const wheelGrid = <SwipeWheelGrid
        button={button}
        displayDirection={displayDirection}
        swapSource={swapSource}
        isSwapMode={isSwapMode}
        isDeletingCustomCell={isDeletingCustomCell}
        isChoosingRebindSlot={isChoosingRebindSlot}
        rebindDirection={rebindDirection}
        isPinned={isPinned}
        onPinnedPointerDown={onPinnedPointerDown}
        onPinnedPointerMove={onPinnedPointerMove}
        onPinnedPointerUp={onPinnedPointerUp}
        onPinnedPointerCancel={onPinnedPointerCancel}
        getCommandTargetGlowColor={getCommandTargetGlowColor}
        getCommandLearnedState={getCommandLearnedState}
        onDeleteCustomSwipeAction={onDeleteCustomSwipeAction}
        onDeleteComplete={() => onDeleteModeChange?.(false)}
        onSelectSwapCell={cell => onSelectSwapCell?.(cell)}
        onSelectRebindSlot={onSelectRebindSlot}
    />;
    const wheelContent = onStartCreatingCustomSwipeCell && onDeleteCustomSwipeAction
        ? <SwipeWheelCellControls
            isDeleteMode={isDeletingCustomCell}
            onDeleteModeChange={active => onDeleteModeChange?.(active)}
            onStartCreatingCell={onStartCreatingCustomSwipeCell}
            onToolTap={() => onSwipeToolTap?.()}
            hoveredPanelTool={hoveredPanelTool}
        >{wheelGrid}</SwipeWheelCellControls>
        : wheelGrid;
    return createPortal(
        <div style={{
            position: 'fixed',
            inset: 0,
            pointerEvents: 'none',
            zIndex: 60000,
            '--set-accent': wheelAccent,
            '--set-accent-rgb': wheelAccentRgb
        } as React.CSSProperties}>
            <div
                className={`unified-tactical-surface${useTacticalPanelBlur ? ' has-blurred-background' : ''}`}
                onPointerDown={event => event.stopPropagation()}
                onPointerUp={event => event.stopPropagation()}
                onPointerCancel={event => event.stopPropagation()}
            >
                {pendingCommandPrefix && <div className="tactical-command-prefix-banner" role="status">ORDER FOLLOWERS · NEXT ACTION</div>}
                <section
                    className="unified-tactical-wheel unified-tactical-panel-wheel"
                    aria-label="Swipe command wheel"
                >
                    <div className={`unified-tactical-panel-scroll${isSwapMode ? ' is-swap-mode' : ''}`}>
                        {isSwapMode && <div className="tactical-swap-hint" role="status">
                            {swapSource
                                ? 'First cell selected · scroll to the second cell'
                                : 'Tap a cell to start · scroll to find the other cell'}
                        </div>}
                        {wheelContent}
                        <TacticalCommandPalette
                            commands={paletteCommands}
                            activeCommand={activeCommand || ''}
                            getCommandTargetGlowColor={getCommandTargetGlowColor}
                            getCommandTextColor={command => getButtonSwipeCommandTextColor(button, command)}
                            isDeletingCustomCell={isDeletingCustomCell}
                            isSwapMode={isSwapMode}
                            onSelectSwapCell={onSelectSwapCell}
                            onDeleteCustomCell={command => {
                                if (onDeleteCustomSwipeAction?.(command)) onDeleteModeChange?.(false);
                            }}
                            swapSourceCommand={swapSource?.kind === 'palette' ? swapSource.command : null}
                            onPointerDown={isPinned ? onPalettePointerDown : undefined}
                            onPointerMove={isPinned ? onPalettePointerMove : undefined}
                            onPointerUp={isPinned ? onPalettePointerUp : undefined}
                            onPointerCancel={isPinned ? onPalettePointerCancel : undefined}
                        />
                    </div>
                    <div
                        className="unified-tactical-panel-actions"
                        aria-label="Decision panel controls"
                        onPointerDown={event => event.stopPropagation()}
                        onPointerUp={event => event.stopPropagation()}
                    >
                        <button
                            type="button"
                            className={`unified-tactical-panel-action is-swap${isSwapMode || swapSource ? ' is-active' : ''}${hoveredPanelTool === 'swap' ? ' is-pointer-selected' : ''}`}
                            data-panel-tool="swap"
                            aria-label={isSwapMode ? 'Cancel swap mode' : 'Select two cells to swap'}
                            title={isSwapMode ? 'Tap another cell to swap, or tap again to cancel' : 'Tap to choose two cells to swap'}
                            aria-pressed={isSwapMode}
                            onPointerDown={event => {
                                event.stopPropagation();
                                swapTapPointerRef.current = event.pointerId;
                            }}
                            onPointerUp={event => {
                                event.stopPropagation();
                                if (swapTapPointerRef.current === event.pointerId) onSwapCells?.();
                                swapTapPointerRef.current = null;
                            }}
                            onPointerCancel={event => {
                                event.stopPropagation();
                                if (swapTapPointerRef.current === event.pointerId) swapTapPointerRef.current = null;
                            }}
                            onClick={event => {
                                event.stopPropagation();
                                if (event.detail === 0) onSwapCells?.();
                            }}
                        ><ArrowLeftRight size={20} strokeWidth={2.25} aria-hidden="true" /></button>
                        <button
                            type="button"
                            className={`unified-tactical-panel-action is-close${isCancelling ? ' is-active' : ''}`}
                            aria-label="Release here to close the decision panel"
                            title="Close panel"
                            onClick={isPinned ? event => { event.stopPropagation(); onClose(); } : undefined}
                            onPointerDown={event => event.stopPropagation()}
                            onPointerUp={event => event.stopPropagation()}
                        ><X size={20} strokeWidth={2.25} aria-hidden="true" /></button>
                    </div>
                </section>
                <div className="unified-tactical-targets">{targetMenu}</div>
            </div>
        </div>,
        document.body
    );
};
