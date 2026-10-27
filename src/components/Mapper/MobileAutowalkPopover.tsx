/** @file MobileAutowalkPopover.tsx — Compact progress and cancellation above the player's room. */
import { createPortal } from 'react-dom';
import type { MobileAutowalkPopoverProps } from '../../types/mapAutowalk';
import { useMobileAutowalkPlacement } from '../../hooks/useMobileAutowalkPlacement';
import './MobileAutowalkPopover.css';

// --- Mobile autowalk presentation ---
export const MobileAutowalkPopover = (props: MobileAutowalkPopoverProps) => {
    const ref = useMobileAutowalkPlacement(props);
    return createPortal(
        <div ref={ref} popover="manual" className="mobile-autowalk-popover" role="group" aria-label="Autowalk in progress"
            onPointerDown={event => event.stopPropagation()} onClick={event => event.stopPropagation()}>
            <span>Walking · {props.roomsLeft} left</span>
            <button type="button" onClick={props.onStop} aria-label="Stop autowalk">■ Stop</button>
        </div>, document.body
    );
};
