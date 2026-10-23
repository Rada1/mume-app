/** @file objectSaddleTracker.ts — Keeps saddle ownership in sync after mount actions. */
import type { Dispatch, SetStateAction } from 'react';
import type { DrawerLine, EntityLocation } from '../../types';
import { useCorpseContentsStore } from '../../stores/useCorpseContentsStore';
import { getDrawerObjectKeyword } from '../../objects/objectTargetModel';
import { findDrawerItemOccurrence } from './usePendingObjectCommand';
import { extractMumeKeyword } from '../../utils/keywordUtils';
import { isLikelyCargoLine } from '../../utils/mountCargoUtils';

interface ObjectSaddleTrackerDeps {
    roomNum?: number;
    inventoryLines?: DrawerLine[];
    setInventoryLines: Dispatch<SetStateAction<DrawerLine[]>>;
    registerEntity?: (id: string, name: string, location: EntityLocation, category?: string) => unknown;
    onSaddle?: () => void;
    onUnsaddle?: (mount: string) => void;
}

type GetArguments = (verbs: string[]) => string[];

const normalizeCommandTarget = (target: string): string => target.trim().toLowerCase().replace(/\s+/g, ' ');

// --- Mount Snapshot Resolution ---
const findMountContainer = (mount: string | undefined, responseName: string, roomNum?: number): string | undefined => {
    const store = useCorpseContentsStore.getState();
    const prefix = roomNum === undefined ? 'command-mount:' : `command-mount:${roomNum}:`;
    const candidates = Object.entries(store.containerTargets).filter(([id]) => id.startsWith(prefix));
    const exact = candidates.find(([, target]) => mount && normalizeCommandTarget(target) === normalizeCommandTarget(mount));
    if (exact) return exact[0];
    const keyword = extractMumeKeyword(responseName).toLowerCase();
    const matching = candidates.filter(([, target]) => normalizeCommandTarget(target).replace(/^\d+\./, '') === keyword);
    return matching.length === 1 ? matching[0][0] : undefined;
};

const moveCapturedSaddleToInventory = (mount: string, responseName: string, itemSelector: string | undefined, deps: ObjectSaddleTrackerDeps): void => {
    const store = useCorpseContentsStore.getState();
    const currentRoomContainerId = findMountContainer(mount, responseName, deps.roomNum);
    const contents = currentRoomContainerId ? store.contents[currentRoomContainerId] || [] : [];
    const saddleSelector = itemSelector || 'saddle';
    const itemIndex = findDrawerItemOccurrence(contents, 'saddle', saddleSelector);

    if (currentRoomContainerId && itemIndex >= 0) {
        const saddle = contents[itemIndex];
        const inventoryId = Math.random().toString(36).slice(2, 11);
        const inventoryLine: DrawerLine = {
            ...saddle,
            id: inventoryId,
            stableId: inventoryId,
            cmd: 'inventorylist',
            context: getDrawerObjectKeyword(saddle),
            prefix: undefined,
            prefixHtml: undefined
        };
        store.updateContents(currentRoomContainerId, previous => previous.filter((_, index) => index !== itemIndex));
        deps.setInventoryLines(previous => [...previous, inventoryLine]);
        deps.registerEntity?.(`item:${saddle.text.toLowerCase()}`, saddle.text, 'carried', 'cat-inventory-object');
    }
};

// --- Confirmed Saddle Actions ---
export const trackSaddleAction = (
    textOnly: string,
    getArguments: GetArguments,
    clear: () => void,
    deps: ObjectSaddleTrackerDeps
): boolean => {
    const dropBelongings = textOnly.match(/^You make (.+?) drop (?:his|her|its|their) belongings\.$/i);
    if (dropBelongings) {
        const [mount] = getArguments(['unsaddle']);
        const containerId = findMountContainer(mount, dropBelongings[1], deps.roomNum);
        if (containerId) useCorpseContentsStore.getState().updateContents(containerId, lines => lines.filter(line =>
            !isLikelyCargoLine(line) || /\b(?:worn|wielded|held)\b/i.test(line.prefix || '')
        ));
        clear();
        return true;
    }

    if (/^You put (?:an?\s+|the\s+|your\s+)?saddle on .+ back\.$/i.test(textOnly)) {
        const saddle = (deps.inventoryLines || []).find(line =>
            line.isItem && !line.isHeader && getDrawerObjectKeyword(line) === 'saddle'
        );
        if (saddle) {
            const objectId = saddle.stableId || saddle.entityId || saddle.id;
            deps.setInventoryLines(previous => previous.filter(line =>
                (line.stableId || line.entityId || line.id) !== objectId
            ));
        }
        clear();
        deps.onSaddle?.();
        return true;
    }

    const unsaddle = textOnly.match(/^You unsaddle (.+)\.$/i);
    if (!unsaddle) return false;
    const [mount, itemSelector] = getArguments(['unsaddle']);
    if (!mount) return false;
    moveCapturedSaddleToInventory(mount, unsaddle[1], itemSelector, deps);
    clear();
    deps.onUnsaddle?.(mount);
    return true;
};
