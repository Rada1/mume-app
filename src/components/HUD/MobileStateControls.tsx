/** @file MobileStateControls.tsx — Single state row below the mobile command input. */
import { useMobileStateControls } from '../../hooks/useMobileStateControls';
import { ThisIsYouStatePill } from './ThisIsYouStatePill';
import './MobileStateControls.css';

// --- Render Section ---
export function MobileStateControls() {
    const state = useMobileStateControls();
    return <nav className="mobile-input-state-controls" aria-label="Quick state controls">
        {state.controls.map(control => <ThisIsYouStatePill
            key={control.label}
            category={control.label}
            value={control.value || '—'}
            options={control.options}
            isMobile
            disabled={state.disabled}
            onInteract={state.interact}
            onSelect={option => state.select(control, option)}
            confirmOptionValue={control.label === 'Mood' ? 'berserk' : undefined}
            confirmMessage="Berserk prevents fleeing. Tap Berserk again to confirm."
        />)}
    </nav>;
}
