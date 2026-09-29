/**
 * @file ButtonSwipeOverlay.tsx
 * @description Renders swipe-wheel action previews for held game buttons.
 */

import React from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeftRight, X } from 'lucide-react';
import { CustomButton, SwipeDirection } from '../../../types';
import { SkillClassIcon } from '../../HUD/SkillClassIcon';
import { getClassKeyFromSetId, getSkillPresentation } from '../../../utils/skillPresentation';
import { TacticalCommandPalette, type TacticalPaletteCommand, type TacticalSwapCell } from './TacticalCommandPalette';
import './ButtonSwipeOverlay.css';

interface ButtonSwipeOverlayProps {
    button: CustomButton;
    buttonIconNode?: React.ReactNode;
    activeDir: SwipeDirection | 'center' | null;
    isCancelling: boolean;
    isPinned: boolean;
    swapSource?: TacticalSwapCell | null;
    isChoosingRebindSlot: boolean;
    rebindDirection: SwipeDirection | 'center' | null;
    onSelectRebindSlot: (direction: SwipeDirection | 'center') => void;
    buttonRect?: DOMRect;
    rayParams: { angle: number, length: number, opacity: number, color?: string };
    isMobile?: boolean;
    isTargetMenuVisible?: boolean;
    isCommandTargetReady?: (command: string) => boolean;
    activeCommand?: string;
    targetMenu?: React.ReactNode;
    paletteCommands?: TacticalPaletteCommand[];
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

const SWIPE_DIRECTION_GLYPHS: Record<string, string> = {
    right: '→', se: '↘', down: '↓', sw: '↙', left: '←', nw: '↖', up: '↑', ne: '↗'
};
const REBIND_GRID_CELLS: Array<Array<SwipeDirection | 'center'>> = [
    ['nw', 'up', 'ne'],
    ['left', 'center', 'right'],
    ['sw', 'down', 'se']
];

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

export const toSwipeCenterActionLabel = (button: CustomButton): string => {
    const command = (button.command || '').trim();
    const normalized = command.toLowerCase();
    if (!command) return button.label || '';

    if (button.actionType === 'menu') {
        if (normalized.endsWith('spelllist')) return 'spells';
        if (normalized.endsWith('skilllist')) return 'skills';
        if (normalized.endsWith(' list')) return normalized.replace(/\s+list$/, '');
        return normalized.replace(/list$/, '') || command;
    }

    const quotedAbility = command.match(/^(?:cast|commune)\s+'([^']+)'/i);
    if (quotedAbility) return quotedAbility[1];
    return command;
};

export const ButtonSwipeOverlay: React.FC<ButtonSwipeOverlayProps> = ({ button, buttonIconNode, activeDir, isCancelling, isPinned, swapSource = null, isChoosingRebindSlot, rebindDirection, onSelectRebindSlot, isTargetMenuVisible = false, isCommandTargetReady, activeCommand, targetMenu, paletteCommands = [], onClose, onSwapCells, onPinnedPointerDown, onPinnedPointerMove, onPinnedPointerUp, onPinnedPointerCancel, onPalettePointerDown, onPalettePointerMove, onPalettePointerUp, onPalettePointerCancel }) => {
    if (!isTargetMenuVisible || !targetMenu) return null;

    const wheelAccent = button.style.borderColor || button.style.backgroundColor || 'var(--set-accent, var(--accent))';
    const wheelAccentRgb = colorToRgb(wheelAccent, 'var(--set-accent-rgb, var(--accent-rgb))');
    const buttonClassKey = getClassKeyFromSetId(button.command) || getClassKeyFromSetId(button.setId);
    const centerCommand = button.command;
    const centerPresentation = getSkillPresentation(button.command || '', button.label || '', buttonClassKey);
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
    const displayDirection = isChoosingRebindSlot
        ? rebindDirection
        : rebindDirection || activeDir || (isCenterCommand ? 'center' : configuredDirection || null);
    const wheelContent = (
        <div
            className="swipe-wheel-container"
            onPointerDown={isPinned ? onPinnedPointerDown : undefined}
            onPointerMove={isPinned ? onPinnedPointerMove : undefined}
            onPointerUp={isPinned ? onPinnedPointerUp : undefined}
            onPointerCancel={isPinned ? onPinnedPointerCancel : undefined}
        >
            {['right', 'se', 'down', 'sw', 'left', 'nw', 'up', 'ne'].map((d, i) => {
                const cmdVal = (button.swipeCommands?.[d as SwipeDirection] || button.longSwipeCommands?.[d as SwipeDirection] || '').trim();
                const isActive = displayDirection === d && Boolean(cmdVal);
                return (
                    <div
                        key={d}
                        className={`swipe-slice ${isActive ? 'active' : ''}`}
                        style={{ transform: `rotate(${i * 45}deg)`, opacity: 1, pointerEvents: 'auto' }}
                    ><div className="slice-separator" /></div>
                );
            })}
            {['right', 'se', 'down', 'sw', 'left', 'nw', 'up', 'ne'].map(d => {
                const cmdVal = (button.swipeCommands?.[d as SwipeDirection] || button.longSwipeCommands?.[d as SwipeDirection] || '').trim();
                const isActive = displayDirection === d;
                const targetReady = isCommandTargetReady?.(cmdVal) ?? false;
                const presentation = getSkillPresentation(cmdVal, cmdVal, buttonClassKey);
                return (
                    <span key={`label-${d}`} className={`swipe-sq-label ${isActive ? 'active' : ''}${swapSource?.kind === 'wheel' && swapSource.direction === d ? ' is-swap-source' : ''}${cmdVal ? '' : ' is-empty'}`} data-dir={d} data-wheel-direction={d} data-wheel-command={cmdVal}>
                        <span className={`swipe-action-card${targetReady ? ' is-target-ready' : ''}${cmdVal ? '' : ' is-empty'}`}>
                            {cmdVal && <>
                                <span className="swipe-direction-glyph">{SWIPE_DIRECTION_GLYPHS[d]}</span>
                                {presentation.classKey
                                    ? <SkillClassIcon classKey={presentation.classKey} size={15} />
                                    : buttonIconNode && <span className="swipe-button-icon" aria-hidden="true">{buttonIconNode}</span>}
                                <span className="swipe-action-text">{presentation.label}</span>
                            </>}
                        </span>
                    </span>
                );
            })}
            <div className={`swipe-center ${displayDirection === 'center' ? 'active' : ''}${swapSource?.kind === 'wheel' && swapSource.direction === 'center' ? ' is-swap-source' : ''}`} data-wheel-direction="center" data-wheel-command={centerCommand}>
                {centerPresentation.classKey
                    ? <SkillClassIcon classKey={centerPresentation.classKey} size={18} />
                    : buttonIconNode && <span className="swipe-button-icon" aria-hidden="true">{buttonIconNode}</span>}
                <span className="swipe-center-label">{toSwipeCenterActionLabel(button)}</span>
            </div>
            {isChoosingRebindSlot && <div className="unified-tactical-rebind-grid" aria-label="Choose wheel slot to rebind">
                {REBIND_GRID_CELLS.flat().map(direction => (
                    <button
                        key={direction}
                        type="button"
                        className={rebindDirection === direction ? 'is-selected' : ''}
                        aria-label={`Choose ${direction === 'center' ? 'center' : direction} slot`}
                        onPointerDown={event => event.stopPropagation()}
                        onClick={event => {
                            event.stopPropagation();
                            onSelectRebindSlot(direction);
                        }}
                    />
                ))}
            </div>}
        </div>
    );
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
                className="unified-tactical-surface"
                onPointerDown={event => event.stopPropagation()}
                onPointerUp={event => event.stopPropagation()}
                onPointerCancel={event => event.stopPropagation()}
            >
                <section
                    className="unified-tactical-wheel unified-tactical-panel-wheel"
                    aria-label="Swipe command wheel"
                >
                    <div className="unified-tactical-panel-scroll">
                        {wheelContent}
                        <TacticalCommandPalette
                            commands={paletteCommands}
                            activeCommand={activeCommand || ''}
                            iconNode={buttonIconNode}
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
                            className={`unified-tactical-panel-action is-swap${swapSource ? ' is-active' : ''}`}
                            aria-label={swapSource ? 'Tap to swap the selected cell with the cell under the held finger' : 'Tap to select the cell under the held finger for swapping'}
                            title={swapSource ? 'Swap with selected cell' : 'Select cell to swap'}
                            aria-pressed={Boolean(swapSource)}
                            onPointerDown={event => event.stopPropagation()}
                            onPointerUp={event => {
                                event.stopPropagation();
                                if (!event.isPrimary || event.pointerType === 'mouse') onSwapCells?.();
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
