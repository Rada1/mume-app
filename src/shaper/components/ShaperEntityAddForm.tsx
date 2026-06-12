/**
 * @file ShaperEntityAddForm.tsx
 * @description Inline mob/object add form with catalog suggestions.
 */

import { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { matchShaperCatalogEntries, useShaperEntityCatalog } from '../hooks/useShaperEntityCatalog';
import type { ShaperCatalogEntry } from '../hooks/useShaperEntityCatalog';
import './ShaperEntityAddForm.css';

interface ShaperEntityAddFormProps {
    kind: ShaperCatalogEntry['kind'];
    label: string;
    onAdd: (vnum: string, name: string) => void;
}

// --- Component Section ---
export const ShaperEntityAddForm: React.FC<ShaperEntityAddFormProps> = ({ kind, label, onAdd }) => {
    const [vnum, setVnum] = useState('');
    const [name, setName] = useState('');
    const [focused, setFocused] = useState(false);
    const catalog = useShaperEntityCatalog(kind, name || vnum);
    const suggestions = useMemo(() => matchShaperCatalogEntries(catalog, name || vnum), [catalog, name, vnum]);

    const submit = () => {
        if (!name.trim() && !vnum.trim()) return;
        onAdd(vnum, name);
        setVnum('');
        setName('');
    };

    const choose = (entry: ShaperCatalogEntry) => {
        setVnum(entry.vnum);
        setName(entry.name);
        setFocused(false);
    };

    return (
        <form className="shaper-entity-add" onSubmit={e => { e.preventDefault(); submit(); }}>
            <input className="shaper-entity-vnum-input" placeholder="vnum" value={vnum} onChange={e => setVnum(e.target.value)} onFocus={() => setFocused(true)} />
            <div className="shaper-entity-name-combo">
                <input className="shaper-entity-name-input" placeholder="name" value={name} onChange={e => setName(e.target.value)} onFocus={() => setFocused(true)} />
                {focused && suggestions.length > 0 && (
                    <div className="shaper-entity-suggestions" onMouseDown={event => event.preventDefault()}>
                        {suggestions.map(entry => (
                            <button key={`${entry.kind}-${entry.vnum}`} type="button" onClick={() => choose(entry)}>
                                <strong>{entry.vnum}</strong>
                                <span>{entry.name}</span>
                            </button>
                        ))}
                    </div>
                )}
            </div>
            <button type="submit" title={label}><Plus size={14} /></button>
        </form>
    );
};
