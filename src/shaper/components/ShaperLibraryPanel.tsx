/**
 * @file ShaperLibraryPanel.tsx
 * @description Browse the /lib catalog and manage installs on the selected
 *              room, or on a mobile/object vnum.
 */

import { useMemo, useState } from 'react';
import { findShaperLibraryEntry, SHAPER_LIBRARY_CATALOG } from '../model/shaperLibraryCatalog';
import { listShaperLibraries } from '../model/shaperLibraries';
import type {
    ShaperLibraryInstall,
    ShaperLibraryTargetType,
    ShaperRoomDraft,
    ShaperWorkspaceDoc
} from '../model/shaperTypes';
import { ShaperContextHelpButton } from './ShaperContextHelpButton';
import './ShaperLibraryPanel.css';

interface ShaperLibraryPanelProps {
    libraries: ShaperWorkspaceDoc['libraries'];
    selectedRoom: ShaperRoomDraft;
    onAddLibrary: (targetType: ShaperLibraryTargetType, targetId: string, name: string) => void;
    onRemoveLibrary: (id: string) => void;
    onSetParam: (id: string, key: string, value: string) => void;
    onRemoveParam: (id: string, key: string) => void;
    onToggleLoad: (id: string) => void;
    onUpdateNotes: (id: string, notes: string) => void;
}

const TARGET_TYPES: ShaperLibraryTargetType[] = ['room', 'mobile', 'object'];
const PARAM_PLACEHOLDERS: Record<string, string> = {
    object: 'obj 9902 or 9902',
    mobile: 'mob 6113 or 6113',
    keywords: 'watchtower tower',
    'short-desc': 'a watchtower is here',
    'long-desc': 'A crumbling watchtower rises above the hills.',
    'plural-desc': 'watchtowers',
    'full-desc': 'A withered wooden watchtower slumps beside the old road.',
    ptype: 'the, a, an',
    direction: 'n, e, s, w, u, d',
    delay: '0',
    act: 'Message or action text'
};

const placeholderForParam = (key: string): string =>
    PARAM_PLACEHOLDERS[key] ?? 'value';

// --- Param Editor Section ---
export const ShaperLibraryInstallCard: React.FC<{
    install: ShaperLibraryInstall;
    onRemoveLibrary: (id: string) => void;
    onSetParam: (id: string, key: string, value: string) => void;
    onRemoveParam: (id: string, key: string) => void;
    onToggleLoad: (id: string) => void;
    onUpdateNotes: (id: string, notes: string) => void;
}> = ({ install, onRemoveLibrary, onSetParam, onRemoveParam, onToggleLoad, onUpdateNotes }) => {
    const [key, setKey] = useState('');
    const [value, setValue] = useState('');
    const catalogEntry = findShaperLibraryEntry('room', install.name)
        ?? findShaperLibraryEntry(install.targetType, install.name);
    const parameterKeys = Array.from(new Set([
        ...(catalogEntry?.parameterKeys ?? []),
        ...Object.keys(install.parameters)
    ]));

    const addParam = () => {
        if (!key.trim()) return;
        onSetParam(install.id, key, value);
        setKey('');
        setValue('');
    };

    return (
        <div className="shaper-lib-install">
            <div className="shaper-lib-install-head">
                <strong>{install.name}</strong>
                <ShaperContextHelpButton topic={`library-${install.targetType}`} label="Help" />
                {install.requiresSupervisorReview && <span className="shaper-lib-badge review">supervisor review</span>}
                <button type="button" className="shaper-lib-remove" onClick={() => onRemoveLibrary(install.id)}>Remove</button>
            </div>

            <label className="shaper-lib-load">
                <input type="checkbox" checked={install.requiresLoad} onChange={() => onToggleLoad(install.id)} />
                <span>Needs /lib load before active</span>
            </label>

            <div className="shaper-lib-params">
                {parameterKeys.map(paramKey => (
                    <div key={paramKey} className="shaper-lib-param-row">
                        <span className="shaper-lib-param-key">{paramKey}</span>
                        {paramKey.includes('desc') || paramKey === 'act' ? (
                            <textarea
                                value={String(install.parameters[paramKey] ?? '')}
                                rows={paramKey === 'full-desc' ? 3 : 2}
                                placeholder={placeholderForParam(paramKey)}
                                onChange={event => onSetParam(install.id, paramKey, event.target.value)}
                            />
                        ) : (
                            <input
                                value={String(install.parameters[paramKey] ?? '')}
                                placeholder={placeholderForParam(paramKey)}
                                onChange={event => onSetParam(install.id, paramKey, event.target.value)}
                            />
                        )}
                        <button type="button" onClick={() => onRemoveParam(install.id, paramKey)}>x</button>
                    </div>
                ))}
                <div className="shaper-lib-param-row">
                    <input placeholder="parameter" value={key} onChange={event => setKey(event.target.value)} />
                    <input placeholder="value" value={value} onChange={event => setValue(event.target.value)} />
                    <button type="button" onClick={addParam}>Set</button>
                </div>
            </div>

            <textarea
                className="shaper-lib-notes"
                placeholder="Notes (e.g. why this library, reboot needs)"
                value={install.notes}
                rows={2}
                onChange={event => onUpdateNotes(install.id, event.target.value)}
            />
        </div>
    );
};

// --- Component Section ---
export const ShaperLibraryPanel: React.FC<ShaperLibraryPanelProps> = ({
    libraries,
    selectedRoom,
    onAddLibrary,
    onRemoveLibrary,
    onSetParam,
    onRemoveParam,
    onToggleLoad,
    onUpdateNotes
}) => {
    const [targetType, setTargetType] = useState<ShaperLibraryTargetType>('room');
    const [vnum, setVnum] = useState('');
    const [search, setSearch] = useState('');

    const targetId = targetType === 'room' ? selectedRoom.id : vnum.trim();
    const targetLabel = targetType === 'room' ? selectedRoom.roomNumber : vnum.trim();

    const fakeDoc = useMemo(() => ({ libraries } as ShaperWorkspaceDoc), [libraries]);
    const installed = useMemo(
        () => targetId ? listShaperLibraries(fakeDoc, targetType, targetId) : [],
        [fakeDoc, targetType, targetId]
    );
    const installedNames = useMemo(() => new Set(installed.map(install => install.name)), [installed]);

    const catalog = useMemo(() => {
        const term = search.trim().toLowerCase();
        return SHAPER_LIBRARY_CATALOG[targetType].filter(entry =>
            !term || entry.name.includes(term) || entry.description.toLowerCase().includes(term));
    }, [targetType, search]);

    return (
        <section className="shaper-lib-panel">
            <div className="shaper-lib-targets">
                {TARGET_TYPES.map(type => (
                    <button
                        key={type}
                        type="button"
                        className={targetType === type ? 'active' : ''}
                        onClick={() => setTargetType(type)}
                    >
                        {type}
                    </button>
                ))}
                <ShaperContextHelpButton topic={`library-${targetType}`} label="Lib help" />
            </div>

            <div className="shaper-lib-target-id">
                {targetType === 'room' ? (
                    <span>Target room <strong>{selectedRoom.roomNumber}</strong></span>
                ) : (
                    <label className="shaper-field">
                        <span>{targetType} vnum</span>
                        <input value={vnum} onChange={event => setVnum(event.target.value)} placeholder="e.g. 1313" />
                    </label>
                )}
            </div>

            {!targetId ? (
                <p className="shaper-lib-empty">Enter a {targetType} vnum to manage its libraries.</p>
            ) : (
                <>
                    <div className="shaper-lib-installed">
                        <h4>Installed on {targetLabel} ({installed.length})</h4>
                        {installed.length === 0
                            ? <p className="shaper-lib-empty">No libraries installed yet.</p>
                            : installed.map(install => (
                                <ShaperLibraryInstallCard
                                    key={install.id}
                                    install={install}
                                    onRemoveLibrary={onRemoveLibrary}
                                    onSetParam={onSetParam}
                                    onRemoveParam={onRemoveParam}
                                    onToggleLoad={onToggleLoad}
                                    onUpdateNotes={onUpdateNotes}
                                />
                            ))}
                    </div>

                    <div className="shaper-lib-catalog">
                        <div className="shaper-lib-catalog-head">
                            <h4>{targetType} catalog</h4>
                            <ShaperContextHelpButton topic={`library-${targetType}`} label="Catalog help" />
                            <input placeholder="Search" value={search} onChange={event => setSearch(event.target.value)} />
                        </div>
                        {catalog.map(entry => (
                            <div key={entry.name} className="shaper-lib-catalog-row">
                                <div>
                                    <strong>{entry.name}</strong>
                                    {entry.supervisorReview && <span className="shaper-lib-badge review">review</span>}
                                    <p>{entry.description}</p>
                                </div>
                                <button
                                    type="button"
                                    disabled={installedNames.has(entry.name)}
                                    onClick={() => onAddLibrary(targetType, targetId, entry.name)}
                                >
                                    {installedNames.has(entry.name) ? 'Added' : 'Add'}
                                </button>
                            </div>
                        ))}
                    </div>
                </>
            )}
        </section>
    );
};
