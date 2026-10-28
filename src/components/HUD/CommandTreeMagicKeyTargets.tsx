/** @file CommandTreeMagicKeyTargets.tsx — Saved magic keys in the command target lane. */
import React from 'react';
import type { CustomButton } from '../../types';
import type { useCommandTreeController } from '../../hooks/useCommandTreeController';
import { useCommandMagicKeys } from '../../hooks/useCommandMagicKeys';
import { useSecondaryTouchActivation } from '../../hooks/useSecondaryTouchActivation';
import { formatMagicKeyRemaining } from '../../utils/magicKeyUtils';
import { heldTargetPreviewRef } from '../../utils/heldTargetPreview';
import { CommandTreeTargetHeader } from './CommandTreeTargetHeader';

// --- Saved destination choices ---
export const CommandTreeMagicKeyTargets = ({controller, button, heldMenu = false, onCommandExecuted}: {
    controller: ReturnType<typeof useCommandTreeController>; button: CustomButton;
    heldMenu?: boolean; onCommandExecuted?: () => void;
}) => {
    const keys = useCommandMagicKeys(controller, button, onCommandExecuted);
    const touch = useSecondaryTouchActivation();
    return <section className={`command-tree-branch terminal-inline-popover${heldMenu ? ' command-tree-held-command-targets' : ''}`}
        aria-label={`Destinations for ${button.label}`} {...touch}>
        <CommandTreeTargetHeader title="MAGIC KEYS"/>
        <div className="command-tree-section-commands" role="group" aria-label="Saved destinations">
            {keys.targets.map(target => <button key={target.id} type="button" data-menu-item="true" className="command-tree-row"
                disabled={keys.disabled} ref={heldTargetPreviewRef(() => keys.preview(target))}
                onPointerEnter={event => { if (event.pointerType === 'mouse') keys.preview(target); }}
                onPointerLeave={event => { if (event.pointerType === 'mouse') controller.game.setCommandPreview?.(null); }}
                onFocus={event => { if (event.currentTarget.matches(':focus-visible')) keys.preview(target); }}
                onBlur={() => controller.game.setCommandPreview?.(null)}
                onClick={event => keys.choose(target, event)} title={`${target.label || target.name} · ${target.id}`}>
                <span className="command-tree-row-label">{target.isFavorite ? '★ ' : ''}{target.customName || target.label || target.name}
                    <small> · {formatMagicKeyRemaining(target.expiresAt, keys.now)}</small></span>
            </button>)}
        </div>
        {!keys.targets.length && <p className="command-tree-section-empty">No saved keys. Use Locate or Locate Life to discover destinations.</p>}
    </section>;
};
