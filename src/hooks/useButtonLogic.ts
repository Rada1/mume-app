import { useMemo } from 'react';
import { CustomButton } from '../types';
import { MAGE_SPELLS, CLERIC_SPELLS, WARRIOR_SKILLS, RANGER_SKILLS, THIEF_SKILLS, CLASS_MAPPINGS } from '../utils/spellLists';

export const useButtonLogic = (
    rawButtons: CustomButton[],
    activeSet: string,
    abilities: Record<string, number>,
    characterClass: string,
    isEditMode: boolean
) => {
    return useMemo(() => {
        const classNames = ['ranger', 'warrior', 'mage', 'cleric', 'thief'];
        const activeSetLower = activeSet.toLowerCase();

        // 1. Static filtering & Modification
        const filtered = rawButtons.filter(b => {
            if (isEditMode) return true;

            if (b.hideIfUnknown && b.setId !== 'Xbox') {
                const cmdLower = b.command.toLowerCase();
                const labelLower = b.label.toLowerCase();
                let name = labelLower;
                let isSpellOrSkill = false;

                if (cmdLower.startsWith('cast ') || cmdLower.startsWith('commune ')) {
                    isSpellOrSkill = true;
                    const match = cmdLower.match(/'([^']+)'/);
                    if (match) name = match[1].toLowerCase();
                } else {
                    const firstWord = cmdLower.split(' ')[0];
                    const allAbilities = [...MAGE_SPELLS, ...CLERIC_SPELLS, ...WARRIOR_SKILLS, ...RANGER_SKILLS, ...THIEF_SKILLS].map(s => s.toLowerCase());
                    if (allAbilities.includes(firstWord) || allAbilities.includes(labelLower)) {
                        isSpellOrSkill = true;
                        name = allAbilities.includes(firstWord) ? firstWord : labelLower;
                    }
                }

                if (isSpellOrSkill) {
                    const prof = abilities[name] || abilities[labelLower] || abilities[cmdLower] || 0;
                    if (prof <= 0) return false;
                }
            }

            if (!b.requirement) return true;
            if (b.requirement.characterClass && b.requirement.characterClass.length > 0) {
                if (characterClass !== 'none' && !b.requirement.characterClass.includes(characterClass)) return false;
            }
            if (b.requirement.ability) {
                const prof = abilities[b.requirement.ability.toLowerCase()] || 0;
                if (prof < (b.requirement.minProficiency || 1)) return false;
            }

            return true;
        }).map(b => {
            let modified = { ...b };

            // Class-based dimming for Xbox cluster
            if (b.setId === 'Xbox' && b.hideIfUnknown && !isEditMode) {
                const buttonToClass: Record<string, string> = {
                    'xbox-y': 'ranger', 'xbox-x': 'cleric', 'xbox-b': 'mage', 'xbox-a': 'thief', 'xbox-z': 'warrior'
                };
                const classKey = buttonToClass[b.id];
                if (classKey) {
                    const skills = CLASS_MAPPINGS[classKey] || [];
                    if (!skills.some(s => (abilities[s.toLowerCase()] || 0) > 0)) {
                        modified.isDimmed = true;
                    }
                }
            }

            // Swipes are no longer filtered out to prevent UI label confusion.
            // Dimming handles the unknown state visually.
            return modified;
        });

        // 2. Dynamic generation for Smart Sets
        const isDynamicSet = activeSetLower === 'spellbook' || classNames.includes(activeSetLower);
        if (isDynamicSet) {
            const generated: CustomButton[] = [];
            let baseList: string[] = activeSetLower === 'spellbook' ? [...MAGE_SPELLS, ...CLERIC_SPELLS] : (CLASS_MAPPINGS[activeSetLower] || []);

            baseList.map(name => ({ name, prof: abilities[name.toLowerCase()] || 0 })).forEach(({ name, prof }, idx) => {
                const cols = 2;
                const row = Math.floor(idx / cols);
                const col = idx % cols;
                generated.push({
                    id: `dynamic-${activeSetLower}-${name}`,
                    label: name.charAt(0).toUpperCase() + name.slice(1),
                    command: name.toLowerCase() === 'teleport' ? "cast 'teleport'" : name.toLowerCase(),
                    setId: activeSet,
                    actionType: 'command',
                    display: 'floating',
                    isVisible: true,
                    style: {
                        x: 10 + col * 40, y: 10 + row * 10, w: 120, h: 40,
                        backgroundColor: prof > 0 ? 'rgba(74, 144, 226, 0.3)' : 'rgba(100, 116, 139, 0.1)',
                        color: prof > 0 ? '#fff' : 'rgba(255, 255, 255, 0.4)',
                        borderColor: prof > 0 ? 'rgba(74, 144, 226, 0.5)' : 'rgba(255, 255, 255, 0.1)',
                        shape: 'pill', transparent: false
                    },
                    trigger: { enabled: false, pattern: '', isRegex: false, autoHide: false, duration: 0, type: 'show' }
                });
            });
            return [...filtered, ...generated];
        }

        return filtered;
    }, [rawButtons, activeSet, abilities, characterClass, isEditMode]);
};
