import React from 'react';
import { CustomTraitConfig, PopoverState, MessageType } from '../../../types';
import { useButtonStore } from '../../../stores/useButtonStore';
import { DEFAULT_TRAIT_CONFIGS, TraitConfig, inlineConfigToTrait, isTraitConfigRecord, toTraitId } from '../../../utils/inlineActionModel';

interface TraitToggleSectionProps {
    popoverState: PopoverState;
    customTraits: CustomTraitConfig[];
    setCustomTraits: (val: CustomTraitConfig[] | ((prev: CustomTraitConfig[]) => CustomTraitConfig[])) => void;
    activeTraits: string[];
    keywordTraits: string[];
    triggerHaptic?: (ms: number) => void;
    addMessage?: (type: MessageType, content: string) => void;
    refreshLogHighlights?: () => void;
}

export const TraitToggleSection: React.FC<TraitToggleSectionProps> = ({
    popoverState,
    customTraits,
    setCustomTraits,
    activeTraits,
    keywordTraits,
    triggerHaptic,
    addMessage,
    refreshLogHighlights
}) => {
    const [newTraitName, setNewTraitName] = React.useState('');
    const { rawButtons } = useButtonStore();

    // --- Derived Data ---
    const buttonLabelById = React.useMemo(() => new Map(rawButtons.map(button => [button.id, button.label])), [rawButtons]);
    const activeTraitIds = React.useMemo(() => new Set(activeTraits.map(id => toTraitId(id) || id)), [activeTraits]);
    const keywordTraitIds = React.useMemo(() => new Set(keywordTraits.map(id => toTraitId(id) || id)), [keywordTraits]);
    const allPotentialTraits = React.useMemo(() => {
        const userTraits = (Array.isArray(customTraits) ? customTraits : [])
            .filter(isTraitConfigRecord)
            .map(inlineConfigToTrait);
        const byId = new Map<string, TraitConfig>();
        [...DEFAULT_TRAIT_CONFIGS, ...userTraits].forEach(trait => byId.set(trait.id, trait));
        return Array.from(byId.values()).sort((a, b) => a.label.localeCompare(b.label));
    }, [customTraits]);

    // --- Logic Section ---
    const handleToggle = (trait: TraitConfig) => {
        if (!popoverState.context) return;
        
        triggerHaptic?.(30);
        const keyword = popoverState.context.toLowerCase();
        const isTraitActive = keywordTraitIds.has(trait.id);
        
        setCustomTraits(prev => {
            const traits = Array.isArray(prev) ? [...prev] : [];
            const traitIndex = traits.findIndex(c => isTraitConfigRecord(c) && (toTraitId(c.id) || c.id) === trait.id);
            
            if (traitIndex === -1) {
                return [...traits, {
                    id: trait.id,
                    kind: trait.kind || 'object',
                    keywords: [keyword],
                    buttonIds: trait.buttonIds || []
                }];
            }
            
            const targetTrait = traits[traitIndex];
            const keywords = targetTrait.keywords || [];
            const keywordIndex = keywords.findIndex(k => k.toLowerCase() === keyword);
            
            if (keywordIndex === -1) {
                const updatedTrait = { ...targetTrait, keywords: [...keywords, keyword] };
                return traits.map((c, i) => i === traitIndex ? updatedTrait : c);
            }

            const updatedTrait = { ...targetTrait, keywords: keywords.filter((_, i) => i !== keywordIndex) };
            return traits.map((c, i) => i === traitIndex ? updatedTrait : c);
        });
        
        if (addMessage) {
            addMessage('system', `${isTraitActive ? 'Removed' : 'Added'} ${trait.label} for '${popoverState.context}'`);
        }
        refreshLogHighlights?.();
    };

    const handleCreateTrait = () => {
        if (!newTraitName.trim() || !popoverState.context) return;
        
        const id = `trait-${newTraitName.toLowerCase().replace(/\s+/g, '-')}`;
        const keyword = popoverState.context.toLowerCase();
        
        setCustomTraits(prev => {
            const traits = Array.isArray(prev) ? [...prev] : [];
            if (traits.some(c => c.id === id)) {
                const traitIndex = traits.findIndex(c => c.id === id);
                const targetTrait = traits[traitIndex];
                const keywords = targetTrait.keywords || [];
                if (!keywords.includes(keyword)) {
                    const updatedTrait = { ...targetTrait, keywords: [...keywords, keyword] };
                    return traits.map((c, i) => i === traitIndex ? updatedTrait : c);
                }
                return traits;
            }
            
            return [...traits, {
                id,
                kind: 'object',
                keywords: [keyword],
                buttonIds: []
            }];
        });
        
        setNewTraitName('');
        triggerHaptic?.(50);
        refreshLogHighlights?.();
    };

    return (
        <div style={{ padding: '8px', borderBottom: '1px solid rgba(255,255,255,0.1)', marginBottom: '8px', maxHeight: '300px', overflowY: 'auto' }}>
            <div style={{ fontSize: '0.65rem', opacity: 0.5, marginBottom: '6px', textAlign: 'center' }}>CATEGORY - TRAITS - BUTTONS</div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '4px', marginBottom: '8px' }}>
                {allPotentialTraits.map(trait => {
                    const isTraitActive = activeTraitIds.has(trait.id);
                    const isKeywordTrait = keywordTraitIds.has(trait.id);
                    const buttonLabels = trait.buttonIds
                        .map(buttonId => buttonLabelById.get(buttonId) || buttonId.replace(/^btn-/, ''))
                        .join(', ');
                    return (
                        <div
                            key={trait.id}
                            className="popover-item"
                            style={{
                                position: 'relative',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'flex-start',
                                justifyContent: 'center',
                                padding: '6px 7px',
                                fontSize: '0.7rem',
                                textAlign: 'left',
                                background: isTraitActive ? 'var(--accent)' : 'rgba(255,255,255,0.05)',
                                border: '1px solid rgba(255,255,255,0.2)',
                                color: isTraitActive ? '#000' : '#fff',
                                borderRadius: '4px',
                                transition: 'all 0.1s ease',
                                opacity: isTraitActive ? 1 : 0.7,
                                cursor: 'pointer',
                                minHeight: '44px'
                            }}
                            onClick={(e) => {
                                e.stopPropagation();
                                handleToggle(trait);
                            }}
                        >
                            <span style={{ pointerEvents: 'none', fontWeight: 700 }}>
                                {trait.label.toUpperCase()}
                                {isTraitActive && !isKeywordTrait ? (
                                    <span style={{ opacity: 0.55, marginLeft: '4px', fontSize: '0.55rem' }}>DEFAULT</span>
                                ) : null}
                            </span>
                            <span style={{ pointerEvents: 'none', fontSize: '0.58rem', opacity: 0.68, marginTop: '2px', lineHeight: 1.2 }}>
                                {buttonLabels || 'No buttons assigned'}
                            </span>
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
