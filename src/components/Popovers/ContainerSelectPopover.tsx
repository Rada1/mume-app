import React from 'react';
import { PopoverState, DrawerLine, GameEntity, EntityCapability } from '../../types';
import { sanitizeGameTarget, isItemContainer } from '../../utils/gameUtils';

interface ContainerSelectProps {
    popoverState: PopoverState;
    roomItems: any[];
    inventoryLines: DrawerLine[];
    eqLines: DrawerLine[];
    entities: Record<string, GameEntity>;
    executeCommand: (cmd: string, silent?: boolean, isSystem?: boolean, isHistorical?: boolean) => void;
    setPopoverState: (val: PopoverState | null) => void;
    themeColor?: string;
}

export const ContainerSelectPopover: React.FC<ContainerSelectProps> = ({
    popoverState, roomItems, inventoryLines, eqLines, entities, executeCommand, setPopoverState, themeColor
}) => {
    const itemBeingPut = (popoverState.context || '').toLowerCase();

    // 1. Gather all potential containers from different sources
    
    // From Room / Ground
    const roomContainers = (roomItems || []).filter(item => {
        const id = item.id ? String(item.id) : `roomitems:${item.name || item.short || item.keyword}`;
        const name = (item.name || item.shortdesc || item.short || item.keyword || '').toLowerCase();
        if (!name || name === itemBeingPut) return false;
        
        // Step C: Ask the Registry for stickers
        const entity = entities[id];
        if (entity) return entity.capabilities.includes(EntityCapability.Container);
        
        // Fallback for non-scanned items
        return isItemContainer(name);
    }).map(item => ({
        id: item.id ? String(item.id) : `roomitems:${item.name || item.short || item.keyword}`,
        name: item.name || item.shortdesc || item.short || item.keyword || 'a container',
        source: 'ground'
    }));

    // From Inventory
    const invContainers = (inventoryLines || []).filter(line => {
        const name = (line.text || '').toLowerCase();
        if (!name || name === itemBeingPut) return false;
        
        const entity = entities[line.stableId || line.id];
        if (entity) return entity.capabilities.includes(EntityCapability.Container);
        
        return line.isContainer || isItemContainer(name);
    }).map(line => ({
        id: line.id,
        name: line.text,
        source: 'inventory'
    }));

    // From Equipment (e.g. worn backpack, beltpouch)
    const eqContainers = (eqLines || []).filter(line => {
        const name = (line.text || '').toLowerCase();
        if (!name || name === itemBeingPut) return false;
        
        const entity = entities[line.stableId || line.id];
        if (entity) return entity.capabilities.includes(EntityCapability.Container);
        
        return line.isContainer || isItemContainer(name);
    }).map(line => ({
        id: line.id,
        name: line.text,
        source: 'worn'
    }));

    // Combine all unique containers (simple deduplication by ID if available)
    const allContainers = [...invContainers, ...eqContainers, ...roomContainers];
    
    return (
        <>
            <div className="popover-header" style={{ padding: '8px 12px', fontSize: '0.7rem', opacity: 0.5 }}>SELECT CONTAINER</div>
            <div className="popover-scroll" style={{ maxHeight: '250px', overflowY: 'auto', minWidth: '180px' }}>
                {allContainers.length === 0 && <div className="popover-empty" style={{ padding: '20px', textAlign: 'center', opacity: 0.5 }}>No containers found.</div>}
                {allContainers.map((cont, idx) => (
                    <div
                        key={`${cont.id}-${idx}`}
                        className="popover-item"
                        data-menu-item="true"
                        onPointerDown={(e) => e.preventDefault()}
                        style={{
                            borderLeft: `3px solid ${themeColor || 'var(--accent)'}`,
                            justifyContent: 'space-between'
                        }}
                        onClick={() => {
                            const containerNoun = sanitizeGameTarget(cont.name);
                            // setId usually contains the full command like "put %n"
                            let baseCmd = popoverState.setId || 'put %n';
                            if (baseCmd.includes('%n')) {
                                baseCmd = baseCmd.replace('%n', popoverState.context || '');
                            }
                            executeCommand(`${baseCmd} ${containerNoun}`);
                            setPopoverState(null);
                        }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {cont.name}
                            </span>
                            <span style={{ 
                                fontSize: '0.6rem', 
                                opacity: 0.4, 
                                textTransform: 'uppercase', 
                                marginLeft: '8px',
                                border: '1px solid currentColor',
                                padding: '1px 3px',
                                borderRadius: '3px',
                                flexShrink: 0
                            }}>
                                {cont.source}
                            </span>
                        </div>
                    </div>
                ))}
            </div>
            <div 
                className="popover-item" 
                style={{ 
                    borderTop: '1px solid var(--border-color, rgba(255,255,255,0.1))', 
                    color: 'var(--ansi-red, #ff5555)', 
                    textAlign: 'center',
                    marginTop: '4px'
                }} 
                onClick={() => setPopoverState(null)}
            >
                Cancel
            </div>
        </>
    );
};
