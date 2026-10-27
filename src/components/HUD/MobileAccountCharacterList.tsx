/**
 * @file MobileAccountCharacterList.tsx
 * @description Character selection with portrait terminal rows and aligned landscape fields.
 */

// --- Logic Section ---
import React, { FC } from 'react';
import { RefreshCw } from 'lucide-react';
import type { CharacterEntry, MobileAccountCharacterListProps } from '../../types';

const characterLine = (entry: CharacterEntry): React.ReactNode => {
    const line = entry.rawLine
        || [entry.name, entry.race, entry.sublevel, entry.level, entry.logon, entry.area, entry.rent].filter(Boolean).join('  ');
    if (entry.logon.trim().toLowerCase() !== 'no link') return line;
    const start = line.toLowerCase().indexOf(entry.logon.toLowerCase());
    if (start < 0) return line;
    const end = start + entry.logon.length;
    return <>{line.slice(0, start)}<span className="mobile-account-character-no-link">{line.slice(start, end)}</span>{line.slice(end)}</>;
};

export const MobileAccountCharacterList: FC<MobileAccountCharacterListProps> = ({ accountState, onSelect, onRefresh }) => (
    <div className="mobile-account-character-list" role="listbox" aria-label="Characters">
        <div className="mobile-account-character-head" aria-hidden="true">
            <span className="mobile-account-character-terminal">Name　 Rce　 Sub　 Lvl　 Logon　 Area　 Rent</span>
            <span className="mobile-account-character-cells">
                {['Name', 'Race', 'Sub', 'Lvl', 'Logon', 'Area', 'Rent'].map(label => <span key={label}>{label}</span>)}
            </span>
        </div>
        {accountState.characters.map(entry => (
            <button
                key={entry.name}
                type="button"
                role="option"
                aria-selected={accountState.selectedCharacter?.name === entry.name}
                className={`mobile-account-character-row${accountState.selectedCharacter?.name === entry.name ? ' is-selected' : ''}`}
                onClick={() => onSelect(entry)}
            >
                <span className="mobile-account-character-terminal">{characterLine(entry)}</span>
                <span className="mobile-account-character-cells">
                    {[entry.name, entry.race, entry.sublevel, entry.level, entry.logon, entry.area, entry.rent].map((value, index) => (
                        <span key={index} title={String(value ?? '')} className={index === 4 && entry.logon.trim().toLowerCase() === 'no link' ? 'mobile-account-character-no-link' : undefined}>
                            {value === undefined || value === '' ? '—' : value}
                        </span>
                    ))}
                </span>
            </button>
        ))}
        {accountState.isGathering && accountState.characters.length === 0 && <div className="mobile-account-empty">Loading characters…</div>}
        {!accountState.isGathering && accountState.characters.length === 0 && (
            <button type="button" className="mobile-account-empty mobile-account-refresh" onClick={onRefresh}>
                <RefreshCw size={16} /> Refresh list
            </button>
        )}
    </div>
);
