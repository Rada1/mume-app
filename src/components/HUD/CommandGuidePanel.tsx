/** @file CommandGuidePanel.tsx — Search, browse, and stage MUME commands. */

import React, { useEffect, useMemo, useState } from 'react';
import { Backpack, BookOpen, Compass, HelpCircle, MessageCircle, Search, Sparkles, Swords, X } from 'lucide-react';
import { useGame } from '../../context/GameContext';
import { useCommandPanelStore } from '../../stores/useCommandPanelStore';
import { useInputStore } from '../../stores/useInputStore';
import { buildCommandGuideEntries, type GuideCategory, type GuideEntry } from './commandGuideData';
import { CLASS_KEYS } from './rightActionData';
import type { PracticeClassKey } from '../../utils/practiceClassCatalog';
import { MovementPad } from './MovementPad';
import './CommandGuidePanel.css';

const ENTRIES = buildCommandGuideEntries();
type GuideView = 'Start' | 'All' | GuideCategory;
const GOALS: Array<{ title: string; description: string; category: GuideCategory; Icon: typeof Compass }> = [
    { title: 'Something is attacking me', description: 'Fight back, flee, or help an ally', category: 'Combat', Icon: Swords },
    { title: 'I want to move or explore', description: 'See the room, exits, map, or directions', category: 'Movement', Icon: Compass },
    { title: 'I want to use an ability', description: 'Find class skills and spells', category: 'Skills & spells', Icon: Sparkles },
    { title: 'I need to handle an item', description: 'Pick it up, equip it, use it, or give it', category: 'Items & equipment', Icon: Backpack },
    { title: 'I want to communicate', description: 'Talk, message someone, or organize a group', category: 'Social', Icon: MessageCircle },
    { title: 'I need information', description: 'Check yourself, players, quests, or help', category: 'Information', Icon: HelpCircle }
];
const FEATURED_COMMANDS: Record<GuideCategory, string[]> = {
    'Combat': ['kill', 'consider', 'assist', 'rescue', 'protect', 'flee', 'disengage'],
    'Skills & spells': [],
    'Movement': ['look', 'exits', 'map', 'north', 'south', 'east', 'west', 'up', 'down'],
    'Items & equipment': ['inventory', 'equipment', 'get', 'drop', 'put', 'give', 'wear', 'remove', 'wield', 'hold'],
    'Information': ['score', 'who', 'time', 'weather', 'help', 'practice', 'quests', 'history'],
    'Social': ['say', 'tell', 'reply', 'group', 'follow', 'emote', 'gesture', 'shout', 'whisper'],
    'Other': ['open', 'close', 'use', 'rest', 'stand', 'sleep', 'wake']
};

export const CommandGuidePanel: React.FC = () => {
    const { abilities, characterClass, executeCommand } = useGame();
    const isMobile = useCommandPanelStore(state => state.isMobileGuideOpen);
    const setOpen = useCommandPanelStore(state => isMobile ? state.setIsMobileGuideOpen : state.setIsOpen);
    const requestedTab = useCommandPanelStore(state => state.requestedTab);
    const clearRequestedTab = useCommandPanelStore(state => state.clearRequestedTab);
    const setInput = useInputStore(state => state.setInput);
    const requestTargetPicker = useInputStore(state => state.requestTargetPicker);
    const [query, setQuery] = useState('');
    const [view, setView] = useState<GuideView>('Start');
    const [selectedSkillClass, setSelectedSkillClass] = useState<PracticeClassKey>(() => {
        const classKey = (characterClass || '').toLowerCase();
        return (CLASS_KEYS as string[]).includes(classKey) ? classKey as PracticeClassKey : 'warrior';
    });
    const [showAll, setShowAll] = useState(false);
    const [isFinderOpen, setIsFinderOpen] = useState(false);

    useEffect(() => {
        if (!requestedTab) return;
        setView(requestedTab === 'skills' ? 'Skills & spells' : requestedTab === 'combat' ? 'Combat' : 'All');
        setShowAll(false);
        clearRequestedTab();
    }, [clearRequestedTab, requestedTab]);

    const results = useMemo(() => {
        const normalizedQuery = query.trim().toLowerCase();
        const inView = (entry: GuideEntry): boolean => view !== 'Start' && (view === 'All' || entry.category === view);
        const ignoredWords = new Set(['a', 'an', 'the', 'to', 'for', 'of', 'with', 'me', 'my', 'i', 'want', 'need', 'do', 'how', 'can']);
        const queryTerms = normalizedQuery.split(/\s+/).filter(term => term && !ignoredWords.has(term));
        const matches = ENTRIES.filter(entry => {
            if (view === 'Skills & spells' && entry.abilityClass !== selectedSkillClass) return false;
            return normalizedQuery
                ? queryTerms.every(term => entry.searchText.includes(term))
                : inView(entry);
        });
        if (normalizedQuery || view === 'All' || showAll) return matches;
        if (view === 'Start') return [];
        if (view === 'Skills & spells') return matches;
        const featuredNames = new Set(FEATURED_COMMANDS[view]);
        return matches.filter(entry => featuredNames.has(entry.name.toLowerCase())).slice(0, 12);
    }, [query, selectedSkillClass, showAll, view]);

    const categoryCount = view === 'All' ? ENTRIES.length : view === 'Start' ? 0 : ENTRIES.filter(entry => (
        entry.category === view && (view !== 'Skills & spells' || entry.abilityClass === selectedSkillClass)
    )).length;

    const stage = (entry: GuideEntry) => {
        if (entry.isPassive) return;
        const command = entry.command.replace(/(?:\s+<target(?:\s+\d+)?>)+\s*$/i, ' ');
        setInput(command);
        if (entry.needsTarget) requestTargetPicker();
        window.setTimeout(() => document.getElementById('mud-input')?.focus(), 50);
    };

    const isKnown = (entry: GuideEntry): boolean | null => {
        if (!entry.abilityClass) return null;
        return (abilities[entry.name.toLowerCase()] || 0) > 0;
    };

    return <aside className="command-guide-panel" aria-label="Command guide">
        <header className="command-guide-heading">
            <span className="command-guide-prompt">&gt;</span>
            <BookOpen size={15} aria-hidden="true" />
            <strong>command guide</strong>
            {query ? <span className="command-guide-count">{results.length} matches</span>
                : view !== 'Start' && <span className="command-guide-count">{categoryCount} entries</span>}
            <button type="button" className="command-guide-close" aria-label="Close command guide" onClick={() => setOpen(false)}><X size={16} /></button>
        </header>

        {!query && view === 'Start' && <div className="command-guide-start">
            <h2>What do you want to do?</h2>
            <p>Choose what you’re trying to do. I’ll show a few ways to do it.</p>
            <div className="command-guide-goals">{GOALS.map(({ title, description, category: goalCategory, Icon }) => {
                return <button key={title} type="button" className="command-guide-goal" onClick={() => { setView(goalCategory); setShowAll(false); }}>
                    <Icon size={16} aria-hidden="true" />
                    <span><strong>{title}</strong><small>{description}</small></span>
                    <span className="command-guide-goal-arrow" aria-hidden="true">›</span>
                </button>;
            })}</div>
            <button type="button" className="command-guide-browse-all" onClick={() => { setView('All'); setShowAll(true); }}>Browse the full command reference</button>
        </div>}

        <div className={`command-guide-finder${isFinderOpen ? ' is-open' : ''}`}>
            <button type="button" className="command-guide-finder-toggle" aria-expanded={isFinderOpen} onClick={() => {
                setIsFinderOpen(open => !open);
                if (isFinderOpen) setQuery('');
            }}>
                <Search size={14} aria-hidden="true" />
                <span><strong>{query ? 'Finding a specific action' : 'Need a specific action?'}</strong><small>Describe what you want to do</small></span>
                <span aria-hidden="true">{isFinderOpen ? '−' : '+'}</span>
            </button>
            {isFinderOpen && <label className="command-guide-search">
                <input autoFocus value={query} onChange={event => setQuery(event.target.value)} placeholder="e.g. find an exit, heal an ally, equip armor" aria-label="Describe the action you want to do" />
                {query && <button type="button" aria-label="Clear search" onClick={() => setQuery('')}><X size={13} /></button>}
            </label>}
        </div>

        {(query || view !== 'Start') && <div className="command-guide-results-heading">
            <button type="button" onClick={() => { setQuery(''); setView('Start'); setShowAll(false); }}>‹ Choose another goal</button>
            <strong>{query ? 'Search results' : view}</strong>
            {!query && view !== 'All' && view !== 'Skills & spells' && !showAll && <span>Showing suggested entries</span>}
        </div>}

        {view === 'Skills & spells' && <div className="command-guide-class-tabs" role="tablist" aria-label="Skill classes">
            {CLASS_KEYS.map(classKey => <button key={classKey} type="button" role="tab"
                aria-selected={selectedSkillClass === classKey}
                className={`command-guide-class-tab${selectedSkillClass === classKey ? ' is-active' : ''}`}
                onClick={() => { setSelectedSkillClass(classKey); setShowAll(false); }}>
                {selectedSkillClass === classKey ? `[ ${classKey} ]` : classKey}
            </button>)}
        </div>}

        {(query || view !== 'Start') && <div className="command-guide-results" role="region" aria-label="Command reference results">
            {results.length === 0 ? <p className="command-guide-empty">No matching commands. Try a shorter search.</p> : results.map(entry => {
                const known = isKnown(entry);
                const content = <>
                    <span className="command-guide-entry-main">
                        <strong>{entry.name}</strong>
                        <code>{entry.isPassive ? 'passive' : entry.command}</code>
                    </span>
                    <span className="command-guide-entry-meta">
                        <small>{entry.detail}</small>
                        {known !== null && <small className={known ? 'is-known' : 'is-unknown'}>{known ? 'Learned' : 'Not learned'}</small>}
                        {entry.needsTarget && <small className="needs-target">target</small>}
                    </span>
                </>;
                return entry.isPassive
                    ? <div key={entry.id} className="command-guide-entry is-passive">{content}</div>
                    : <div key={entry.id} className="command-guide-entry-wrap">
                        <button type="button" className="command-guide-entry" onClick={() => stage(entry)} title={`Put ${entry.command} in the command bar`}>{content}</button>
                        <button type="button" className="command-guide-help" aria-label={`Get help for ${entry.name}`} title={`Send help ${entry.name.toLowerCase()}`}
                            onClick={() => executeCommand(`help ${entry.name.toLowerCase()}`)}>
                            <HelpCircle size={15} aria-hidden="true" />
                        </button>
                    </div>;
            })}
        </div>}
        {query && <p className="command-guide-hint">Select an entry to put it in the command bar. Add a target or arguments, then send.</p>}
        {!query && view !== 'Start' && view !== 'All' && !showAll && categoryCount > results.length && <button type="button" className="command-guide-show-all" onClick={() => setShowAll(true)}>Show all {categoryCount} entries</button>}
        {!query && view === 'All' && <p className="command-guide-hint">Select an entry to put it in the command bar. Add a target or arguments, then send.</p>}

        <div className="command-guide-navigation" role="region" aria-label="Movement Controls">
            <MovementPad />
        </div>
    </aside>;
};
