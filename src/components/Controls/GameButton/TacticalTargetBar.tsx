/**
 * @file TacticalTargetBar.tsx
 * @description Sleek vertical terminal target menu docked on the left during mobile button holds.
 */

// --- Logic Section ---
import React, { FC, ReactNode, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { GmcpOccupant } from '../../../types';
import { getRoomTargetSuggestions, CommandTargetSuggestion } from '../../../utils/commandSuggestionUtils';
import { TacticalDirectionPad } from './TacticalDirectionPad';
import { TacticalTargetList } from './TacticalTargetList';
import { useTargetListPointer } from './useTargetListPointer';
import './TacticalTargetBar.css';

export interface TacticalTargetColumn {
    title: string;
    suggestions: CommandTargetSuggestion[];
    selectedTarget: string | null;
    selectedKey?: string | null;
    emptyText?: string;
    showSendIndicator?: boolean;
}

export interface TacticalTargetBarProps {
    isOpen: boolean;
    currentTarget: string | null;
    selectedTarget: string | null;
    selectionFeedbackValue?: string | null;
    onSelectTarget: (targetValue: string, keepOpenAfterFire?: boolean) => void;
    roomOccupants: GmcpOccupant[];
    roomItems?: GmcpOccupant[];
    characterName?: string;
    suggestions?: CommandTargetSuggestion[];
    title?: string;
    commandLabel?: string;
    isInteractive?: boolean;
    isBlurred?: boolean;
    isSwipeTargeting?: boolean;
    onHoverTarget?: (targetValue: string | null) => void;
    onDismiss?: () => void;
    columns?: TacticalTargetColumn[];
    onSelectColumnTarget?: (targetValue: string, columnIndex: number, suggestion: CommandTargetSuggestion, keepOpenAfterFire?: boolean) => void;
    onToggleTargetLock?: (targetValue: string) => void;
    showKeepOpenToggle?: boolean;
    fireOnTargetTap?: boolean;
    onFireModeChange?: (fireOnTargetTap: boolean) => void;
    directionPadMode?: 'below' | 'side' | 'wheel' | null;
    selectedDirection?: string | null;
    onSelectDirection?: (direction: string, keepOpenAfterFire?: boolean) => void;
    embedded?: boolean;
    showWornLocation?: boolean;
    customContent?: ReactNode;
    customContentInteractive?: boolean;
}

export const TacticalTargetBar: FC<TacticalTargetBarProps> = ({
    isOpen,
    currentTarget,
    selectedTarget,
    selectionFeedbackValue = null,
    onSelectTarget,
    roomOccupants,
    roomItems = [],
    characterName = '',
    suggestions,
    title = 'TARGETS',
    commandLabel,
    isInteractive = true,
    isBlurred = false,
    isSwipeTargeting = false,
    onHoverTarget,
    onDismiss,
    columns,
    onSelectColumnTarget,
    onToggleTargetLock,
    showKeepOpenToggle = false,
    fireOnTargetTap = true,
    onFireModeChange,
    directionPadMode = null,
    selectedDirection = null,
    onSelectDirection,
    embedded = false,
    showWornLocation = false,
    customContent,
    customContentInteractive = false
}) => {
    const [keepOpenAfterFire, setKeepOpenAfterFire] = useState(false);
    const [socialLetter, setSocialLetter] = useState<string | null>(null);
    const socialListRef = useRef<HTMLDivElement | null>(null);
    const { touchesRef, lastPointerUpSelectionRef, onPointerDownCapture, onPointerMove } = useTargetListPointer(isOpen, onHoverTarget);
    const barRef = useRef<HTMLDivElement | null>(null);
    const candidates: CommandTargetSuggestion[] = useMemo(() => {
        if (!isOpen) return [];
        return suggestions ?? getRoomTargetSuggestions(roomOccupants, roomItems, 'characters', characterName);
    }, [isOpen, roomOccupants, roomItems, characterName, suggestions]);
    useEffect(() => {
        if (!isOpen) setKeepOpenAfterFire(false);
    }, [isOpen]);
    useEffect(() => {
        if (!isOpen) setSocialLetter(null);
    }, [isOpen]);

    const isSocialMenu = title === 'SOCIAL COMMANDS';
    const socialColumn = columns?.find(column => column.title.toLowerCase() === 'social'
        || column.suggestions.some(item => item.meta === 'social'));
    const rememberedSocialTarget = socialColumn?.selectedTarget || selectedTarget;
    const socialLetters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
    const availableSocialLetters = new Set(candidates.map(item => item.label.charAt(0).toUpperCase()));
    useLayoutEffect(() => {
        if (!isOpen || (!isSocialMenu && !socialColumn) || !rememberedSocialTarget) return;
        const list = socialListRef.current;
        const selectedRow = Array.from(list?.querySelectorAll<HTMLElement>('[data-target-value]') || [])
            .find(row => row.dataset.targetValue === rememberedSocialTarget);
        if (!list || !selectedRow) return;
        const listBounds = list.getBoundingClientRect();
        const rowBounds = selectedRow.getBoundingClientRect();
        if (rowBounds.top < listBounds.top) {
            list.scrollTop += rowBounds.top - listBounds.top;
        } else if (rowBounds.bottom > listBounds.bottom) {
            list.scrollTop += rowBounds.bottom - listBounds.bottom;
        }
    }, [isOpen, isSocialMenu, rememberedSocialTarget, socialColumn]);
    const jumpToSocialLetter = (letter: string, items = candidates, behavior: ScrollBehavior = 'smooth') => {
        const list = socialListRef.current;
        if (!list) return;
        const firstMatch = items.find(item => item.label.charAt(0).toUpperCase() === letter);
        if (!firstMatch) return;
        const row = Array.from(list.querySelectorAll<HTMLElement>('[data-target-value]'))
            .find(element => element.dataset.targetValue === firstMatch.value);
        if (!row) return;
        const top = list.scrollTop + row.getBoundingClientRect().top - list.getBoundingClientRect().top;
        setSocialLetter(letter);
        list.scrollTo({ top, behavior });
    };
    const syncSocialLetterFromScroll = (items = candidates) => {
        const list = socialListRef.current;
        if (!list) return;
        const top = list.getBoundingClientRect().top + 2;
        const visibleRow = Array.from(list.querySelectorAll<HTMLElement>('[data-target-value]'))
            .find(element => element.getBoundingClientRect().bottom > top);
        const visibleValue = visibleRow?.dataset.targetValue;
        const visibleItem = items.find(item => item.value === visibleValue);
        if (visibleItem) setSocialLetter(visibleItem.label.charAt(0).toUpperCase());
    };
    const selectSocialLetterAtY = (clientY: number, rail: HTMLDivElement, items = candidates) => {
        const availableLetters = new Set(items.map(item => item.label.charAt(0).toUpperCase()));
        const bounds = rail.getBoundingClientRect();
        const index = Math.max(0, Math.min(25, Math.floor(((clientY - bounds.top) / bounds.height) * 26)));
        const letter = socialLetters[index];
        if (availableLetters.has(letter)) {
            jumpToSocialLetter(letter, items, 'auto');
            return;
        }
        const nearest = socialLetters
            .filter(candidate => availableLetters.has(candidate))
            .sort((left, right) => Math.abs(left.charCodeAt(0) - letter.charCodeAt(0)) - Math.abs(right.charCodeAt(0) - letter.charCodeAt(0)))[0];
        if (nearest) jumpToSocialLetter(nearest, items, 'auto');
    };



    useEffect(() => {
        if (!isOpen || !onDismiss) return;
        const dismissOutside = (event: PointerEvent) => {
            const target = event.target instanceof Element ? event.target : null;
            if (target?.closest('.unified-tactical-surface')) return;
            if (event.target instanceof Node && !barRef.current?.contains(event.target)) onDismiss();
        };
        document.addEventListener('pointerdown', dismissOutside);
        return () => document.removeEventListener('pointerdown', dismissOutside);
    }, [isOpen, onDismiss]);

    if (!isOpen || typeof document === 'undefined') return null;

    const barMarkup = (
        <div
            ref={barRef}
            className={`tactical-target-bar${embedded ? ' is-embedded' : ''}${showWornLocation ? ' is-remove-target-menu' : ''}${customContent ? ' has-custom-content' : ''}${customContentInteractive ? ' has-interactive-custom-content' : ''}${columns?.length ? ' has-columns' : ''}${!columns?.length && !directionPadMode ? ' has-fixed-halves' : ''}${directionPadMode ? ` has-directions-${directionPadMode}` : ''}${commandLabel ? ' has-command' : ''}${isInteractive ? '' : ' is-held'}${isBlurred ? ' is-blurred' : ''}${isSwipeTargeting ? ' is-swipe-targeting' : ''}`}
            style={customContentInteractive ? { pointerEvents: 'auto' } : undefined}
            onPointerDownCapture={onPointerDownCapture}
            onPointerDown={(e) => e.stopPropagation()}
            onPointerUp={(e) => e.stopPropagation()}
            onPointerMove={onPointerMove}
            onPointerCancel={(e) => {
                touchesRef.current.delete(e.pointerId);
                e.stopPropagation();
            }}
            onClick={(e) => e.stopPropagation()}
        >
            {!customContent && <div className="tactical-target-bar-header">
                <span className="tactical-target-bar-title">
                    <span>▸ {title}</span>
                    {directionPadMode !== 'wheel' && !customContent && <span className="tactical-target-bar-count">({columns?.length ? columns.reduce((count, column) => count + column.suggestions.length, 0) : candidates.length})</span>}
                </span>
                {showKeepOpenToggle && isInteractive && <button
                    type="button"
                    role="switch"
                    aria-label="Keep target menu open after firing"
                    aria-checked={keepOpenAfterFire}
                    className={`tactical-target-bar-keep-open${keepOpenAfterFire ? ' is-enabled' : ''}`}
                    onPointerDown={event => event.stopPropagation()}
                    onClick={event => {
                        event.stopPropagation();
                        setKeepOpenAfterFire(value => !value);
                    }}
                ><span className="tactical-target-bar-keep-open-track"><span /></span><span>Keep open</span></button>}
                {onFireModeChange && isInteractive && <button
                    type="button"
                    role="switch"
                    aria-label={fireOnTargetTap ? 'Fire on target selection; activate to wait for cell release' : 'Fire on cell release; activate to fire on target selection'}
                    title={fireOnTargetTap ? 'Fire on target tap' : 'Fire when the held cell is released'}
                    aria-checked={fireOnTargetTap}
                    className={`tactical-target-bar-keep-open tactical-target-bar-fire-mode${fireOnTargetTap ? ' is-enabled' : ''}`}
                    onPointerDown={event => {
                        event.stopPropagation();
                        onFireModeChange(!fireOnTargetTap);
                    }}
                    onClick={event => {
                        event.stopPropagation();
                        if (event.detail === 0) onFireModeChange(!fireOnTargetTap);
                    }}
                ><span className="tactical-target-bar-keep-open-track"><span /></span><span>{fireOnTargetTap ? 'Tap' : 'Release'}</span></button>}
            </div>}
            <div className={`tactical-target-bar-body${directionPadMode === 'below' ? ' has-directions-below' : ''}${directionPadMode === 'wheel' ? ' has-directions-wheel' : ''}`}>
                {customContent ? <div className="tactical-target-bar-custom-content">{customContent}</div> : <>
                {commandLabel && <div className="tactical-target-bar-command" aria-label={`Command: ${commandLabel}`}>
                    <span>{commandLabel}</span>
                </div>}
                {directionPadMode === 'wheel' ? (
                    <TacticalDirectionPad
                        layout="wheel"
                        selectedDirection={selectedDirection}
                        onSelectDirection={direction => onSelectDirection?.(direction, keepOpenAfterFire)}
                    />
                ) : directionPadMode === 'side' ? (
                    <div className="tactical-target-bar-columns">
                        <section className="tactical-target-bar-column">
                            <div className="tactical-target-bar-list">
                                <TacticalTargetList
                                    items={candidates} currentTarget={currentTarget} selectedValue={selectedTarget}
                                    confirmedValue={selectionFeedbackValue}
                                    isSwipeTargeting={isSwipeTargeting} keepOpenAfterFire={keepOpenAfterFire}
                                    showSendIndicator={fireOnTargetTap}
                                    touchesRef={touchesRef} lastPointerUpSelectionRef={lastPointerUpSelectionRef}
                                    onSelectTarget={onSelectTarget} onHoverTarget={onHoverTarget}
                                    onToggleTargetLock={onToggleTargetLock}
                                />
                            </div>
                        </section>
                        <TacticalDirectionPad
                            layout="side"
                            selectedDirection={selectedDirection}
                            onSelectDirection={direction => onSelectDirection?.(direction, keepOpenAfterFire)}
                        />
                    </div>
                ) : directionPadMode === 'below' && !columns?.length ? (
                    <div className="tactical-target-bar-direction-stack">
                        <div className="tactical-target-bar-list">
                            {candidates.length === 0
                                ? <div className="tactical-target-bar-empty">No viable targets</div>
                                : <TacticalTargetList
                                    items={candidates} currentTarget={currentTarget} selectedValue={selectedTarget}
                                    confirmedValue={selectionFeedbackValue}
                                    isSwipeTargeting={isSwipeTargeting} keepOpenAfterFire={keepOpenAfterFire}
                                    showSendIndicator={fireOnTargetTap}
                                    touchesRef={touchesRef} lastPointerUpSelectionRef={lastPointerUpSelectionRef}
                                    onSelectTarget={onSelectTarget} onHoverTarget={onHoverTarget}
                                    onToggleTargetLock={onToggleTargetLock}
                                />}
                        </div>
                        <TacticalDirectionPad
                            layout="below"
                            selectedDirection={selectedDirection}
                            onSelectDirection={direction => onSelectDirection?.(direction, keepOpenAfterFire)}
                        />
                    </div>
                ) : columns?.length ? (
                    <div className={`tactical-target-bar-columns${columns.length === 1 ? ' tactical-target-bar-single-column' : ''}`}>
                        {columns.map((column, index) => {
                            const isSocialColumn = column.title.toLowerCase() === 'social'
                                || column.suggestions.some(item => item.meta === 'social');
                            const columnLetters = new Set(column.suggestions.map(item => item.label.charAt(0).toUpperCase()));
                            const list = <div ref={isSocialColumn ? socialListRef : undefined} className="tactical-target-bar-list" onScroll={() => {
                                touchesRef.current.forEach(touch => { touch.moved = true; });
                                if (isSocialColumn) syncSocialLetterFromScroll(column.suggestions);
                            }}>
                                <TacticalTargetList
                                    items={column.suggestions} currentTarget={currentTarget} selectedValue={column.selectedTarget}
                                    confirmedValue={selectionFeedbackValue}
                                    columnIndex={index} emptyText={column.emptyText} selectedKey={column.selectedKey}
                                    isSwipeTargeting={isSwipeTargeting} keepOpenAfterFire={keepOpenAfterFire}
                                    showSendIndicator={fireOnTargetTap && (column.showSendIndicator ?? index > 0)}
                                    touchesRef={touchesRef} lastPointerUpSelectionRef={lastPointerUpSelectionRef}
                                    onSelectTarget={onSelectTarget} onSelectColumnTarget={onSelectColumnTarget}
                                    onHoverTarget={onHoverTarget}
                                    onToggleTargetLock={onToggleTargetLock}
                                />
                            </div>;
                            const content = directionPadMode === 'below' && index === 0
                                ? <div className="tactical-target-bar-direction-stack">
                                    {list}
                                    <TacticalDirectionPad
                                        layout="below"
                                        selectedDirection={selectedDirection}
                                        onSelectDirection={direction => onSelectDirection?.(direction, keepOpenAfterFire)}
                                    />
                                </div>
                                : list;
                            return <section className="tactical-target-bar-column" key={`${column.title}-${index}`}>
                                <h3 className="tactical-target-bar-column-title">{column.title}</h3>
                                {isSocialColumn ? <div className="tactical-target-bar-social-browser">
                                    <div
                                        className="tactical-target-bar-social-index"
                                        role="group"
                                        aria-label="Filter social commands by letter"
                                        onPointerDown={event => {
                                            event.stopPropagation();
                                            selectSocialLetterAtY(event.clientY, event.currentTarget, column.suggestions);
                                        }}
                                        onPointerMove={event => {
                                            if (event.buttons > 0) selectSocialLetterAtY(event.clientY, event.currentTarget, column.suggestions);
                                        }}
                                    >
                                        {socialLetters.map(letter => <button
                                            key={letter}
                                            type="button"
                                            aria-label={`Show ${letter} social commands`}
                                            aria-pressed={socialLetter === letter}
                                            disabled={!columnLetters.has(letter)}
                                            className={socialLetter === letter ? 'is-active' : ''}
                                            onClick={() => jumpToSocialLetter(letter, column.suggestions)}
                                        >{letter}</button>)}
                                    </div>
                                    {list}
                                </div> : content}
                            </section>;
                        })}
                    </div>
                ) : isSocialMenu ? (
                    <div className="tactical-target-bar-columns tactical-target-bar-single-column">
                        <section className="tactical-target-bar-column">
                            <div className="tactical-target-bar-social-browser">
                                <div
                                    className="tactical-target-bar-social-index"
                                    role="group"
                                    aria-label="Filter social commands by letter"
                                    onPointerDown={event => {
                                        event.stopPropagation();
                                        selectSocialLetterAtY(event.clientY, event.currentTarget);
                                    }}
                                    onPointerMove={event => {
                                        if (event.buttons > 0) selectSocialLetterAtY(event.clientY, event.currentTarget);
                                    }}
                                >
                                    {socialLetters.map(letter => <button
                                        key={letter}
                                        type="button"
                                        aria-label={`Show ${letter} social commands`}
                                        aria-pressed={socialLetter === letter}
                                        disabled={!availableSocialLetters.has(letter)}
                                        className={socialLetter === letter ? 'is-active' : ''}
                                        onClick={() => jumpToSocialLetter(letter)}
                                    >{letter}</button>)}
                                </div>
                                <div ref={socialListRef} className="tactical-target-bar-list" onScroll={() => {
                                    touchesRef.current.forEach(touch => { touch.moved = true; });
                                    syncSocialLetterFromScroll();
                                }}>
                                    {candidates.length === 0
                                        ? <div className="tactical-target-bar-empty">No social commands</div>
                                        : <TacticalTargetList
                                            items={candidates} currentTarget={currentTarget} selectedValue={selectedTarget}
                                            confirmedValue={selectionFeedbackValue}
                                            isSwipeTargeting={isSwipeTargeting} keepOpenAfterFire={keepOpenAfterFire}
                                            touchesRef={touchesRef} lastPointerUpSelectionRef={lastPointerUpSelectionRef}
                                            onSelectTarget={onSelectTarget} onHoverTarget={onHoverTarget}
                                            onToggleTargetLock={onToggleTargetLock}
                                        />}
                                </div>
                        </div>
                        </section>
                    </div>
                ) : (
                    <div className="tactical-target-bar-columns tactical-target-bar-single-column">
                        <section className="tactical-target-bar-column">
                            <div className="tactical-target-bar-list" onScroll={() => {
                                touchesRef.current.forEach(touch => { touch.moved = true; });
                            }}>
                                {candidates.length === 0
                                    ? <div className="tactical-target-bar-empty">{title === 'WHO LIST' ? 'No players in WHO list' : title === 'SOCIAL COMMANDS' ? 'No social commands' : 'No viable targets'}</div>
                                    : <TacticalTargetList
                                        items={candidates} currentTarget={currentTarget} selectedValue={selectedTarget}
                                        showWornLocation={showWornLocation}
                                        confirmedValue={selectionFeedbackValue}
                                        isSwipeTargeting={isSwipeTargeting} keepOpenAfterFire={keepOpenAfterFire}
                                        showSendIndicator={fireOnTargetTap}
                                        touchesRef={touchesRef} lastPointerUpSelectionRef={lastPointerUpSelectionRef}
                                        onSelectTarget={onSelectTarget} onHoverTarget={onHoverTarget}
                                        onToggleTargetLock={onToggleTargetLock}
                                    />}
                            </div>
                        </section>
                    </div>
                )}
                </>}
            </div>
        </div>
    );
    return embedded ? barMarkup : createPortal(barMarkup, document.body);
};
