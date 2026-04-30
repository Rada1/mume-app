import React from 'react';
import { InlineCategoryConfig, PopoverState, MessageType } from '../../../types';
import { DEFAULT_INLINE_CATEGORIES, getButtonSetIdForCategory } from '../../../utils/categorizationUtils';
import { useUI, useGame } from '../../../context/GameContext';
import { Settings } from 'lucide-react';

interface TraitToggleSectionProps {
    popoverState: PopoverState;
    inlineCategories: InlineCategoryConfig[];
    setInlineCategories: (val: InlineCategoryConfig[] | ((prev: InlineCategoryConfig[]) => InlineCategoryConfig[])) => void;
    dynamicTraits: string[];
    triggerHaptic?: (ms: number) => void;
    addMessage?: (type: MessageType, content: string) => void;
    refreshLogHighlights?: () => void;
}

export const TraitToggleSection: React.FC<TraitToggleSectionProps> = ({
    popoverState,
    inlineCategories,
    setInlineCategories,
    dynamicTraits,
    triggerHaptic,
    addMessage,
    refreshLogHighlights
}) => {
    const { setIsSetManagerOpen, setManagerSelectedSet } = useUI();
    const { setPopoverState } = useGame();
    const [newTraitName, setNewTraitName] = React.useState('');

    const allPotentialCats = [...DEFAULT_INLINE_CATEGORIES, ...(Array.isArray(inlineCategories) ? inlineCategories : [])]
        .filter((cat, i, self) => self.findIndex(c => c.id === cat.id) === i);

    const handleToggle = (cat: InlineCategoryConfig) => {
        if (!popoverState.context) return;
        
        triggerHaptic?.(30);
        const keyword = popoverState.context.toLowerCase();
        const isTraitActive = dynamicTraits.includes(cat.id);
        
        setInlineCategories(prev => {
            const categories = Array.isArray(prev) ? [...prev] : [];
            const catIndex = categories.findIndex(c => c.id === cat.id);
            
            if (catIndex === -1) {
                // Add new category instance for this keyword if it didn't exist in custom list
                return [...categories, { ...cat, keywords: [keyword] }];
            }
            
            const targetCat = categories[catIndex];
            const keywords = targetCat.keywords || [];
            const keywordIndex = keywords.findIndex(k => k.toLowerCase() === keyword);
            
            if (keywordIndex === -1) {
                // Toggle ON
                const updatedCat = { ...targetCat, keywords: [...keywords, keyword] };
                return categories.map((c, i) => i === catIndex ? updatedCat : c);
            } else {
                // Toggle OFF
                const updatedCat = { ...targetCat, keywords: keywords.filter((_, i) => i !== keywordIndex) };
                return categories.map((c, i) => i === catIndex ? updatedCat : c);
            }
        });
        
        if (addMessage) {
            addMessage('system', `${isTraitActive ? 'Removed' : 'Added'} trait ${cat.id.toUpperCase()} for '${popoverState.context}'`);
        }
        refreshLogHighlights?.();
    };

    const handleCreateTrait = () => {
        if (!newTraitName.trim() || !popoverState.context) return;
        
        const id = `inline-${newTraitName.toLowerCase().replace(/\s+/g, '-')}`;
        const keyword = popoverState.context.toLowerCase();
        
        setInlineCategories(prev => {
            const categories = Array.isArray(prev) ? [...prev] : [];
            if (categories.some(c => c.id === id)) {
                // Already exists, just toggle it for this keyword
                const catIndex = categories.findIndex(c => c.id === id);
                const targetCat = categories[catIndex];
                const keywords = targetCat.keywords || [];
                if (!keywords.includes(keyword)) {
                    const updatedCat = { ...targetCat, keywords: [...keywords, keyword] };
                    return categories.map((c, i) => i === catIndex ? updatedCat : c);
                }
                return categories;
            }
            
            return [...categories, {
                id,
                kind: 'object',
                keywords: [keyword],
                color: '#fff',
                weight: 10
            }];
        });
        
        setNewTraitName('');
        triggerHaptic?.(50);
        refreshLogHighlights?.();
    };

    return (
        <div style={{ padding: '8px', borderBottom: '1px solid rgba(255,255,255,0.1)', marginBottom: '8px', maxHeight: '300px', overflowY: 'auto' }}>
            <div style={{ fontSize: '0.65rem', opacity: 0.5, marginBottom: '6px', textAlign: 'center' }}>MANAGE TRAITS (TOGGLE)</div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '4px', marginBottom: '8px' }}>
                {allPotentialCats.map(cat => {
                    const isTraitActive = dynamicTraits.includes(cat.id);
                    return (
                        <div 
                            key={cat.id}
                            className="popover-item"
                            style={{ 
                                position: 'relative',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: '6px', 
                                fontSize: '0.7rem', 
                                textAlign: 'center',
                                background: isTraitActive ? 'var(--accent)' : 'rgba(255,255,255,0.05)',
                                border: `1px solid ${cat.color || 'rgba(255,255,255,0.2)'}`,
                                color: isTraitActive ? '#000' : (cat.color || '#fff'),
                                borderRadius: '4px',
                                transition: 'all 0.1s ease',
                                opacity: isTraitActive ? 1 : 0.7
                            }}
                            onClick={(e) => {
                                e.stopPropagation();
                                handleToggle(cat);
                            }}
                        >
                            <span style={{ pointerEvents: 'none' }}>
                                {cat.id.replace('object-', '').replace('npc-', '').replace('inline-', '').toUpperCase()}
                            </span>
                            
                            {getButtonSetIdForCategory(cat) && (
                                <div 
                                    className="edit-set-shortcut"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setManagerSelectedSet(getButtonSetIdForCategory(cat)!);
                                        setIsSetManagerOpen(true);
                                        setPopoverState(null);
                                        triggerHaptic?.(50);
                                    }}
                                    style={{
                                        position: 'absolute',
                                        right: '2px',
                                        bottom: '2px',
                                        padding: '2px',
                                        background: 'rgba(0,0,0,0.3)',
                                        borderRadius: '3px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        zIndex: 10
                                    }}
                                    title="Edit Button Menu"
                                >
                                    <Settings size={10} style={{ color: isTraitActive ? '#000' : '#fff' }} />
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            <div style={{ display: 'flex', gap: '4px', marginTop: '8px' }}>
                <input 
                    type="text"
                    placeholder="New Trait..."
                    value={newTraitName}
                    onChange={(e) => setNewTraitName(e.target.value)}
                    onPointerDown={(e) => e.stopPropagation()}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            handleCreateTrait();
                            (e.currentTarget as HTMLInputElement).blur();
                        }
                    }}
                    style={{
                        flex: 1,
                        background: 'rgba(0,0,0,0.3)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        color: '#fff',
                        fontSize: '0.75rem',
                        padding: '4px 8px',
                        borderRadius: '4px'
                    }}
                />
                <button 
                    onClick={handleCreateTrait}
                    style={{
                        padding: '4px 10px',
                        background: 'var(--accent)',
                        color: '#000',
                        border: 'none',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        fontWeight: 'bold'
                    }}
                >
                    ADD
                </button>
            </div>
        </div>
    );
};
