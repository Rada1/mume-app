/**
 * @file useButtonLogic.ts
 * @description Filters and generates available buttons from character state.
 */

import { useMemo } from 'react';
import { CharacterInfo, CustomButton, PracticeData } from '../types';
import { MAGE_SPELLS, CLERIC_SPELLS, WARRIOR_SKILLS, RANGER_SKILLS, THIEF_SKILLS, CLASS_MAPPINGS } from '../utils/spellLists';
import { applyPracticeSwipeDefaults } from '../utils/swipeAutoPopulate';
import { isButtonEligibleForCharacter } from '../utils/characterEligibility';
const SPELL_CLASS_KEYS = new Set(['mage', 'cleric']);

const normalizeAbilityKey = (value: string): string => value.trim().toLowerCase().replace(/\s+/g, ' ');

const getAbilityAliases = (value: string): string[] => {
    const normalized = normalizeAbilityKey(value);
    const aliases = new Set([normalized]);
    if (normalized.includes('armour')) aliases.add(normalized.replace(/\barmour\b/g, 'armor'));
    if (normalized.includes('armor')) aliases.add(normalized.replace(/\barmor\b/g, 'armour'));
    if (normalized === 'cure critical') aliases.add('cure critic');
    if (normalized === 'cure critic') aliases.add('cure critical');
    return Array.from(aliases);
};

const getCommandAbilityName = (button: CustomButton): string => {
    const command = normalizeAbilityKey(button.command || '');
    const spellMatch = command.match(/^(?:cast|commune)\s+'([^']+)'/);
    if (spellMatch) return spellMatch[1];
    const commandName = command.split(' ')[0] || '';
    return commandName || button.label || '';
};

const getPracticeProficiency = (
    abilityName: string,
    practiceData: PracticeData | null,
    classKey?: string
): number => {
    if (!practiceData) return 0;
    const aliases = new Set(getAbilityAliases(abilityName));
    const match = practiceData.skills.find(skill => {
        const skillClass = skill.skillClass?.toLowerCase();
        if (classKey && skillClass !== classKey) return false;
        return getAbilityAliases(skill.name).some(alias => aliases.has(alias));
    });
    return match?.proficiency || 0;
};

const getAbilityProficiency = (
    abilityName: string,
    abilities: Record<string, number>,
    practiceData: PracticeData | null,
    classKey?: string
): number => {
    const aliases = getAbilityAliases(abilityName);
    const abilityProf = Math.max(...aliases.map(alias => abilities[alias] || 0), 0);
    return Math.max(abilityProf, getPracticeProficiency(abilityName, practiceData, classKey));
};

const toAbilityCommand = (classKey: string, abilityName: string): string => {
    if (SPELL_CLASS_KEYS.has(classKey)) return `cast '${abilityName.toLowerCase()}'`;
    if (normalizeAbilityKey(abilityName) === 'missile') return 'shoot';
    return normalizeAbilityKey(abilityName);
};

const getClassKeyForSet = (setId?: string): string | undefined => {
    const normalized = (setId || '').toLowerCase();
    if (normalized.includes('mage')) return 'mage';
    if (normalized.includes('cleric')) return 'cleric';
    if (normalized.includes('warrior')) return 'warrior';
    if (normalized.includes('ranger')) return 'ranger';
    if (normalized.includes('thief')) return 'thief';
    return undefined;
};

const isAbilityInClass = (abilityName: string, classKey?: string): boolean => {
    if (!classKey) return true;
    const aliases = new Set(getAbilityAliases(abilityName));
    return (CLASS_MAPPINGS[classKey] || []).some(classAbility =>
        getAbilityAliases(classAbility).some(alias => aliases.has(alias))
    );
};

export const useButtonLogic = (deps: {
    rawButtons: CustomButton[],
    activeSet: string,
    abilities: Record<string, number>,
    characterClass: string,
    characterName: string | null,
    characterInfo?: CharacterInfo,
    isEditMode: boolean,
    isSmartPopulateEnabled?: boolean,
    target: string | null,
    inlineCategories: import('../types').InlineCategoryConfig[],
    practiceData?: PracticeData | null
}) => {
    const { 
        rawButtons, activeSet, abilities, characterClass, characterName, characterInfo,
        isEditMode, isSmartPopulateEnabled = true, target = null, inlineCategories = [],
        practiceData = null
    } = deps;

    return useMemo(() => {
        const classNames = ['ranger', 'warrior', 'mage', 'cleric', 'thief'];
        const safeAbilities = abilities || {};
        const meetsRequirement = (button: CustomButton): boolean => {
            if (!button.requirement) return true;
            const { characterClass: requiredClasses, ability, minProficiency } = button.requirement;
            if (!isButtonEligibleForCharacter(button.requirement, characterInfo, characterClass)) return false;
            if (!ability) return true;
            const requirementClass = requiredClasses?.length === 1 ? requiredClasses[0].toLowerCase() : undefined;
            return getAbilityProficiency(ability, safeAbilities, practiceData, requirementClass) >= (minProficiency || 1);
        };
        const filtered = rawButtons.filter(b => {
            if (isEditMode) return true;
            if (!meetsRequirement(b)) return false;

            if (b.id.startsWith('xbox-') || b.id.startsWith('tactical-')) {
                const buttonToClass: Record<string, string> = {
                    'xbox-x': 'cleric', 'tactical-cleric': 'cleric',
                    'xbox-b': 'mage', 'tactical-mage': 'mage', 'tactical-action': 'mage',
                    'xbox-a': 'thief', 'tactical-thief': 'thief'
                };
                const classKey = buttonToClass[b.id];
                if (classKey && b.hideIfUnknown) {
                    if (!characterName) return false;

                    const practicedClassSkill = practiceData?.skills.some(skill =>
                        skill.skillClass?.toLowerCase() === classKey &&
                        skill.proficiency > 0 &&
                        isAbilityInClass(skill.name, classKey)
                    );

                    if (practiceData) return practicedClassSkill === true;

                    const skills = CLASS_MAPPINGS[classKey] || [];
                    return skills.some(s => getAbilityProficiency(s, safeAbilities, practiceData, classKey) > 0);
                }
                return true;
            }

            const staticSetClassKey = getClassKeyForSet(b.setId);
            if (staticSetClassKey) {
                const commandAbility = getCommandAbilityName(b);
                if (!isAbilityInClass(commandAbility, staticSetClassKey)) return false;
            }

            if (isSmartPopulateEnabled && b.hideIfUnknown && b.setId !== 'Xbox') {
                if (!characterName) return false;

                const cmdLower = (b.command || '').toLowerCase();
                const labelLower = (b.label || '').toLowerCase();
                const setClassKey = getClassKeyForSet(b.setId);
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
                    if (!isAbilityInClass(name, setClassKey)) return false;
                    const prof = Math.max(
                        getAbilityProficiency(name, safeAbilities, practiceData, setClassKey),
                        getAbilityProficiency(labelLower, safeAbilities, practiceData, setClassKey),
                        getAbilityProficiency(cmdLower, safeAbilities, practiceData, setClassKey)
                    );
                    if (prof <= 0) return false;
                }
            }

            return true;
        }).map(b => {
            let modified = { ...b };
            if (!isSmartPopulateEnabled && b.hideIfUnknown && !isEditMode) {
                const cmdLower = (b.command || '').toLowerCase();
                const labelLower = (b.label || '').toLowerCase();
                const setClassKey = getClassKeyForSet(b.setId);
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
                    if (!isAbilityInClass(name, setClassKey)) modified.isDimmed = true;
                    const prof = Math.max(
                        getAbilityProficiency(name, safeAbilities, practiceData, setClassKey),
                        getAbilityProficiency(labelLower, safeAbilities, practiceData, setClassKey),
                        getAbilityProficiency(cmdLower, safeAbilities, practiceData, setClassKey)
                    );
                    if (prof <= 0) modified.isDimmed = true;
                }
            }

            return isSmartPopulateEnabled
                ? applyPracticeSwipeDefaults(modified, safeAbilities, practiceData)
                : modified;
        });
        const dynamicSetsToGenerate = ['spellbook', ...classNames, 'rangerskilllist', 'warriorskilllist', 'magespelllist', 'clericspelllist', 'thiefskilllist'];
        const allGenerated: CustomButton[] = [];

        dynamicSetsToGenerate.forEach(setName => {
            const setNameLower = setName.toLowerCase();
            const mapKey = setNameLower.replace('skilllist', '').replace('spelllist', '');
            const learnedClassAbilities = practiceData?.skills
                .filter(skill =>
                    skill.proficiency > 0 &&
                    (!CLASS_MAPPINGS[mapKey] || (
                        skill.skillClass?.toLowerCase() === mapKey &&
                        isAbilityInClass(skill.name, mapKey)
                    ))
                )
                .map(skill => skill.name) || [];
            let baseList: string[] = setNameLower === 'spellbook'
                ? [...learnedClassAbilities.filter(name => {
                    const skillClass = practiceData?.skills.find(skill => skill.name === name)?.skillClass?.toLowerCase();
                    return skillClass === 'mage' || skillClass === 'cleric';
                }), ...MAGE_SPELLS, ...CLERIC_SPELLS]
                : [...learnedClassAbilities, ...(CLASS_MAPPINGS[mapKey] || [])];

            if (mapKey === 'thief' && getAbilityProficiency('Missile', safeAbilities, practiceData, mapKey) > 0) {
                const missileIndex = baseList.findIndex(name => normalizeAbilityKey(name) === 'missile');
                const insertIndex = missileIndex >= 0 ? missileIndex + 1 : baseList.length;
                baseList = [
                    ...baseList.slice(0, insertIndex),
                    'Recover',
                    ...baseList.slice(insertIndex)
                ];
            }

            const existingCommands = new Set(filtered.filter(b => (b.setId || '').toLowerCase() === setNameLower).map(b => (b.command || '').toLowerCase()));
            const existingAbilityKeys = new Set(filtered
                .filter(b => (b.setId || '').toLowerCase() === setNameLower)
                .flatMap(b => getAbilityAliases(getCommandAbilityName(b))));
            const seenBaseAbilities = new Set<string>();

            baseList.map(name => ({
                name,
                prof: mapKey === 'thief' && normalizeAbilityKey(name) === 'recover'
                    ? getAbilityProficiency('Missile', safeAbilities, practiceData, mapKey)
                    : getAbilityProficiency(name, safeAbilities, practiceData, mapKey)
            })).forEach(({ name, prof }, idx) => {
                const abilityKey = normalizeAbilityKey(name);
                if (seenBaseAbilities.has(abilityKey)) return;
                seenBaseAbilities.add(abilityKey);
                if (isSmartPopulateEnabled && prof <= 0) return;

                const cmd = toAbilityCommand(mapKey, name);
                if (existingCommands.has(cmd) || getAbilityAliases(name).some(alias => existingAbilityKeys.has(alias))) return;

                const cols = 2;
                const row = Math.floor(idx / cols);
                const col = idx % cols;
                const x = 10 + col * 40;
                const y = 10 + row * 10;
                const w = 120;
                const h = 40;
                allGenerated.push({
                    id: `dynamic-${setNameLower}-${name}`,
                    label: name.charAt(0).toUpperCase() + name.slice(1),
                    command: cmd,
                    setId: setName,
                    actionType: 'command',
                    display: 'floating',
                    isVisible: true,
                    isDimmed: prof <= 0,
                    style: {
                        x, y, w, h,
                        backgroundColor: prof > 0 ? 'rgba(74, 144, 226, 0.3)' : 'rgba(100, 116, 139, 0.1)',
                        color: prof > 0 ? '#fff' : 'rgba(255, 255, 255, 0.4)',
                        borderColor: prof > 0 ? 'rgba(74, 144, 226, 0.5)' : 'rgba(255, 255, 255, 0.1)',
                        shape: 'pill', transparent: false
                    },
                    position: { x, y, w, h },
                    trigger: { enabled: false, pattern: '', isRegex: false, autoHide: false, duration: 0, type: 'show' }
                });
            });
        });
        return [...filtered, ...allGenerated];
    }, [rawButtons, activeSet, abilities, characterClass, characterName, characterInfo, isEditMode, isSmartPopulateEnabled, target, practiceData]);
};
