/**
 * @file ShaperEntityLibraries.tsx
 * @description Inline /lib install editor for room entities in Shaper.
 */

import { useEffect, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { SHAPER_LIBRARY_CATALOG } from '../model/shaperLibraryCatalog';
import type { ShaperLibraryInstall, ShaperLibraryTargetType } from '../model/shaperTypes';
import { ShaperLibraryInstallCard } from './ShaperLibraryPanel';

interface ShaperEntityLibrariesProps {
    targetType: ShaperLibraryTargetType;
    targetId: string;
    libraries: ShaperLibraryInstall[];
    onAddLibrary: (targetType: ShaperLibraryTargetType, targetId: string, name: string) => void;
    onRemoveLibrary: (id: string) => void;
    onSetParam: (id: string, key: string, value: string) => void;
    onRemoveParam: (id: string, key: string) => void;
    onToggleLoad: (id: string) => void;
    onUpdateNotes: (id: string, notes: string) => void;
}

// --- Component Section ---
export const ShaperEntityLibraries: React.FC<ShaperEntityLibrariesProps> = ({
    targetType,
    targetId,
    libraries,
    onAddLibrary,
    onRemoveLibrary,
    onSetParam,
    onRemoveParam,
    onToggleLoad,
    onUpdateNotes
}) => {
    const [collapsed, setCollapsed] = useState(libraries.length === 0);
    const redressNames = targetType === 'mobile'
        ? new Set(['redress-mob', 'redress-corpse'])
        : new Set(['redress-obj']);
    const catalog = [
        ...SHAPER_LIBRARY_CATALOG[targetType],
        ...SHAPER_LIBRARY_CATALOG.room.filter(entry => redressNames.has(entry.name))
    ];
    const installedNames = new Set(libraries.map(install => install.name));

    useEffect(() => {
        if (libraries.length > 0) setCollapsed(false);
    }, [libraries.length]);

    return (
        <div className="shaper-entity-libraries">
            <button
                type="button"
                className="shaper-entity-libraries-toggle"
                onClick={() => setCollapsed(!collapsed)}
                title={collapsed ? 'Show libraries' : 'Hide libraries'}
            >
                {collapsed ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
                <span>/lib</span>
                <strong>{libraries.length}</strong>
                {collapsed && libraries.length > 0 && (
                    <small>{libraries.map(install => install.name).join(', ')}</small>
                )}
            </button>
            {!collapsed && (
                <div className="shaper-entity-libraries-body">
                    {libraries.map(install => (
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
                    <label className="shaper-field mb-0">
                        <span>Add /lib</span>
                        <select
                            value=""
                            onChange={event => {
                                if (event.target.value) onAddLibrary(targetType, targetId, event.target.value);
                            }}
                        >
                            <option value="">Choose library</option>
                            {catalog.map(entry => (
                                <option key={entry.name} value={entry.name} disabled={installedNames.has(entry.name)}>
                                    {entry.name}
                                </option>
                            ))}
                        </select>
                    </label>
                </div>
            )}
            {collapsed && libraries.length === 0 && (
                <select
                    className="shaper-entity-libraries-quick-add"
                    value=""
                    onChange={event => {
                        if (event.target.value) {
                            onAddLibrary(targetType, targetId, event.target.value);
                            setCollapsed(false);
                        }
                    }}
                >
                    <option value="">Choose library</option>
                    {catalog.map(entry => (
                        <option key={entry.name} value={entry.name} disabled={installedNames.has(entry.name)}>
                            {entry.name}
                        </option>
                    ))}
                </select>
            )}
        </div>
    );
};
