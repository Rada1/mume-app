/**
 * @file ShaperAccessDialog.tsx
 * @description Passcode dialog for unlocking the privileged Shaper workspace.
 */

import { useState } from 'react';
import { requestShaperAccess } from '../access/shaperAccess';
import './ShaperAccessDialog.css';

interface ShaperAccessDialogProps {
    onClose: () => void;
    onGranted: () => void;
}

// --- Component Section ---
export const ShaperAccessDialog: React.FC<ShaperAccessDialogProps> = ({ onClose, onGranted }) => {
    const [passcode, setPasscode] = useState('');
    const [error, setError] = useState('');

    const submit = (event: React.FormEvent) => {
        event.preventDefault();
        if (requestShaperAccess(passcode)) {
            setError('');
            onGranted();
            return;
        }
        setError('Passcode was not accepted.');
    };

    return (
        <div className="shaper-access-backdrop" role="dialog" aria-label="Shaper access">
            <form className="shaper-access-card" onSubmit={submit}>
                <span className="shaper-kicker">Builder Workspace</span>
                <h2>Unlock Shaper</h2>
                <p>Enter a Shaper passcode to open builder projects on this device.</p>
                <label className="shaper-field">
                    <span>Passcode</span>
                    <input
                        autoFocus
                        type="password"
                        value={passcode}
                        onChange={event => setPasscode(event.target.value)}
                    />
                </label>
                {error && <p className="shaper-access-error">{error}</p>}
                <div className="shaper-access-actions">
                    <button type="button" onClick={onClose}>Cancel</button>
                    <button type="submit">Unlock</button>
                </div>
            </form>
        </div>
    );
};
