/**
 * @file ActionCheatSheet.tsx
 * @description Cheat sheet containing grid-categorized quick action chips for MUME commands, skills, and spells with hover tooltips and passive skill indicators.
 */

import React, { useState, FC, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useGame } from '../../context/GameContext';
import { useInputStore } from '../../stores/useInputStore';
import { PRACTICE_CLASS_SKILLS, PracticeClassKey } from '../../utils/practiceClassCatalog';
import { ChevronDown, ChevronUp, Zap, HelpCircle, Layers } from 'lucide-react';
import './ActionCheatSheet.css';

interface ActionCheatSheetProps {
    executeCommand: (cmd: string) => void;
}

const STATIC_CATEGORIES = {
    movement: [
        { label: 'North', cmd: 'n' },
        { label: 'South', cmd: 's' },
        { label: 'East', cmd: 'e' },
        { label: 'West', cmd: 'w' },
        { label: 'Up', cmd: 'u' },
        { label: 'Down', cmd: 'd' },
        { label: 'Look', cmd: 'look' },
        { label: 'Exits', cmd: 'exits' }
    ],
    combat: [
        { label: 'Kill', cmd: 'kill ' },
        { label: 'Bash', cmd: 'bash ' },
        { label: 'Kick', cmd: 'kick ' },
        { label: 'Rescue', cmd: 'rescue ' },
        { label: 'Flee', cmd: 'flee' }
    ],
    communication: [
        { label: 'Say', cmd: 'say ' },
        { label: 'Narrate', cmd: 'narrate ' },
        { label: 'Gsay', cmd: 'gsay ' },
        { label: 'Yell', cmd: 'yell ' }
    ],
    general: [
        { label: 'Score', cmd: 'score' },
        { label: 'Inventory', cmd: 'inventory' },
        { label: 'Equipment', cmd: 'equipment' },
        { label: 'Time', cmd: 'time' },
        { label: 'Weather', cmd: 'weather' }
    ]
};

// MUME Passive Skills Lookup
const PASSIVE_SKILLS = new Set([
    // Warrior
    'cleaving weapons',
    'concussion weapons',
    'slashing weapons',
    'stabbing weapons',
    'two-handed weapons',
    'unarmed combat',
    'parry',
    'endurance',
    // Thief
    'dodge',
    'missile',
    'piercing weapons',
    // Ranger
    'awareness',
    'swim',
    'wilderness',
    'leadership'
]);

const isPassiveSkill = (name: string): boolean => {
    return PASSIVE_SKILLS.has(name.toLowerCase());
};

export const ActionCheatSheet: FC<ActionCheatSheetProps> = ({ executeCommand }) => {
    // --- Logic Section ---
    const { abilities = {}, characterClass = '', triggerHaptic, help } = useGame() as {
        abilities?: Record<string, number>;
        characterClass?: string;
        triggerHaptic?: (ms: number) => void;
        help?: any;
    };

    const setInput = useInputStore(s => s.setInput);
    const [executeDirectly, setExecuteDirectly] = useState(() => {
        return localStorage.getItem('mud-cheatsheet-direct') !== 'false';
    });

    const activeClassLower = (characterClass || '').toLowerCase();

    const [showAllClasses, setShowAllClasses] = useState(() => {
        return !activeClassLower || localStorage.getItem('mud-cheatsheet-showall') === 'true';
    });

    const [collapsed, setCollapsed] = useState<Record<string, boolean>>(() => {
        try {
            const saved = localStorage.getItem('mud-cheatsheet-collapsed');
            if (saved) return JSON.parse(saved);
        } catch {}
        return {
            movement: false,
            combat: false,
            communication: false,
            general: false,
            ranger: false,
            warrior: false,
            thief: false,
            mage: false,
            cleric: false
        };
    });

    // Tooltip Hover States & Timers
    const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    
    const [hoveredSkill, setHoveredSkill] = useState<{
        name: string;
        rect: DOMRect;
        helpText: string | null;
        loading: boolean;
        proficiency: number | null;
    } | null>(null);

    useEffect(() => {
        return () => {
            if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
            if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
        };
    }, []);

    const toggleDirectExecute = () => {
        const nextVal = !executeDirectly;
        setExecuteDirectly(nextVal);
        localStorage.setItem('mud-cheatsheet-direct', String(nextVal));
        triggerHaptic?.(10);
    };

    const toggleShowAllClasses = () => {
        const nextVal = !showAllClasses;
        setShowAllClasses(nextVal);
        localStorage.setItem('mud-cheatsheet-showall', String(nextVal));
        triggerHaptic?.(10);
    };

    const toggleCategory = (catKey: string) => {
        setCollapsed(prev => {
            const next = { ...prev, [catKey]: !prev[catKey] };
            localStorage.setItem('mud-cheatsheet-collapsed', JSON.stringify(next));
            return next;
        });
        triggerHaptic?.(10);
    };

    const handleChipClick = (cmd: string) => {
        triggerHaptic?.(15);
        if (executeDirectly) {
            executeCommand(cmd.trim());
        } else {
            setInput(cmd);
            setTimeout(() => {
                const inputEl = document.getElementById('mud-input') as HTMLTextAreaElement | null;
                if (inputEl) {
                    inputEl.focus();
                    inputEl.style.height = 'auto';
                    inputEl.style.height = `${inputEl.scrollHeight}px`;
                }
            }, 50);
        }
    };

    const handleMouseEnter = (e: React.MouseEvent<HTMLButtonElement>, rawSkillName: string) => {
        if (hoverTimeoutRef.current) {
            clearTimeout(hoverTimeoutRef.current);
            hoverTimeoutRef.current = null;
        }
        if (hideTimeoutRef.current) {
            clearTimeout(hideTimeoutRef.current);
            hideTimeoutRef.current = null;
        }

        const buttonRect = e.currentTarget.getBoundingClientRect();
        const skillName = rawSkillName.trim();

        // If this skill is already active in tooltip, skip querying again
        if (hoveredSkill && hoveredSkill.name.toLowerCase() === skillName.toLowerCase()) {
            return;
        }

        hoverTimeoutRef.current = setTimeout(() => {
            const normalized = skillName.toLowerCase();
            const proficiency = abilities[normalized] !== undefined ? abilities[normalized] : null;

            setHoveredSkill({
                name: skillName,
                rect: buttonRect,
                helpText: null,
                loading: true,
                proficiency
            });

            if (help) {
                help.hoverHelpCallbackRef.current = (helpData: string) => {
                    setHoveredSkill(prev => {
                        if (prev && prev.name.toLowerCase() === skillName.toLowerCase()) {
                            return {
                                ...prev,
                                helpText: helpData,
                                loading: false
                            };
                        }
                        return prev;
                    });
                };

                help.setIsUiRequested(true);
                executeCommand(`help ${normalized}`);
            }
        }, 400); // 400ms hover delay
    };

    const handleMouseLeave = () => {
        if (hoverTimeoutRef.current) {
            clearTimeout(hoverTimeoutRef.current);
            hoverTimeoutRef.current = null;
        }
        
        // Start hide grace period timer
        if (hideTimeoutRef.current) {
            clearTimeout(hideTimeoutRef.current);
        }
        hideTimeoutRef.current = setTimeout(() => {
            setHoveredSkill(null);
            if (help && help.hoverHelpCallbackRef) {
                help.hoverHelpCallbackRef.current = null;
            }
        }, 500); // 500ms grace period to enter the popover tooltip
    };

    const hasPracticedAny = Object.keys(abilities).length > 0;

    const renderStaticCategory = (title: string, catKey: keyof typeof STATIC_CATEGORIES) => {
        const items = STATIC_CATEGORIES[catKey];
        const isCollapsed = collapsed[catKey];

        return (
            <div className={`cheatsheet-category-section ${isCollapsed ? 'collapsed' : ''}`} key={catKey}>
                <div className="cheatsheet-category-header" onClick={() => toggleCategory(catKey)}>
                    <span className="cheatsheet-category-title">{title}</span>
                    {isCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                </div>
                {!isCollapsed && (
                    <div className="cheatsheet-chips-grid">
                        {items.map(item => (
                            <button
                                key={item.label}
                                className="cheatsheet-chip static-chip"
                                onClick={() => handleChipClick(item.cmd)}
                                onMouseEnter={(e) => handleMouseEnter(e, item.label)}
                                onMouseLeave={handleMouseLeave}
                            >
                                {item.label}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    const renderClassCategory = (title: string, classKey: PracticeClassKey) => {
        if (activeClassLower && classKey !== activeClassLower && !showAllClasses) {
            return null;
        }

        const skills = PRACTICE_CLASS_SKILLS[classKey];
        const isCollapsed = collapsed[classKey];

        const resolvedSkills = skills.map(skillName => {
            const normalized = skillName.toLowerCase();
            const proficiency = abilities[normalized];
            return {
                name: skillName,
                proficiency: proficiency !== undefined ? proficiency : null
            };
        });

        if (hasPracticedAny) {
            resolvedSkills.sort((a, b) => {
                const aKnown = a.proficiency !== null ? 1 : 0;
                const bKnown = b.proficiency !== null ? 1 : 0;
                return bKnown - aKnown;
            });
        }

        return (
            <div className={`cheatsheet-category-section ${classKey}-theme ${isCollapsed ? 'collapsed' : ''}`} key={classKey}>
                <div className="cheatsheet-category-header" onClick={() => toggleCategory(classKey)}>
                    <span className="cheatsheet-category-title">{title}</span>
                    {isCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                </div>
                {!isCollapsed && (
                    <div className="cheatsheet-chips-grid">
                        {resolvedSkills.map(skill => {
                            const isKnown = skill.proficiency !== null;
                            const isSpell = classKey === 'mage' || classKey === 'cleric';
                            const cmd = isSpell ? `cast '${skill.name.toLowerCase()}'` : skill.name.toLowerCase();
                            const isPassive = isPassiveSkill(skill.name);
                            
                            const chipClassName = `cheatsheet-chip ${isPassive ? 'passive-chip' : ''} ${isKnown ? 'known-chip' : 'potential-chip'} ${classKey}-chip`;

                            return (
                                <button
                                    key={skill.name}
                                    className={chipClassName}
                                    onClick={isPassive ? undefined : () => handleChipClick(cmd)}
                                    onMouseEnter={(e) => handleMouseEnter(e, skill.name)}
                                    onMouseLeave={handleMouseLeave}
                                >
                                    <span className="chip-label">{skill.name}</span>
                                    {isKnown && <span className="chip-percentage">{skill.proficiency}%</span>}
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="action-cheatsheet-container">
            <div className="cheatsheet-top-bar">
                <div className="cheatsheet-config-row">
                    <label className="cheatsheet-toggle-label" onClick={toggleDirectExecute}>
                        <input
                            type="checkbox"
                            checked={executeDirectly}
                            onChange={() => {}}
                            className="cheatsheet-checkbox"
                        />
                        <Zap size={13} className={executeDirectly ? 'active-icon' : ''} />
                        <span>Click executes directly</span>
                    </label>

                    {activeClassLower && (
                        <label className="cheatsheet-toggle-label" onClick={toggleShowAllClasses}>
                            <input
                                type="checkbox"
                                checked={showAllClasses}
                                onChange={() => {}}
                                className="cheatsheet-checkbox"
                            />
                            <Layers size={13} />
                            <span>Show all classes</span>
                        </label>
                    )}
                </div>
                {!hasPracticedAny && (
                    <div className="cheatsheet-notice-row">
                        <HelpCircle size={12} />
                        <span>Type <strong>practice</strong> to sync your skills.</span>
                    </div>
                )}
            </div>

            <div className="cheatsheet-body-scroll">
                {renderStaticCategory('Movement', 'movement')}
                {renderStaticCategory('Combat & Tactics', 'combat')}
                {renderClassCategory('Ranger Skills', 'ranger')}
                {renderClassCategory('Warrior Skills', 'warrior')}
                {renderClassCategory('Thief Skills', 'thief')}
                {renderClassCategory('Mage Spells', 'mage')}
                {renderClassCategory('Cleric Spells', 'cleric')}
                {renderStaticCategory('Communication', 'communication')}
                {renderStaticCategory('General Utility', 'general')}
            </div>

            {/* Tooltip Portal */}
            {hoveredSkill && createPortal(
                <div 
                    className="cheatsheet-tooltip-popover"
                    style={{
                        position: 'fixed',
                        left: `${Math.max(160, Math.min(window.innerWidth - 160, hoveredSkill.rect.left + hoveredSkill.rect.width / 2))}px`,
                        bottom: `${window.innerHeight - hoveredSkill.rect.top + 8}px`,
                        transform: 'translateX(-50%)',
                    }}
                    onMouseEnter={() => {
                        if (hideTimeoutRef.current) {
                            clearTimeout(hideTimeoutRef.current);
                            hideTimeoutRef.current = null;
                        }
                    }}
                    onMouseLeave={() => {
                        if (hideTimeoutRef.current) {
                            clearTimeout(hideTimeoutRef.current);
                        }
                        hideTimeoutRef.current = setTimeout(() => {
                            setHoveredSkill(null);
                            if (help && help.hoverHelpCallbackRef) {
                                help.hoverHelpCallbackRef.current = null;
                            }
                        }, 400);
                    }}
                >
                    <div className="tooltip-header">
                        <span className="tooltip-title">{hoveredSkill.name}</span>
                        {isPassiveSkill(hoveredSkill.name) ? (
                            <span className="tooltip-passive-tag">Passive</span>
                        ) : hoveredSkill.proficiency !== null && (
                            <span className="tooltip-percentage">Practiced: {hoveredSkill.proficiency}%</span>
                        )}
                    </div>
                    {hoveredSkill.loading ? (
                        <div className="tooltip-loading-wrapper">
                            <span className="tooltip-spinner"></span>
                            <span>Loading MUME help details...</span>
                        </div>
                    ) : hoveredSkill.helpText ? (
                        <pre className="tooltip-content">{hoveredSkill.helpText}</pre>
                    ) : (
                        <div className="tooltip-no-help">No help file found for this command.</div>
                    )}
                </div>,
                document.body
            )}
        </div>
    );
};
