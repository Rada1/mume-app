/**
 * @file UnifiedCommandFinder.tsx
 * @description Search and stage any catalogued command from the unified action panel.
 */

import React from 'react';
import { HelpCircle, Search, X } from 'lucide-react';
import { useGame } from '../../context/GameContext';
import { useInputStore } from '../../stores/useInputStore';
import { buildCommandGuideEntries, type GuideEntry } from './commandGuideData';

// --- Logic Section ---

const ENTRIES = buildCommandGuideEntries();
const matchesQuery = (entry: GuideEntry, query: string): boolean => query.trim().toLowerCase().split(/\s+/).filter(Boolean).every(term => entry.searchText.includes(term));

interface UnifiedCommandFinderProps {
    onSearchingChange: (searching: boolean) => void;
}

export const UnifiedCommandFinder: React.FC<UnifiedCommandFinderProps> = ({ onSearchingChange }) => {
    const { executeCommand } = useGame();
    const setInput = useInputStore(state => state.setInput);
    const requestTargetPicker = useInputStore(state => state.requestTargetPicker);
    const [isOpen, setIsOpen] = React.useState(false);
    const [query, setQuery] = React.useState('');
    const results = React.useMemo(() => query.trim() ? ENTRIES.filter(entry => matchesQuery(entry, query)) : [], [query]);

    React.useEffect(() => onSearchingChange(!!query.trim()), [onSearchingChange, query]);

    const stage = (entry: GuideEntry) => {
        if (entry.isPassive) return;
        setInput(entry.command.replace(/(?:\s+<target(?:\s+\d+)?>)+\s*$/i, ' '));
        if (entry.needsTarget) requestTargetPicker();
        window.setTimeout(() => document.getElementById('mud-input')?.focus(), 50);
    };

    return <>
        <div className={`command-guide-finder${isOpen ? ' is-open' : ''}`}>
            <button type="button" className="command-guide-finder-toggle" aria-expanded={isOpen} onClick={() => {
                setIsOpen(open => !open);
                if (isOpen) setQuery('');
            }}>
                <Search size={14} aria-hidden="true" />
                <span><strong>{query ? 'Finding a specific action' : 'Find any command or ability'}</strong><small>Search the full command list</small></span>
                <span aria-hidden="true">{isOpen ? '−' : '+'}</span>
            </button>
            {isOpen && <label className="command-guide-search">
                <input autoFocus value={query} onChange={event => setQuery(event.target.value)} placeholder="e.g. attack, heal, camp, or talk" aria-label="Search commands" />
                {query && <button type="button" aria-label="Clear search" onClick={() => setQuery('')}><X size={13} /></button>}
            </label>}
        </div>
        {query.trim() && <div className="command-guide-results" role="region" aria-label="Command search results">
            {results.length === 0 ? <p className="command-guide-empty">No matching commands. Try a shorter search.</p> : results.map(entry => <div key={entry.id} className="command-guide-entry-wrap">
                {entry.isPassive ? <div className="command-guide-entry is-passive"><span className="command-guide-entry-main"><strong>{entry.name}</strong><code>passive</code></span><span className="command-guide-entry-meta"><small>{entry.detail}</small></span></div> : <>
                    <button type="button" className="command-guide-entry" onClick={() => stage(entry)}>
                        <span className="command-guide-entry-main"><strong>{entry.name}</strong><code>{entry.command}</code></span>
                        <span className="command-guide-entry-meta"><small>{entry.detail}</small>{entry.needsTarget && <small className="needs-target">target</small>}</span>
                    </button>
                    <button type="button" className="command-guide-help" aria-label={`Get help for ${entry.name}`} title={`Send help ${entry.name.toLowerCase()}`} onClick={() => executeCommand(`help ${entry.name.toLowerCase()}`)}><HelpCircle size={15} aria-hidden="true" /></button>
                </>}
            </div>)}
        </div>}
    </>;
};
