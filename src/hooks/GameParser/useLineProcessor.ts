/**
 * @file useLineProcessor.ts
 * @description Processes game output lines into structured DrawerLine objects for inventory, equipment, and containers.
 */

import { useCallback, useRef } from 'react';
import { DrawerLine, GameEntity, CaptureStage, EntityLocation, EntityCapability } from '../../types';
import { isItemContainer } from '../../utils/gameUtils';
import { getEffectiveKeyword } from '../../utils/keywordUtils';

export interface LineProcessorDeps {
    captureStage: React.MutableRefObject<CaptureStage>;
    keywordOverrides: Record<string, string>;
    extractNoun: (text: string) => string;
    detectCapabilities: (text: string, location: EntityLocation) => EntityCapability[];
    ansiConvert: { toHtml: (ansi: string) => string };
    addDiagnosticLog?: (msg: string) => void;
    tempEntitiesRef: React.MutableRefObject<Record<string, GameEntity>>;
}

export function useLineProcessor(deps: LineProcessorDeps) {
    const {
        captureStage,
        keywordOverrides,
        extractNoun,
        detectCapabilities,
        ansiConvert,
        addDiagnosticLog,
        tempEntitiesRef
    } = deps;

    const containerStackRef = useRef<{ depth: number, noun: string, context: string, stableId: string }[]>([]);
    // Track noun counts per container context to allow relative indexing (1.bread, 2.bread)
    const containerNounCountsRef = useRef<Record<string, Record<string, number>>>({});

    const createLines = useCallback((l: string, tOnly: string, lLower: string, cmd: string): DrawerLine[] => {
        const leadingSpaces = l.replace(/\x1b\[[0-9;]*m/g, '').match(/^ */)?.[0].length || 0;
        const depth = Math.floor(leadingSpaces / 3);
        const isContainer = isItemContainer(l);
        const isHdr = /you are (carrying|using|equipped with)|contains|in (?:the|your|a|his|her|its) (.*?):/i.test(lLower);
        const isNothing = lLower.includes('nothing');
        if (!isHdr && !isNothing && isContainer) addDiagnosticLog?.(`Detected container: ${tOnly}`);

        const baseAnsiHtml = ansiConvert.toHtml(l);
        let prefix = ''; let prefixHtml = ''; let mainText = tOnly; let mainHtml = baseAnsiHtml;
        
        if (cmd === 'equipmentlist') {
            const eqMatch = l.match(/^(\s*(?:\x1b\[[0-9;]*m)*<[^>]+>(?:\x1b\[[0-9;]*m)*\s*)(.*)/);
            if (eqMatch) {
                prefixHtml = ansiConvert.toHtml(eqMatch[1]);
                prefix = tOnly.match(/^<[^>]+>\s*/)?.[0] || '';
                mainHtml = ansiConvert.toHtml(eqMatch[2]);
                mainText = tOnly.replace(/^<[^>]+>\s*/, '');
            }
        }

        // Quantity Detection
        let qty = 1;
        let expansionText = mainText;
        let expansionHtml = mainHtml;

        const qtyWords = ["two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen", "twenty"];
        const qtyRegex = new RegExp(`^\\s*(${qtyWords.join('|')})\\s+(.*)`, 'i');
        const qtyMatch = mainText.match(qtyRegex);

        if (qtyMatch && !isHdr && !isNothing) {
            const word = qtyMatch[1].toLowerCase();
            const rest = qtyMatch[2];
            const units: Record<string, number> = {
                "two": 2, "three": 3, "four": 4, "five": 5, "six": 6, "seven": 7, "eight": 8, "nine": 9, "ten": 10,
                "eleven": 11, "twelve": 12, "thirteen": 13, "fourteen": 14, "fifteen": 15, "sixteen": 16, "seventeen": 17, "eighteen": 18, "nineteen": 19, "twenty": 20
            };
            qty = units[word] || 1;
            
            if (qty > 1) {
                expansionText = rest;
                expansionHtml = mainHtml.replace(new RegExp(`(^|\\s)${word}(\\s|$)`, 'i'), '$1$2').trim();
            }
        }

        const lines: DrawerLine[] = [];

        for (let i = 0; i < qty; i++) {
            let currentItemText = qty > 1 ? expansionText : mainText;
            let currentItemHtml = qty > 1 ? expansionHtml : mainHtml;
            
            const noun = extractNoun(currentItemText || l);
            
            // Singularize the text for display if we expanded it
            if (qty > 1) {
                currentItemText = noun.charAt(0).toUpperCase() + noun.slice(1);
                // We keep the original HTML but it might still have the plural word.
                // For now, we'll just use the text-based HTML or simplified HTML.
                currentItemHtml = currentItemText; 
            }
            const effectiveKeyword = getEffectiveKeyword(currentItemText || l, currentItemHtml, undefined, keywordOverrides);
            const nounForId = effectiveKeyword || noun;

            // Pop stack until we find the parent or reach root
            while (containerStackRef.current.length > 0 && containerStackRef.current[containerStackRef.current.length - 1].depth >= depth) {
                containerStackRef.current.pop();
            }

            const parent = containerStackRef.current[containerStackRef.current.length - 1];
            const parentContext = parent?.context || 'root';
            
            if (!containerNounCountsRef.current[parentContext]) {
                containerNounCountsRef.current[parentContext] = {};
            }
            
            containerNounCountsRef.current[parentContext][nounForId] = (containerNounCountsRef.current[parentContext][nounForId] || 0) + 1;
            const count = containerNounCountsRef.current[parentContext][nounForId];
            const stableId = count > 1 ? `${count}.${nounForId}` : nounForId;

            let context = stableId;
            let parentItemId = undefined;
            let parentItemNoun = undefined;

            if (depth > 0 && parent) {
                context = `${stableId}.${parent.context}`;
                parentItemId = parent.context;
                parentItemNoun = parent.stableId;
            }

            if (isContainer && i === 0) {
                containerStackRef.current.push({ depth, noun: nounForId, context, stableId });
            }

            const line: DrawerLine = {
                id: context || stableId || Math.random().toString(36).substring(7),
                text: currentItemText, html: currentItemHtml, prefix, prefixHtml,
                isItem: !isHdr && !isNothing, isHeader: isHdr, isContainer, depth, cmd, context,
                stableId,
                parentItemId, parentItemNoun,
                entityId: stableId
            };

            if (line.isItem) {
                const caps = detectCapabilities(currentItemText, captureStage.current as EntityLocation);
                const entity: GameEntity = {
                    id: stableId,
                    name: currentItemText,
                    noun: noun,
                    location: (captureStage.current === 'container' ? `container:${parentItemNoun}` : captureStage.current) as EntityLocation,
                    parentId: parentItemNoun,
                    capabilities: caps,
                    shortDesc: currentItemText
                };
                tempEntitiesRef.current[stableId] = entity;
            }

            lines.push(line);
        }

        return lines;
    }, [captureStage, keywordOverrides, extractNoun, detectCapabilities, ansiConvert, addDiagnosticLog, tempEntitiesRef]);

    const resetNounCounts = useCallback(() => {
        containerNounCountsRef.current = {};
    }, []);

    const resetContainerStack = useCallback(() => {
        containerStackRef.current = [];
    }, []);

    return { createLines, resetNounCounts, resetContainerStack };
}
