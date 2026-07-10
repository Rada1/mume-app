/**
 * @file ShaperEntityInfoButton.tsx
 * @description Inline stat/info popover for Shaper room mob and object resets.
 */

import { useMemo, useState } from 'react';
import { Info, X } from 'lucide-react';
import { useShaperEntityStore } from '../model/useShaperEntityStore';
import './ShaperEntityInfoButton.css';

interface ShaperEntityInfoButtonProps {
    kind: 'mob' | 'object';
    vnum: string;
}

const parseVnum = (value: string): number | null => {
    const parsed = Number(value.trim());
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

// --- Component Section ---
export const ShaperEntityInfoButton: React.FC<ShaperEntityInfoButtonProps> = ({ kind, vnum }) => {
    const [open, setOpen] = useState(false);
    const parsedVnum = useMemo(() => parseVnum(vnum), [vnum]);
    const stats = useShaperEntityStore(state =>
        parsedVnum ? kind === 'mob' ? state.mobileStats[parsedVnum] : state.objectStats[parsedVnum] : undefined);
    const loading = useShaperEntityStore(state => parsedVnum ? !!state.loadingStats[parsedVnum] : false);
    const loadMobileStats = useShaperEntityStore(state => state.loadMobileStats);
    const loadObjectStats = useShaperEntityStore(state => state.loadObjectStats);
    const loadMobileInfo = useShaperEntityStore(state => state.loadMobileInfo);
    const loadObjectInfo = useShaperEntityStore(state => state.loadObjectInfo);

    const requestInfo = () => {
        if (!parsedVnum) return;
        if (kind === 'mob') {
            loadMobileStats(parsedVnum);
            loadMobileInfo(parsedVnum);
        } else {
            loadObjectStats(parsedVnum);
            loadObjectInfo(parsedVnum);
        }
    };

    const toggle = (event: React.MouseEvent) => {
        event.stopPropagation();
        const next = !open;
        setOpen(next);
        if (next) requestInfo();
    };

    if (!parsedVnum) return null;

    return (
        <span className="shaper-entity-info">
            <button
                type="button"
                className="shaper-entity-info-trigger"
                onClick={toggle}
                title={`Show /stat and /info for ${kind} ${parsedVnum}`}
                aria-expanded={open}
            >
                <Info size={13} />
            </button>
            {open && (
                <span
                    className="shaper-entity-info-popover"
                    role="dialog"
                    aria-label={`${kind} ${parsedVnum} stats and info`}
                    onClick={event => event.stopPropagation()}
                >
                    <span className="shaper-entity-info-head">
                        <strong>{kind === 'mob' ? 'Mobile' : 'Object'} {parsedVnum}</strong>
                        <button type="button" onClick={() => setOpen(false)} aria-label="Close entity info">
                            <X size={13} />
                        </button>
                    </span>
                    {loading && <span className="shaper-entity-info-loading">Loading live /stat...</span>}
                    {stats ? (
                        <>
                            <span className="shaper-entity-info-name">{stats.name}</span>
                            {stats.info && (
                                <>
                                    <strong className="shaper-entity-info-label">/info</strong>
                                    <pre>{stats.info}</pre>
                                </>
                            )}
                            <strong className="shaper-entity-info-label">/stat</strong>
                            <pre>{stats.rawText || 'No /stat output captured yet.'}</pre>
                        </>
                    ) : (
                        <span className="shaper-entity-info-empty">No cached data yet. Connect to MUME to load it.</span>
                    )}
                </span>
            )}
        </span>
    );
};
