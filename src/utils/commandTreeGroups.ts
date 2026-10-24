/** @file commandTreeGroups.ts — Explicit placement rules for the command-first tree. */
import { isCommandTreeAccess, isCommandTreeContainer } from './commandTreeAccess';
import type { CustomButton } from '../types';
// --- Group Assignment Section ---
const verbs = (value: string) => new Set(value.split(' '));
const combat = verbs('attack kill hit assist rescue flee disengage bash kick charge backstab shoot missile bandage cast');
const movement = verbs('north south east west up down northeast northwest southeast southwest enter leave sneak hide ride lead abandon dismount track open close lock unlock pick knock call');
const rangerSkills = verbs('climb swim');
const vision = verbs('look examine consider con scout watch search scan reveal');
const items = verbs('buy sell value mend list get take put give drop wear wield hold remove eat drink taste sip quaff forage recite pour fill empty light snuff cover uncover extinguish sacrifice junk loot compare identify read show saddle unsaddle offer rent camp');
const messages = verbs('say tell whisper ask reply emote narrate yell shout sing pray chat group follow');
const game = verbs('help hint hints time');
const character = verbs('info stat score skills spells train exits map who whois where weather history quest quests achievement achievements');
export const commandTreeAbilityClass = (button: CustomButton): string | null => {
 const match = button.setId.match(/^(ranger|warrior|thief|mage|cleric)(?:skill|spell)list$/i);
 if (match) return match[1].toLowerCase();
 const subgroup = (button.inlineSubgroup || '').toLowerCase();
 return ['ranger','warrior','thief','mage','cleric'].includes(subgroup) ? subgroup : null;
};
export const isCommandTreeSpell = (button: CustomButton): boolean =>
 /^cast\b/i.test(button.command.trim()) || /^(?:mage|cleric)spelllist$|^spellbook$/i.test(button.setId);

export const commandTreeMountSection = (button: CustomButton): 'Mounts' | 'Mount equipment' | null => {
 if (isCommandTreeSpell(button)) return null;
 const verb = button.command.trim().toLowerCase().split(/\s+/)[0];
 if (['ride', 'dismount', 'lead', 'abandon'].includes(verb)) return 'Mounts';
 return ['saddle', 'unsaddle'].includes(verb) ? 'Mount equipment' : null;
};

export const commandTreeGroup = (button: CustomButton): number | null => {
 if (isCommandTreeAccess(button)) return isCommandTreeContainer(button) ? 3 : 1;
 const mountSection = commandTreeMountSection(button);
 if (mountSection) return mountSection === 'Mounts' ? 1 : 3;
 if (isCommandTreeSpell(button) || /^practice(?:\s|$)/i.test(button.command.trim())) return 0;
 const verb = button.command.trim().toLowerCase().split(/\s+/)[0];
 if (['inventory','equipment','inv','eq'].includes(verb)) return null;
 if (vision.has(verb)) return 2;
 if (rangerSkills.has(verb)) return 0;
 if (commandTreeAbilityClass(button)) return 0;
 if (messages.has(verb) || /social|communicat/.test(button.setId)) return 4;
 if (movement.has(verb)) return 1;
 if (items.has(verb)) return 3;
 if (game.has(verb)) return 5;
 if (character.has(verb)) return 5;
 if (combat.has(verb)) return 0;
 // Trait families admit learned powers while unknown saved buttons stay out of the tree.
 if (/^trait-(offense|retreat|buffs|healing|support|control)$/.test(button.setId)) return 0;
 if (/^trait-(door-actions|mount|utility)$/.test(button.setId)) return 1;
 if (/object|inventory|equipment|saddle|shop/.test(button.setId)) return 3;
 return null;
};
