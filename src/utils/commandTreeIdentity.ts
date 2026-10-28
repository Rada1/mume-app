/** @file commandTreeIdentity.ts - Stable action identity across saved and generated button variants. */
import type { CustomButton } from '../types';
import { PRACTICE_CLASS_SKILLS, TARGETED_SKILLS } from './practiceClassCatalog';
import { isCommandTreeSpell } from './commandTreeGroups';
import { isCommandTreeSearchAction } from './commandTreeSearch';
// --- Identity Section ---
const normalize = (value: string) => value.toLowerCase().replace(/\barmor\b/g,'armour').trim().replace(/\s+/g,' ');
const spellNames = [...PRACTICE_CLASS_SKILLS.mage, ...PRACTICE_CLASS_SKILLS.cleric].map(normalize).sort((a,b)=>b.length-a.length);
export const commandTreeSpellName = (button: CustomButton): string | null => {
 if (!isCommandTreeSpell(button)) return null;
 const command = normalize(button.command).replace(/^cast\s+/, '').replace(/["']/g,'');
 return spellNames.find(name => command === name || command.startsWith(`${name} `)) || null;
};
const targetedSkills = new Set([
 ...[...PRACTICE_CLASS_SKILLS.ranger, ...PRACTICE_CLASS_SKILLS.warrior, ...PRACTICE_CLASS_SKILLS.thief]
  .map(normalize).filter(name => TARGETED_SKILLS.has(name)),
 'assist', 'shoot', 'hit', 'kill'
]);
const communicationChannels = new Set(['say', 'narrate', 'shout', 'yell', 'sing', 'emote', 'act', 'pray']);
const targetedSkillSyntax = (button: CustomButton): string | null => {
 if (isCommandTreeSpell(button)) return null;
 const syntax = normalize(button.command);
 if (![...targetedSkills].some(name => syntax === name || syntax.startsWith(`${name} `))) return null;
 // Keep modifiers (bash dis) and exit selectors distinct, while merging bare and targeted variants.
 return syntax.replace(/\s+%n$/, '');
};
const classCategory = /^(?:ranger|warrior|thief|mage|cleric)(?:\s*(?:skills?|spells?)\s*(?:list)?)?$/;
// Directed messaging and following always open the shared target picker in V2.
export const normalizeCommandTreeButton = (button: CustomButton): CustomButton => {
 if (isCommandTreeSearchAction(button)) return {...button,command:`${button.command.trim().split(/\s+/)[0].toLowerCase()} %n`};
 if (/^pour\b/i.test(button.command.trim())) return {...button, label: 'Pour'};
 const communicationVerb = button.command.trim().toLowerCase().split(/\s+/)[0];
 if (communicationChannels.has(communicationVerb)) return {...button, setId: 'trait-communication'};
 if (/^(?:tell\s+group|gtell|gsay)(?:\s+%n)?$/i.test(button.command.trim())) {
  return {...button, command:'tell %n', label:'Tell', setId:'trait-communication'};
 }
 if (/social/i.test(button.setId) && /^[a-z]+(?:\s+(?:%n|\$1))?$/i.test(button.command.trim())) {
  return {...button, command:`${button.command.trim().split(/\s+/)[0]} %n`};
 }
 const get = button.command.trim().match(/^get\s+%n(?:\s+%p)?$/i);
 if (get) return {...button, label:'Get', command:'get %n'};
 const transfer = button.command.trim().match(/^(put|give)(?:\s+(?:%n|\$1))?$/i);
 if (transfer) {
  const verb = transfer[1].toLowerCase();
  return {...button, label: verb === 'give' ? 'Give' : 'Put', command: `${verb} %n`};
 }
 const match = button.command.trim().match(/^(tell|whisper|ask|follow)(?:\s+(?:%n|\$1))?$/i);
 if (!match) return button;
 const verb = match[1].toLowerCase();
 return {...button,command:`${verb} %n`,label:verb[0].toUpperCase()+verb.slice(1),
  setId:verb === 'follow' ? button.setId : 'trait-communication'};
};
export const commandTreeActionKey = (button: CustomButton): string => {
 button = normalizeCommandTreeButton(button);
 const spell = commandTreeSpellName(button);
 const skill = targetedSkillSyntax(button);
 return spell ? `spell:${spell}` : skill ? `skill:${skill}` : `command:${normalize(button.command)}`;
};
// --- Representative Selection Section ---
const preference = (button: CustomButton) =>
 (button.id.startsWith('inline-ability-') ? 1000 : 0) + (/^cast\b/i.test(button.command) ? 100 : 0) + (/%n/.test(button.command) ? 10 : 0);
export const deduplicateCommandTreeButtons = (buttons: CustomButton[]): CustomButton[] => {
 const actions = new Map<string,CustomButton>();
 for (const source of buttons) {
  const button = normalizeCommandTreeButton(source);
  if (classCategory.test(normalize(button.label)) || classCategory.test(normalize(button.command))) continue;
  if (button.actionType === 'nav' || button.actionType === 'menu') continue;
  // Old spellbook class buttons such as Cleric are navigation, not spells.
  if (isCommandTreeSpell(button) && !commandTreeSpellName(button)) continue;
  const key = commandTreeActionKey(button);
  const previous = actions.get(key);
  if (!previous || preference(button) > preference(previous)) actions.set(key,button);
 }
 return [...actions.values()].filter(button => !targetedSkillSyntax(button) || /%n/.test(button.command));
};
