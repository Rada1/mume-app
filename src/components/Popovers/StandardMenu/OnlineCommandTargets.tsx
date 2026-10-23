/** @file OnlineCommandTargets.tsx — Collapsible who-list selections shared by actions and communications. */
import React from 'react';
import { ChevronRight } from 'lucide-react';
import type { DrawerLine, OnlineCommandTargetsProps } from '../../../types';
import { useOnlineCommandTargets } from '../../../hooks/useOnlineCommandTargets';

// --- Who Line Rendering ---
interface OnlinePlayerLineParts {
    prefix: string;
    name: string;
    description: string;
}

const getOnlinePlayerLineParts = (line: DrawerLine | undefined, name: string): OnlinePlayerLineParts => {
    const normalizedName = name.trim().toLowerCase();
    const tokens = line?.tokens;
    if (tokens?.length) {
        const playerTokenIndex = tokens.findIndex(token => token.type === 'entity'
            && token.metadata?.kind === 'player' && token.content.trim().toLowerCase() === normalizedName);
        if (playerTokenIndex >= 0) {
            return {
                prefix: `${line.prefix || ''}${tokens.slice(0, playerTokenIndex).map(token => token.content).join('')}`,
                name: tokens[playerTokenIndex].content,
                description: tokens.slice(playerTokenIndex + 1).map(token => token.content).join('')
            };
        }
    }

    const text = line?.text || name;
    const nameIndex = text.toLowerCase().indexOf(normalizedName);
    if (nameIndex < 0) return { prefix: line?.prefix || '', name, description: text };
    return {
        prefix: `${line?.prefix || ''}${text.slice(0, nameIndex)}`,
        name: text.slice(nameIndex, nameIndex + name.length),
        description: text.slice(nameIndex + name.length)
    };
};

const renderOnlinePlayerLine = (line: DrawerLine | undefined, name: string, color?: string): React.ReactNode => {
    const parts = getOnlinePlayerLineParts(line, name);
    return <>
        <span className="command-action-target-online-prefix-slot">
            {parts.prefix && <span className="command-action-target-online-prefix">{parts.prefix}</span>}
        </span>
        <span className="command-action-target-online-player-name" style={{ color: color || '#61c290' }}>{parts.name}</span>
        <span className="command-action-target-online-description">{parts.description}</span>
    </>;
};

// --- Who Line Lookup ---
const findPlayerLine = (lines: DrawerLine[], name: string) => {
    const normalizedName = name.trim().toLowerCase();
    return lines.find(line => {
        const text = line.text.trimStart().toLowerCase();
        return line.tokens?.some(token => token.type === 'entity'
            && token.metadata?.kind === 'player' && token.content.toLowerCase() === normalizedName)
            || text === normalizedName || text.startsWith(`${normalizedName} `);
    });
};

// --- Render Section ---
export const OnlineCommandTargets: React.FC<OnlineCommandTargetsProps> = ({ onSelect, onPreviewTarget, currentEntityId, color, open = false, hideHeader = false, onOpenChange, excludedNames = [] }) => {
    const online = useOnlineCommandTargets();
    const excluded = new Set(excludedNames.map(name => name.trim().toLowerCase()));
    const entries = online.entries.filter(entry => !excluded.has(entry.label.trim().toLowerCase()));
    const rows = entries.length ? entries.map(entry => {
        const line = findPlayerLine(online.whoLines, entry.label);
        return <button key={entry.id} type="button"
            className="command-action-target-option command-tree-row" aria-current={currentEntityId === entry.id ? 'true' : undefined}
            onMouseEnter={() => onPreviewTarget?.(entry)}
            onClick={() => onSelect(entry)}>
            <span className="command-action-target-online-line">{renderOnlinePlayerLine(line, entry.label, color)}</span>
        </button>;
    }) : <p className="command-action-target-empty">No online players listed yet.</p>;
    React.useEffect(() => {
        if (hideHeader && open) online.refresh();
    }, [hideHeader, online.refresh, open]);
    if (hideHeader) return <div className="command-action-target-group" aria-label="Online Players"
        onMouseEnter={() => { onOpenChange?.(true); online.refresh(); }}
        onMouseLeave={() => onOpenChange?.(false)}>{rows}</div>;
    return <details className="command-action-target-group" aria-label="Online Players" open={open}
        onMouseEnter={() => { onOpenChange?.(true); online.refresh(); }}
        onMouseLeave={() => onOpenChange?.(false)}
        onToggle={event => { onOpenChange?.(event.currentTarget.open); if (event.currentTarget.open) online.refresh(); }}>
        <summary><ChevronRight className="command-action-target-chevron" size={12} aria-hidden="true" /><span>Online Players</span><small>{entries.length}</small></summary>
        {rows}
    </details>;
};
