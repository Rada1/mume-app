/**
 * @file useInventoryLines.ts
 * @description Hook to manage and process inventory and equipment lines for the drawer system.
 */

import { useMemo } from 'react';
import { useUI } from '../../context/GameContext';
import { DrawerLine } from '../../types';

const EQ_SLOTS = [
    '<wielded>',
    '<worn as shield>',
    '<worn on head>',
    '<worn on body>',
    '<worn about body>',
    '<worn on arms>',
    '<worn on hands>',
    '<worn on legs>',
    '<worn on feet>',
    '<worn around neck>',
    '<worn on wrist>',
    '<worn on wrist>',
    '<worn on finger>',
    '<worn on finger>',
    '<worn on back>',
    '<worn across back>',
    '<worn as belt>',
    '<worn on belt>',
    '<worn on belt>',
    '<worn on belt>',
    '<worn on belt>',
    '<worn on belt>',
    '<held>',
    '<light source>'
];

export const useInventoryLines = ({ 
    inventoryLines, 
    eqLines,
    activeTab
}: { 
    inventoryLines: DrawerLine[], 
    eqLines: DrawerLine[],
    activeTab: 'inventory' | 'equipment'
}) => {

    return useMemo(() => {
        if (activeTab === 'inventory') {
            const lines: DrawerLine[] = [];
            inventoryLines.forEach((line, idx) => {
                const isCarryingHeader = line.text.toLowerCase().includes('you are carrying');
                lines.push({ ...line, isHeader: isCarryingHeader });
                if (isCarryingHeader) {
                    lines.push({
                        id: `inv-sep-${idx}`,
                        text: '-------',
                        html: '-------',
                        isHeader: true,
                        isItem: false,
                        depth: 0,
                        cmd: 'inventorylist'
                    } as DrawerLine);
                }
            });
            return lines;
        }

        const remainingEq = [...(eqLines || [])];

        // Extract headers (like "You are using:")
        const headers = remainingEq.filter(l => l.isHeader);
        const nonHeaderLines = remainingEq.filter(l => !l.isHeader);

        const mappedSlots = EQ_SLOTS.map((slot, idx) => {
            const slotName = slot.replace(/[<>]/g, '').toLowerCase().trim();
            const matchIdx = nonHeaderLines.findIndex(l => {
                const lp = (l.prefix || '').toLowerCase();
                const cleanLp = lp.replace(/[<>]/g, '').replace(/&lt;|&gt;/gi, '').trim();
                // Check for containment or start-with to catch "wielded two-handed" etc.
                return cleanLp === slotName || cleanLp.startsWith(slotName) || cleanLp.includes(slotName);
            });

            if (matchIdx !== -1) {
                return nonHeaderLines.splice(matchIdx, 1)[0];
            }

            return {
                id: `empty-${slot}-${idx}`,
                prefix: slot.padEnd(20, ' '),
                text: 'nothing',
                html: 'nothing',
                isItem: false,
                isHeader: false,
                isContainer: false,
                depth: 0,
                cmd: 'equipmentlist'
            } as DrawerLine;
        });

        // Add separator after "You are using:" headers
        const headerWithSeparator = headers.flatMap((h, idx) => [
            h,
            {
                id: `eq-sep-${idx}`,
                text: '-------',
                html: '-------',
                isHeader: true,
                depth: 0,
                cmd: 'equipmentlist'
            } as DrawerLine
        ]);

        return [...headerWithSeparator, ...mappedSlots];
    }, [activeTab, inventoryLines, eqLines]);
};
