import React from 'react';
import { CharacterInfo, CustomTraitConfig, PopoverState, MessageType } from '../../../types';
import { useButtonStore } from '../../../stores/useButtonStore';
import { DEFAULT_TRAIT_CONFIGS, TraitConfig, inlineConfigToTrait, isTraitConfigRecord, matchesKeyword, toggleTraitKeywords, toTraitId } from '../../../utils/inlineActionModel';
import { isButtonEligibleForCharacter } from '../../../utils/characterEligibility';

interface TraitToggleSectionProps {
    popoverState: PopoverState;
    customTraits: CustomTraitConfig[];
    setCustomTraits: (val: CustomTraitConfig[] | ((prev: CustomTraitConfig[]) => CustomTraitConfig[])) => void;
    activeTraits: string[];
    defaultTraitIds: string[];
    triggerHaptic?: (ms: number) => void;
    addMessage?: (type: MessageType, content: string) => void;
    refreshLogHighlights?: () => void;
    characterInfo?: CharacterInfo;
}

export const TraitToggleSection: React.FC<TraitToggleSectionProps> = ({
    popoverState,
    customTraits,
    setCustomTraits,
    activeTraits,
    defaultTraitIds,
    triggerHaptic,
    addMessage,
    refreshLogHighlights,
    characterInfo
}) => {
    const [newTraitName, setNewTraitName] = React.useState('');
    const { rawButtons } = useButtonStore();

    // --- Derived Data ---
    const buttonLabelById = React.useMemo(() => new Map(rawButtons.map(button => [button.id, button.label])), [rawButtons]);
    const activeTraitIds = React.useMemo(() => new Set(activeTraits.map(id => toTraitId(id) || id)), [activeTraits]);
    const defaultedTraitIds = React.useMemo(() => new Set(defaultTraitIds.map(id => toTraitId(id) || id)), [defaultTraitIds]);
    const allPotentialTraits = React.useMemo(() => {
        const userTraits = (Array.isArray(customTraits) ? customTraits : [])
            .filter(isTraitConfigRecord)
            .map(inlineConfigToTrait);
        const byId = new Map<string, TraitConfig>();
        [...DEFAULT_TRAIT_CONFIGS, ...userTraits]
            .filter(trait => isButtonEligibleForCharacter(trait.requirement, characterInfo))
            .forEach(trait => byId.set(trait.id, trait));
        return Array.from(byId.values()).sort((a, b) => a.label.localeCompare(b.label));
    }, [customTraits, characterInfo]);

    // --- Logic Section ---
    const handleToggle = (trait: TraitConfig) => {
        if (!popoverState.context) return;
        
        triggerHaptic?.(30);
        const keyword = popoverState.context.toLowerCase();
        const isTraitActive = activeTraitIds.has(trait.id);
        
        setCustomTraits(prev => {
            const traits = Array.isArray(prev) ? [...prev] : [];
            const traitIndex = traits.findIndex(c => isTraitConfigRecord(c) && (toTraitId(c.id) || c.id) === trait.id);

            const targetTrait = traitIndex === -1 ? null : traits[traitIndex];
            const keywords = targetTrait?.keywords || trait.keywords || [];
            const nextKeywords = toggleTraitKeywords(keywords, keyword, isTraitActive);
            const excludedKeywords = targetTrait?.excludedKeywords || [];
            const nextExcludedKeywords = isTraitActive
                ? [...excludedKeywords.filter(existing => !matchesKeyword(keyword, existing)), keyword]
                : excludedKeywords.filter(existing => !matchesKeyword(keyword, existing));
            const updatedTrait = {
                ...(targetTrait || {
                    id: trait.id,
                    kind: trait.kind || 'object',
                    buttonIds: trait.buttonIds || []
                }),
                keywords: nextKeywords,
                excludedKeywords: nextExcludedKeywords
            };
            if (traitIndex === -1) return [...traits, updatedTrait];
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
                    const isDefaultTrait = defaultedTraitIds.has(trait.id);
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
                                background: isTraitActive ? 'var(--accent)' : isDefaultTrait ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.05)',
                                border: isDefaultTrait && !isTraitActive ? '1px dashed rgba(210,201,182,0.45)' : '1px solid rgba(255,255,255,0.2)',
                                color: isTraitActive ? '#000' : isDefaultTrait ? '#aaa397' : '#fff',
                                borderRadius: '4px',
                                transition: 'all 0.1s ease',
                                opacity: isTraitActive ? 1 : isDefaultTrait ? 0.88 : 0.7,
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
                                {isDefaultTrait ? (
                                    <span style={{ opacity: isTraitActive ? 0.55 : 0.8, marginLeft: '4px', fontSize: '0.55rem' }}>
                                        {isTraitActive ? 'DEFAULT' : 'DEFAULT · OFF'}
                                    </span>
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
