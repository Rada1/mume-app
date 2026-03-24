import React from 'react';
import { useGame, useUI, useVitals } from '../../context/GameContext';
import { getCommonActions } from '../../utils/actionUtils';
import { getEffectiveKeyword } from '../../utils/keywordUtils';
import { CustomButton } from '../../types';

export const MultiSelectToolbar: React.FC = () => {
    const { 
        btn, 
        entities, 
        inlineCategories, 
        triggerHaptic, 
        handleButtonClick,
        roomNpcs,
        selectedObjectIds,
        clearObjectSelection,
        keywordOverrides
    } = useGame();
    
    const selectedEntries = Array.from(selectedObjectIds || []) as string[];
    if (selectedEntries.length === 0) return null;

    const commonActions = getCommonActions(
        selectedEntries,
        'inline-obj-char',
        {
            buttons: btn.buttons,
            inlineCategories,
            roomNpcs,
            entities
        }
    );

    const getEffectiveNoun = (id: string, context?: string) => {
        const entity = entities[id];
        if (entity) {
            return getEffectiveKeyword(entity.name || '', undefined, entity, keywordOverrides || {});
        }
        if (context) return context;
        
        // Final fallback: strip auto-gen prefixes
        return id.replace(/^(auto-item-|log-item-|inline-obj-|auto-npc-|auto-obj-|roomnpcs:|roomitems:|inventorylist:|equipmentlist:)/, '')
                 .replace(/-[a-f0-9]+$/, '') // Strip trailing hex IDs
                 .replace(/-/g, ' ');         // Replace remaining dashes with spaces
    };

    return (
        <div className="multi-select-toolbar">
            <div className="toolbar-header">
                <span>{selectedEntries.length} Items</span>
                <button className="clear-btn" onClick={() => clearObjectSelection()}>✕</button>
            </div>
            <div className="toolbar-actions">
                {commonActions.length > 0 ? (
                    commonActions.map(button => (
                        <div 
                            key={button.id} 
                            className="toolbar-action-btn"
                            onClick={(e) => {
                                selectedEntries.forEach(entry => {
                                    const parts = entry.split(':');
                                    const id = parts.length > 2 ? parts[1] : (parts.length === 2 ? parts[1] : parts[0]);
                                    const context = parts.length > 2 ? parts[2] : undefined;
                                    const noun = getEffectiveNoun(id, context);
                                    handleButtonClick(button, e as any, noun);
                                });
                                triggerHaptic(60);
                                clearObjectSelection();
                            }}
                        >
                            {button.label.replace(/%n/g, '').trim()}
                        </div>
                    ))
                ) : (
                    <div className="no-common-actions">
                        No common actions found.
                    </div>
                )}
            </div>
        </div>
    );
};
