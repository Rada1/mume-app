/**
 * @file CompactItemReference.tsx
 * @description Dense, glanceable gear/inventory reference for the desktop HUD.
 */

import React, { FC } from 'react';
import { useGame } from '../../context/GameContext';
import { DrawerLine } from '../../types';
import { classifyItemTier } from '../../utils/itemTier';
import './CompactItemReference.css';

interface CompactItemReferenceProps {
    kind: 'equipment' | 'inventory';
}

const itemLabel = (line: DrawerLine) => (line.text || line.rawText || '')
    // Telnet colour sequences and MUME's object/location XML are useful to the
    // full drawer parser, but make a dense visual reference unreadable.
    .replace(/\x1B\[[0-?]*[ -/]*[@-~]/g, '')
    .replace(/<[^>]*>/g, '')
    .replace(/&(?:nbsp|#160);/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    // This is a visual loadout reference, not an item-condition readout.
    .replace(/\s*\([^)]*\)/g, '')
    .replace(/\s+/g, ' ')
    .trim();

export const CompactItemReference: FC<CompactItemReferenceProps> = ({ kind }) => {
    const { eqLines, inventoryLines } = useGame() as ReturnType<typeof useGame> & {
        eqLines: DrawerLine[];
        inventoryLines: DrawerLine[];
    };
    const isEquipment = kind === 'equipment';
    const lines = (isEquipment ? eqLines : inventoryLines)
        .filter(line => line.isItem !== false && !line.isHeader)
        .map(line => ({
            label: itemLabel(line),
            tier: classifyItemTier(line.rawText || line.text || '').tier
        }))
        .filter(line => Boolean(line.label))
        .slice(0, 14);

    return (
        <section className="compact-item-reference" aria-label={isEquipment ? 'Equipment reference' : 'Inventory reference'}>
            <span className="compact-item-reference-title">{isEquipment ? 'Equipment' : 'Inventory'}</span>
            <div className="compact-item-reference-list">
                {lines.length ? lines.map((line, index) => (
                    <span
                        className={`compact-item-reference-line${line.tier ? ` inline-item-tier-${line.tier}` : ''}`}
                        title={line.label}
                        key={`${line.label}-${index}`}
                    >{line.label}</span>
                )) : <span className="compact-item-reference-empty">—</span>}
            </div>
        </section>
    );
};

export default CompactItemReference;
