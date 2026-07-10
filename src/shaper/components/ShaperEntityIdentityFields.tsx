/**
 * @file ShaperEntityIdentityFields.tsx
 * @description Reusable vnum/name editor with live Shaper entity lookup suggestions.
 */

import { useMemo, useState } from 'react';
import { matchShaperCatalogEntries, useShaperEntityCatalog } from '../hooks/useShaperEntityCatalog';
import type { ShaperCatalogEntry } from '../hooks/useShaperEntityCatalog';
import './ShaperEntityAddForm.css';

interface ShaperEntityIdentityFieldsProps {
    kind: ShaperCatalogEntry['kind'];
    vnum: string;
    name: string;
    onChange: (patch: { vnum?: string; name?: string }) => void;
    onPointerDown?: (event: React.PointerEvent) => void;
}

// --- Component Section ---
export const ShaperEntityIdentityFields: React.FC<ShaperEntityIdentityFieldsProps> = ({
    kind,
    vnum,
    name,
    onChange,
    onPointerDown
}) => {
    const [focused, setFocused] = useState(false);
    const { entries, catalogQuery } = useShaperEntityCatalog(kind, name || vnum);
    const suggestions = useMemo(
        () => matchShaperCatalogEntries(entries, name || vnum, catalogQuery),
        [entries, catalogQuery, name, vnum]
    );
    const choose = (entry: ShaperCatalogEntry) => {
        onChange({ vnum: entry.vnum, name: entry.name });
        setFocused(false);
    };

    return (
        <>
            <label>Vnum
                <input
                    value={vnum}
                    onChange={event => onChange({ vnum: event.target.value })}
                    onFocus={() => setFocused(true)}
                    onPointerDown={onPointerDown}
                    placeholder={`${kind} vnum`}
                />
            </label>
            <label>Name
                <span className="shaper-entity-name-combo">
                    <input
                        className="shaper-entity-name-input"
                        value={name}
                        onChange={event => onChange({ name: event.target.value })}
                        onFocus={() => setFocused(true)}
                        onPointerDown={onPointerDown}
                        placeholder={`${kind} name`}
                    />
                    {focused && suggestions.length > 0 && (
                        <span className="shaper-entity-suggestions" onMouseDown={event => event.preventDefault()}>
                            {suggestions.map(entry => (
                                <button key={`${entry.kind}-${entry.vnum}`} type="button" onClick={() => choose(entry)}>
                                    <strong>{entry.vnum}</strong>
                                    <span>{entry.name}</span>
                                </button>
                            ))}
                        </span>
                    )}
                </span>
            </label>
        </>
    );
};
