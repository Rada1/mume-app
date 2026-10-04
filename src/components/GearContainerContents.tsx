/** @file GearContainerContents.tsx — Nested gear list with level-scoped selection. */

import React from 'react';
import type { GearContainerContentsProps, GearSelectionItem } from '../types';
import { toGearRow } from '../utils/gearPanelUtils';
import { GearSelectionCheckbox } from './GearSelectionCheckbox';

// --- Render Section ---
export const GearContainerContents: React.FC<GearContainerContentsProps> = ({
    container, keyPrefix, section, contents, loaded, isScopeLocked, getScopeCount, onSelectAll, renderChild
}) => {
    const levelItems = contents.flatMap((line, index) => {
        const row = toGearRow(line);
        return row ? [{ id: `${keyPrefix}:${line.id}:${index}`, row, section, parentNoun: container.noun, parentId: container.line.id }] : [];
    });
    const notes = contents.filter(line => !toGearRow(line));
    const selectedCount = getScopeCount(levelItems);
    return <div className="gear-container-contents" data-object-drop-container={container.line.id}
        data-object-drop-noun={container.noun} data-object-drop-label={container.name}>
        {levelItems.length ? <>
            <div className="gear-container-level-heading">
                <span>contents ({levelItems.length})</span>
                <GearSelectionCheckbox checked={levelItems.length > 0 && selectedCount === levelItems.length}
                    mixed={selectedCount > 0 && selectedCount < levelItems.length} disabled={isScopeLocked}
                    size="large" visibleLabel="select all"
                    label={`Select all ${container.name} contents`} onChange={() => onSelectAll(levelItems)} />
            </div>
            {levelItems.map(item => renderChild(item, levelItems))}
        </> : notes.length ? notes.map((line, index) => <span className="gear-container-note" key={`${line.id}:${index}`}>{line.text}</span>)
            : <span className="gear-container-note">{loaded ? 'empty' : 'looking inside...'}</span>}
    </div>;
};

export default GearContainerContents;
